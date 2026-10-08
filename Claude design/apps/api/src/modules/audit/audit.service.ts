import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  SecurityEventType,
  SecuritySeverity,
} from '@prisma/client';

export interface AuditLogPayload {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  actor?: {
    id?: string;
    email?: string;
    role?: string | { toString(): string };
  };
  entity?: { type: string; id: string };
  summary: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly prisma = new PrismaClient();

  async log(payload: AuditLogPayload): Promise<void> {
    try {
      await this.prisma.securityAuditEvent.create({
        data: {
          eventType: payload.eventType,
          severity: payload.severity ?? SecuritySeverity.INFO,
          actorId: payload.actor?.id ?? null,
          actorRole: payload.actor?.role
            ? String(payload.actor.role)
            : null,
          actorEmail: payload.actor?.email ?? null,
          entityType: payload.entity?.type ?? null,
          entityId: payload.entity?.id ?? null,
          summary: payload.summary,
          before: payload.before !== undefined
            ? (payload.before as object)
            : undefined,
          after: payload.after !== undefined
            ? (payload.after as object)
            : undefined,
          ipAddress: payload.ipAddress ?? null,
          userAgent: payload.userAgent ?? null,
          deviceId: payload.deviceId ?? null,
          metadata: (payload.metadata ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Never throw — audit failures must not block the main flow.
      this.logger.error(`AuditService.log failed: ${(err as Error).message}`);
    }
  }
}
