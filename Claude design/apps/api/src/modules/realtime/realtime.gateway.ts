import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { createHmac } from 'crypto';

interface SocketData {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * Inline HS256 JWT verify — kept here to avoid importing AuthService
 * (RealtimeGateway ⇄ AuditService ⇄ AuthService is a real file-level cycle).
 */
function verifyJwtHs256(
  token: string,
  secret: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    if (!encodedHeader || !encodedPayload || !signature) return null;
    const expected = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    if (signature !== expected) return null;
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
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly configService: ConfigService) {}

  afterInit(server: Server): void {
    this.server = server;
    this.logger.log('Realtime gateway ready on /realtime');
  }

  handleConnection(client: Socket): void {
    try {
      const auth = (client.handshake.auth ?? {}) as { token?: string };
      const queryToken =
        typeof client.handshake.query?.token === 'string'
          ? client.handshake.query.token
          : undefined;
      const token = auth.token || queryToken;
      if (!token) {
        this.logger.warn(`socket ${client.id} rejected: no token`);
        client.disconnect(true);
        return;
      }
      const secret =
        this.configService.get<string>('app.jwtSecret') ||
        process.env.JWT_SECRET ||
        'canteen-dev-secret';
      const payload = verifyJwtHs256(token, secret);
      if (!payload) {
        this.logger.warn(`socket ${client.id} rejected: bad token`);
        client.disconnect(true);
        return;
      }
      const data: SocketData = {
        userId: typeof payload.sub === 'string' ? payload.sub : undefined,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: typeof payload.role === 'string' ? payload.role : undefined,
      };
      client.data = data;
      // join role-based room + per-user room
      if (data.role) client.join(`role:${data.role}`);
      if (data.userId) client.join(`user:${data.userId}`);
      this.logger.log(`socket ${client.id} connected (role=${data.role})`);
    } catch (err) {
      this.logger.warn(`socket ${client.id} error: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`socket ${client.id} disconnected`);
  }

  /**
   * Emit an event to specific role audiences (or globally if no audience).
   */
  emit(event: string, payload: unknown, audience?: string[]): void {
    if (!this.server) return;
    if (!audience || audience.length === 0) {
      this.server.emit(event, payload);
      return;
    }
    for (const role of audience) {
      this.server.to(`role:${role}`).emit(event, payload);
    }
  }

  /**
   * Emit an event to a specific user (across all their open sockets).
   */
  emitToUser(event: string, userId: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
