import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient, SecurityEventType, SecuritySeverity } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SystemConfigService } from '../admin/system-config.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface DeclareDto {
  date: string; // YYYY-MM-DD
  quantity: number;
  /** @deprecated late reason no longer required; kept for backward-compat ignore. */
  lateReason?: string;
}

function parseDateOnly(date: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new BadRequestException('date must be YYYY-MM-DD');
  const [, y, mo, d] = m;
  return new Date(Date.UTC(parseInt(y!, 10), parseInt(mo!, 10) - 1, parseInt(d!, 10)));
}

function timeToMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return 0;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const REMINDER_AUDIENCE = ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'CUSTOMER'];

@Injectable()
export class ThaliService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThaliService.name);
  private readonly prisma = new PrismaClient();
  private reminderTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly audit: AuditService,
    private readonly systemConfig: SystemConfigService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit(): void {
    // Run reminder sweep every hour. First sweep delayed 60s after boot.
    this.reminderTimer = setInterval(
      () => this.sweepReminders().catch((err) =>
        this.logger.warn(`reminder sweep failed: ${(err as Error).message}`),
      ),
      60 * 60 * 1000,
    );
    setTimeout(() => this.sweepReminders().catch(() => undefined), 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  async declare(
    vendorId: string,
    dto: DeclareDto,
    actor?: { id: string; email?: string; role?: string },
  ) {
    if (!dto || typeof dto.quantity !== 'number' || dto.quantity < 0) {
      throw new BadRequestException('quantity must be a non-negative number');
    }
    const date = parseDateOnly(dto.date);

    // Lock cutoff is informational only — late declarations are allowed without a reason.
    const cutoffStr = (await this.readConfigString('thaliDeclarationCutoff')) ?? '09:00';
    const cutoffMinutes = timeToMinutes(cutoffStr);

    const now = new Date();
    const isToday =
      now.getUTCFullYear() === date.getUTCFullYear() &&
      now.getUTCMonth() === date.getUTCMonth() &&
      now.getUTCDate() === date.getUTCDate();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isLate = isToday && nowMinutes > cutoffMinutes;

    const existing = await this.prisma.thaliDeclaration.findUnique({
      where: { date_vendorId: { date, vendorId } },
    });

    const data = {
      quantity: Math.floor(dto.quantity),
      isLate,
      lateReason: null, // Reason no longer collected.
    };

    const declaration = existing
      ? await this.prisma.thaliDeclaration.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.thaliDeclaration.create({
          data: { date, vendorId, ...data },
        });

    this.audit
      .log({
        eventType: SecurityEventType.THALI_DECLARED,
        severity: isLate ? SecuritySeverity.WARNING : SecuritySeverity.INFO,
        actor,
        entity: { type: 'thali_declaration', id: declaration.id },
        summary: `Vendor ${vendorId} declared ${data.quantity} thalis for ${dto.date}${isLate ? ' (late)' : ''}`,
        before: existing ?? undefined,
        after: declaration,
      })
      .catch((err) => this.logger.warn(`audit failed: ${(err as Error).message}`));

    // Real-time fan-out: every dashboard listening on /realtime gets the event.
    try {
      this.realtime.emit(
        'thali:declared',
        { vendorId, date: dto.date, declaration, isLate },
        REMINDER_AUDIENCE,
      );
    } catch (err) {
      this.logger.warn(`realtime emit failed: ${(err as Error).message}`);
    }

    return declaration;
  }

  async lock(date: string, actor?: { id: string; email?: string; role?: string }) {
    const dateObj = parseDateOnly(date);
    const declarations = await this.prisma.thaliDeclaration.findMany({
      where: { date: dateObj, lockedAt: null },
    });
    const now = new Date();
    const updated = await Promise.all(
      declarations.map((d) =>
        this.prisma.thaliDeclaration.update({
          where: { id: d.id },
          data: { lockedAt: now, lockedQty: d.quantity },
        }),
      ),
    );

    if (updated.length > 0) {
      this.audit
        .log({
          eventType: SecurityEventType.THALI_LOCKED,
          severity: SecuritySeverity.INFO,
          actor,
          entity: { type: 'thali_declaration', id: date },
          summary: `Locked ${updated.length} thali declarations for ${date}`,
        })
        .catch((err) => this.logger.warn(`audit failed: ${(err as Error).message}`));

      try {
        this.realtime.emit(
          'thali:locked',
          { date, count: updated.length, declarations: updated },
          REMINDER_AUDIENCE,
        );
      } catch (err) {
        this.logger.warn(`realtime emit failed: ${(err as Error).message}`);
      }
    }

    return { locked: updated.length, date };
  }

  async getMine(vendorId: string, date: string) {
    const dateObj = parseDateOnly(date);
    return this.prisma.thaliDeclaration.findUnique({
      where: { date_vendorId: { date: dateObj, vendorId } },
    });
  }

  async adminOverride(
    declarationId: string,
    newQty: number,
    adminId: string,
    reason: string,
    actor?: { id: string; email?: string; role?: string },
  ) {
    if (typeof newQty !== 'number' || newQty < 0) {
      throw new BadRequestException('quantity must be non-negative');
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException('reason is required');
    }
    const existing = await this.prisma.thaliDeclaration.findUnique({
      where: { id: declarationId },
    });
    if (!existing) throw new NotFoundException('Declaration not found');

    const updated = await this.prisma.thaliDeclaration.update({
      where: { id: declarationId },
      data: {
        quantity: Math.floor(newQty),
        adminOverride: true,
        overriddenBy: adminId,
      },
    });

    this.audit
      .log({
        eventType: SecurityEventType.THALI_DECLARED,
        severity: SecuritySeverity.WARNING,
        actor,
        entity: { type: 'thali_declaration', id: declarationId },
        summary: `Admin override: ${existing.quantity} → ${newQty}. Reason: ${reason}`,
        before: existing,
        after: updated,
        metadata: { reason },
      })
      .catch((err) => this.logger.warn(`audit failed: ${(err as Error).message}`));

    try {
      this.realtime.emit(
        'thali:override',
        {
          vendorId: updated.vendorId,
          date: updated.date.toISOString().slice(0, 10),
          declaration: updated,
          reason,
        },
        REMINDER_AUDIENCE,
      );
    } catch (err) {
      this.logger.warn(`realtime emit failed: ${(err as Error).message}`);
    }

    return updated;
  }

  async listForAdmin(date: string) {
    const dateObj = parseDateOnly(date);
    return this.prisma.thaliDeclaration.findMany({
      where: { date: dateObj },
      orderBy: { declaredAt: 'asc' },
    });
  }

  /**
   * Hourly reminder sweep: every active vendor that hasn't declared for today
   * gets a Socket.IO push on their user room PLUS an audit row so the admin
   * dashboard surfaces the lapse.
   */
  private async sweepReminders(): Promise<void> {
    const date = todayUTC();
    const cutoffStr = (await this.readConfigString('thaliDeclarationCutoff')) ?? '09:00';

    // Active vendors with a linked user account
    const allVendors = await this.prisma.vendor.findMany({
      where: { isActive: true },
      select: { id: true, userId: true, vendorCode: true, businessName: true },
    });
    const vendors = allVendors.filter((v) => !!v.userId);
    if (vendors.length === 0) return;

    const declared = await this.prisma.thaliDeclaration.findMany({
      where: { date, vendorId: { in: vendors.map((v) => v.id) } },
      select: { vendorId: true },
    });
    const declaredSet = new Set(declared.map((d) => d.vendorId));

    const missing = vendors.filter((v) => !declaredSet.has(v.id));
    if (missing.length === 0) return;

    const isoDate = date.toISOString().slice(0, 10);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isLate = nowMinutes > timeToMinutes(cutoffStr);

    for (const v of missing) {
      const payload = {
        vendorId: v.id,
        vendorCode: v.vendorCode,
        businessName: v.businessName,
        date: isoDate,
        cutoff: cutoffStr,
        isLate,
        message: isLate
          ? `Reminder: today's thali declaration is past the ${cutoffStr} cutoff. Please declare now.`
          : `Reminder: declare today's thali quantity before ${cutoffStr}.`,
        timestamp: now.toISOString(),
      };
      try {
        if (v.userId) {
          this.realtime.emitToUser('thali:reminder', v.userId, payload);
        }
        // Also push to admin / superadmin rooms so the dashboard can show "X vendors haven't declared".
        this.realtime.emit('thali:reminder', payload, ['SUPER_ADMIN', 'ADMIN']);
      } catch (err) {
        this.logger.warn(`reminder emit failed for ${v.id}: ${(err as Error).message}`);
      }
    }

    // Single audit row summarising the sweep
    this.audit
      .log({
        eventType: SecurityEventType.THALI_DECLARED,
        severity: isLate ? SecuritySeverity.WARNING : SecuritySeverity.INFO,
        summary: `Hourly thali reminder: ${missing.length} vendor(s) have not declared for ${isoDate}${isLate ? ' (past cutoff)' : ''}`,
        metadata: { vendors: missing.map((v) => v.vendorCode), isLate, cutoff: cutoffStr },
      })
      .catch(() => undefined);

    this.logger.log(
      `Reminder sweep: ${missing.length}/${vendors.length} vendor(s) un-declared for ${isoDate}`,
    );
  }

  private async readConfigString(key: string): Promise<string | null> {
    try {
      const row = await this.systemConfig.get(key);
      const v = row.value;
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  }
}
