import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  SecurityAuditEvent,
  SecurityEventType,
  SecuritySeverity,
} from '@prisma/client';

export interface LogAuditEventDto {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  actorId?: string;
  actorRole?: string;
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

export interface ListAuditEventsOpts {
  page?: number;
  limit?: number;
  severity?: SecuritySeverity;
  eventType?: SecurityEventType;
  actorId?: string;
  entityType?: string;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private readonly prisma = new PrismaClient();

  async log(dto: LogAuditEventDto): Promise<SecurityAuditEvent | null> {
    try {
      return await this.prisma.securityAuditEvent.create({
        data: {
          eventType: dto.eventType,
          severity: dto.severity ?? SecuritySeverity.INFO,
          actorId: dto.actorId ?? null,
          actorRole: dto.actorRole ?? null,
          actorEmail: dto.actorEmail ?? null,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
          summary: dto.summary,
          before: dto.before !== undefined ? (dto.before as object) : undefined,
          after: dto.after !== undefined ? (dto.after as object) : undefined,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
          deviceId: dto.deviceId ?? null,
          metadata: (dto.metadata ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Never throw — audit logging must not break the main request flow.
      this.logger.error(`SecurityAuditService.log failed: ${(err as Error).message}`);
      return null;
    }
  }

  async list(opts: ListAuditEventsOpts = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
    const skip = (page - 1) * limit;

    const where: Prisma.SecurityAuditEventWhereInput = {};
    if (opts.severity) where.severity = opts.severity;
    if (opts.eventType) where.eventType = opts.eventType;
    if (opts.actorId) where.actorId = opts.actorId;
    if (opts.entityType) where.entityType = opts.entityType;

    const [events, total] = await Promise.all([
      this.prisma.securityAuditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.securityAuditEvent.count({ where }),
    ]);

    return {
      events,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
