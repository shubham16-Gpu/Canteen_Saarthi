import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Role, SecurityEventType, SecuritySeverity } from '@prisma/client';
import { createHmac } from 'crypto';
import { Public } from '../../common/decorators';
import { AuditService } from '../audit/audit.service';

/**
 * Dev-only login bypass.
 *
 * Activates only when `DEV_AUTH_BYPASS=true` in env. Issues a JWT for any
 * existing user given only their email + role — no password, no OTP, no TOTP.
 * Used to test RBAC across all 4 roles without juggling 2FA flows.
 *
 * In production set `DEV_AUTH_BYPASS=false` (or unset) to make this endpoint
 * return 403 unconditionally.
 */
@Public()
@Controller({ path: 'auth/dev-login', version: '1' })
export class DevLoginController {
  private readonly logger = new Logger(DevLoginController.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly configService: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private isEnabled(): boolean {
    return (
      (this.configService.get<string>('DEV_AUTH_BYPASS') ?? process.env.DEV_AUTH_BYPASS) === 'true'
    );
  }

  private base64UrlEncode(data: string): string {
    return Buffer.from(data).toString('base64url');
  }

  private signJwt(payload: Record<string, unknown>, secret: string, expiresIn: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    let expSeconds = 900;
    const m = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (m && m[1] && m[2]) {
      const v = parseInt(m[1], 10);
      const u = m[2];
      const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
      expSeconds = v * (mult[u] ?? 60);
    }
    const full = { ...payload, iat: now, exp: now + expSeconds };
    const eh = this.base64UrlEncode(JSON.stringify(header));
    const ep = this.base64UrlEncode(JSON.stringify(full));
    const sig = createHmac('sha256', secret).update(`${eh}.${ep}`).digest('base64url');
    return `${eh}.${ep}.${sig}`;
  }

  private toRole(role: string): Role {
    const r = (role || '').toUpperCase().replace(/-/g, '_');
    switch (r) {
      case 'SUPERADMIN':
      case 'SUPER_ADMIN':
        return Role.SUPER_ADMIN;
      case 'ADMIN':
        return Role.ADMIN;
      case 'VENDOR':
        return Role.VENDOR;
      case 'EMPLOYEE':
      case 'CUSTOMER':
        return Role.CUSTOMER;
      default:
        throw new BadRequestException(`Unknown role: ${role}`);
    }
  }

  @Post()
  async devLogin(@Body() body: { email?: string; role?: string }) {
    if (!this.isEnabled()) {
      throw new ForbiddenException(
        'Dev auth bypass is disabled. Set DEV_AUTH_BYPASS=true to enable.',
      );
    }

    const email = (body.email || '').trim().toLowerCase();
    const role = (body.role || '').trim();
    if (!email || !role) {
      throw new BadRequestException('email and role are required');
    }

    const dbRole = this.toRole(role);

    // SUPER_ADMIN must always use TOTP. No bypass even in dev.
    if (dbRole === Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Dev bypass is not available for SUPER_ADMIN. Use authenticator (TOTP) login.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email_role: { email, role: dbRole } },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException(`No active ${role} user with email ${email}`);
    }

    const secret =
      this.configService.get<string>('app.jwtSecret') ||
      process.env.JWT_SECRET ||
      'canteen-dev-secret';
    const expiresIn =
      this.configService.get<string>('app.jwtExpiresIn') || process.env.JWT_EXPIRY || '15m';

    const token = this.signJwt(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      secret,
      expiresIn,
    );

    // audit — fire & forget
    this.audit
      .log({
        eventType: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.WARNING,
        actor: { id: user.id, email: user.email, role: user.role },
        summary: `[DEV BYPASS] ${role} ${user.email} logged in without 2FA`,
        metadata: { devBypass: true },
      })
      .catch((err) =>
        this.logger.warn(`audit failed for dev-login ${email}: ${(err as Error).message}`),
      );

    return {
      success: true,
      access_token: token,
      token, // alias for older client code
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      devBypass: true,
    };
  }
}
