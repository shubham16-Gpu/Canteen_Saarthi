import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Role } from '@prisma/client';
import { createHash, createHmac, randomUUID } from 'crypto';
import { authenticator } from 'otplib';
import { OAuth2Client } from 'google-auth-library';
import { sendOtpEmail } from './providers/email.provider';
import { sendOtpSms } from './providers/sms.provider';
import { checkOtpRateLimit } from './providers/rate-limit';

// ─────────────── in-memory OTP store (single-process only) ───────────────
const otpStore = new Map<string, string>();

// ─────────────── security audit log (in-memory, last 1000) ───────────────
interface SecurityLog {
  event: string;
  result: 'success' | 'failure';
  detail: string;
  ts: Date;
}
const securityLogs: SecurityLog[] = [];

function addSecurityLog(event: string, result: 'success' | 'failure', detail: string) {
  securityLogs.push({ event, result, detail, ts: new Date() });
  if (securityLogs.length > 1000) securityLogs.shift();
}

// ─────────────── TOTP secret (env or fallback) ───────────────
const AUTHENTICATOR_SECRET =
  process.env.TOTP_SECRET || 'JBSWY3DPEHPK3PXP';

// ─────────────── JWT helpers (pure Node crypto, no lib) ───────────────

function signToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string,
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);

  let expSeconds = 3600;
  const match = /^(\d+)(s|m|h|d)$/.exec(expiresIn);
  if (match && match[1] && match[2]) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    expSeconds = value * (multipliers[unit] ?? 60);
  }

  const fullPayload = { ...payload, iat: now, exp: now + expSeconds };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${encodedPayload}`)
    .digest('base64url');

  return `${header}.${encodedPayload}.${signature}`;
}

function verifyToken(
  token: string,
  secret: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    if (!encodedHeader || !encodedPayload || !signature) return null;

    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly prisma: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient();
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private buildLoginPayload(user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    avatar?: string | null;
  }) {
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      process.env.JWT_SECRET ||
      'canteen-super-secret-jwt-key-2024-production-grade';
    const expiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') ||
      process.env.JWT_EXPIRES_IN ||
      '7d';

    const token = signToken(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      secret,
      expiresIn,
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  // ─── credential check (admin / superadmin) ────────────────────────────────

  async credentialCheck(dto: { email: string; password: string; role: 'admin' | 'superadmin' }) {
    const targetRole: Role = dto.role === 'superadmin' ? Role.SUPER_ADMIN : Role.ADMIN;

    const user = await this.prisma.user.findUnique({
      where: { email_role: { email: dto.email, role: targetRole } },
    });
    const passwordHash = createHash('sha256').update(dto.password).digest('hex');
    const valid = !!user && user.isActive && user.passwordHash === passwordHash;

    if (!valid) {
      addSecurityLog(
        'credential-check',
        'failure',
        `Failed credential check for ${dto.email} as ${dto.role}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (dto.role === 'superadmin') {
      addSecurityLog(
        'credential-check',
        'success',
        `Super admin ${dto.email} passed credential check, awaiting authenticator`,
      );
      return { success: true, nextStep: 'authenticator', identifier: dto.email };
    }

    // rate limit: max 5 OTP requests per email per hour
    const rl = checkOtpRateLimit(`email:${dto.email}`);
    if (!rl.allowed) {
      addSecurityLog('credential-check', 'failure', `Rate limit hit for ${dto.email}`);
      throw new BadRequestException(
        `Too many OTP requests. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.`,
      );
    }

    const otp = this.generateOtp();
    otpStore.set(dto.email, otp);
    setTimeout(() => otpStore.delete(dto.email), 5 * 60 * 1000);

    const result = await sendOtpEmail(dto.email, otp);

    addSecurityLog(
      'credential-check',
      result.success ? 'success' : 'failure',
      `Admin ${dto.email} passed credential check, OTP ${result.success ? `sent via ${result.provider}` : `delivery failed (${result.error})`}`,
    );
    return {
      success: true,
      nextStep: 'otp',
      identifier: dto.email,
      delivered: result.success,
      provider: result.provider,
    };
  }

  // ─── verify OTP (admin / superadmin) ─────────────────────────────────────

  async verifyOtp(dto: { otp: string; role: 'admin' | 'superadmin'; identifier: string }) {
    const stored = otpStore.get(dto.identifier);
    if (!stored || stored !== dto.otp) {
      addSecurityLog('verify-otp', 'failure', `Invalid OTP attempt for ${dto.identifier}`);
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    otpStore.delete(dto.identifier);

    const targetRole: Role = dto.role === 'superadmin' ? Role.SUPER_ADMIN : Role.ADMIN;
    const user = await this.prisma.user.findUnique({
      where: { email_role: { email: dto.identifier, role: targetRole } },
    });
    if (!user) {
      addSecurityLog('verify-otp', 'failure', `User not found for ${dto.identifier}`);
      throw new UnauthorizedException('User not found');
    }

    addSecurityLog('verify-otp', 'success', `OTP verified for ${dto.identifier}`);
    return { success: true, data: this.buildLoginPayload(user) };
  }

  // ─── TOTP verify (superadmin) ─────────────────────────────────────────────

  async verifyAuthenticator(dto: { token: string; identifier: string }) {
    const valid = authenticator.check(dto.token, AUTHENTICATOR_SECRET);
    if (!valid) {
      addSecurityLog('verify-authenticator', 'failure', `Invalid TOTP for ${dto.identifier}`);
      throw new UnauthorizedException('Invalid authenticator token');
    }

    const user = await this.prisma.user.findUnique({
      where: { email_role: { email: dto.identifier, role: Role.SUPER_ADMIN } },
    });
    if (!user) {
      addSecurityLog('verify-authenticator', 'failure', `Super admin not found: ${dto.identifier}`);
      throw new UnauthorizedException('User not found');
    }

    addSecurityLog('verify-authenticator', 'success', `Super admin ${dto.identifier} signed in`);
    return { success: true, data: this.buildLoginPayload(user) };
  }

  // ─── vendor check ─────────────────────────────────────────────────────────

  async vendorCheck(dto: { vendorCode: string; mobile?: string; password: string }) {
    const code = (dto.vendorCode || '').trim();
    if (!code || !dto.password) {
      addSecurityLog('vendor-check', 'failure', 'Missing vendor fields');
      throw new UnauthorizedException('Invalid vendor credentials');
    }

    // Look up vendor by vendorCode (preferred), fallback to legacy email pattern
    const vendor = await this.prisma.vendor.findUnique({
      where: { vendorCode: code },
      include: { user: true },
    });
    const legacyEmail = `${code.toLowerCase()}@vendor.canteen.local`;
    const user =
      vendor?.user ||
      (await this.prisma.user.findUnique({
        where: { email_role: { email: legacyEmail, role: Role.VENDOR } },
      }));

    const passwordHash = createHash('sha256').update(dto.password).digest('hex');
    const valid = !!user && user.isActive && user.passwordHash === passwordHash;

    if (!valid) {
      addSecurityLog('vendor-check', 'failure', `Bad credentials for vendor ${code}`);
      throw new UnauthorizedException('Invalid vendor credentials');
    }

    // Vendor OTP now goes via EMAIL (we dropped SMS for cost)
    const vendorEmail = vendor?.contactEmail || user.email;
    if (!vendorEmail || vendorEmail.endsWith('@vendor.canteen.local')) {
      addSecurityLog('vendor-check', 'failure', `Vendor ${code} has no real email on file`);
      throw new BadRequestException(
        'Vendor has no email registered. Contact administrator to update profile.',
      );
    }

    // rate limit: max 5 OTP requests per email per hour
    const rl = checkOtpRateLimit(`email:${vendorEmail}`);
    if (!rl.allowed) {
      addSecurityLog('vendor-check', 'failure', `Rate limit hit for ${vendorEmail}`);
      throw new BadRequestException(
        `Too many OTP requests. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.`,
      );
    }

    const otp = this.generateOtp();
    otpStore.set(code, otp);
    setTimeout(() => otpStore.delete(code), 5 * 60 * 1000);

    const result = await sendOtpEmail(vendorEmail, otp);

    addSecurityLog(
      'vendor-check',
      result.success ? 'success' : 'failure',
      `Vendor ${code} (${vendorEmail}) passed check, email OTP ${result.success ? `sent via ${result.provider}` : `delivery failed (${result.error})`}`,
    );

    return {
      success: true,
      nextStep: 'email-otp',
      identifier: code,
      maskedEmail: vendorEmail.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
      delivered: result.success,
      provider: result.provider,
    };
  }

  // ─── verify vendor OTP ────────────────────────────────────────────────────

  async verifyVendorOtp(dto: { otp: string; identifier: string }) {
    const stored = otpStore.get(dto.identifier);
    if (!stored || stored !== dto.otp) {
      addSecurityLog('verify-vendor-otp', 'failure', `Invalid OTP for vendor ${dto.identifier}`);
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    otpStore.delete(dto.identifier);

    const email = `${dto.identifier.toLowerCase()}@vendor.canteen.local`;
    const user = await this.prisma.user.findUnique({
      where: { email_role: { email, role: Role.VENDOR } },
    });
    if (!user) {
      addSecurityLog('verify-vendor-otp', 'failure', `Vendor not found: ${dto.identifier}`);
      throw new UnauthorizedException('Vendor not found');
    }

    addSecurityLog('verify-vendor-otp', 'success', `Vendor ${dto.identifier} signed in`);
    return { success: true, data: this.buildLoginPayload(user) };
  }

  // ─── validate user (passport local strategy) ─────────────────────────────

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user || !user.isActive) return null;

    const hash = createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== hash) return null;

    return user;
  }

  // ─── Google SSO (employee) ────────────────────────────────────────────────

  async googleLogin(dto: { credential: string }) {
    const clientId =
      this.configService.get<string>('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new BadRequestException('Google OAuth not configured');

    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken: dto.credential, audience: clientId });
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Empty Google payload');

    const { email, name, picture } = payload;
    if (!email) throw new UnauthorizedException('No email in Google token');

    let user = await this.prisma.user.findUnique({
      where: { email_role: { email, role: Role.CUSTOMER } },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: name ?? email,
          avatar: picture,
          role: Role.CUSTOMER,
          passwordHash: createHash('sha256').update(randomUUID()).digest('hex'),
          isActive: true,
        },
      });
    }

    addSecurityLog('google-login', 'success', `Employee SSO ${email}`);
    return { success: true, data: this.buildLoginPayload(user) };
  }

  // ─── multi-step auth (unified endpoint) ──────────────────────────────────

  async loginMulti(dto: {
    step: string;
    role?: string;
    email?: string;
    password?: string;
    otp?: string;
    token?: string;
    identifier?: string;
    vendorCode?: string;
    mobile?: string;
    credential?: string;
  }) {
    const step = (dto.step || '').toLowerCase();

    if (step === 'credential') {
      const role = (dto.role || 'admin') as 'admin' | 'superadmin';
      return this.credentialCheck({
        email: dto.email!,
        password: dto.password!,
        role,
      });
    }

    if (step === 'otp') {
      const role = (dto.role || 'admin') as 'admin' | 'superadmin';
      return this.verifyOtp({
        otp: dto.otp!,
        role,
        identifier: dto.identifier!,
      });
    }

    if (step === 'authenticator') {
      return this.verifyAuthenticator({
        token: dto.token!,
        identifier: dto.identifier!,
      });
    }

    if (step === 'vendor-credential') {
      return this.vendorCheck({
        vendorCode: dto.vendorCode!,
        mobile: dto.mobile,
        password: dto.password!,
      });
    }

    if (step === 'vendor-otp' || step === 'email-otp') {
      return this.verifyVendorOtp({
        otp: dto.otp!,
        identifier: dto.identifier!,
      });
    }

    if (step === 'google') {
      return this.googleLogin({ credential: dto.credential! });
    }

    throw new BadRequestException(`Unknown auth step: ${step}`);
  }

  // ─── TOTP setup (superadmin) ──────────────────────────────────────────────

  getAuthenticatorSetup() {
    return {
      secret: AUTHENTICATOR_SECRET,
      uri: authenticator.keyuri(
        'mehrasam1996@gmail.com',
        'Canteen Secure Gateway',
        AUTHENTICATOR_SECRET,
      ),
    };
  }

  // ─── security audit log ───────────────────────────────────────────────────

  getSecurityLogs() {
    return [...securityLogs].reverse();
  }

  // ─── JWT verify (public helper used by gateway) ───────────────────────────

  verifyToken(token: string): Record<string, unknown> | null {
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      process.env.JWT_SECRET ||
      'canteen-super-secret-jwt-key-2024-production-grade';
    return verifyToken(token, secret);
  }
}
