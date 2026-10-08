import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * SystemConfigService — thin wrapper around the `SystemConfig` key/value table.
 *
 * Callers can `.get(key)` to read a JSON value and `.set(key, value)` to
 * upsert it. Values are stored as JSON so the service is fully generic.
 */
@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly prisma = new PrismaClient();

  async get(key: string): Promise<{ key: string; value: unknown }> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!row) {
      throw new Error(`SystemConfig key not found: ${key}`);
    }
    return { key: row.key, value: row.value };
  }

  async getOrDefault(key: string, defaultValue: unknown): Promise<unknown> {
    try {
      const row = await this.get(key);
      return row.value;
    } catch {
      return defaultValue;
    }
  }

  async set(key: string, value: unknown): Promise<{ key: string; value: unknown }> {
    const row = await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
    return { key: row.key, value: row.value };
  }

  async list(): Promise<Array<{ key: string; value: unknown }>> {
    return this.prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }
}
