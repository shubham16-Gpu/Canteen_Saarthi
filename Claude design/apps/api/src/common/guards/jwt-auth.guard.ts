import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const secret = this.configService.get<string>('JWT_SECRET') ?? 'canteen-secret';
    const payload = this.verifyToken(token, secret);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Normalize: JWT carries `sub` (RFC 7519); controllers use `id`.
    request.user = { ...payload, id: (payload as { sub?: string }).sub };
    return true;
  }

  private verifyToken(token: string, secret: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [encodedHeader, encodedPayload, signature] = parts;
      if (!encodedHeader || !encodedPayload || !signature) return null;

      const expectedSignature = createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) return null;

      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as Record<string, unknown>;

      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload['exp'] && typeof payload['exp'] === 'number' && payload['exp'] < now) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
