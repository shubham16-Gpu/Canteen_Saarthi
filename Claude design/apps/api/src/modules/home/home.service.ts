import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

interface HomeUpdatePayload {
  trivia?: unknown[];
  emergency?: unknown | null;
  todayLunch?: unknown[];
  metadata?: unknown | null;
}

@Injectable()
export class HomeService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getHomeContent() {
    return this.prisma.homePageContent.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateHomeContent(payload: HomeUpdatePayload) {
    const data = {
      trivia: (payload.trivia ?? []) as unknown as Prisma.InputJsonValue,
      emergency:
        payload.emergency === null
          ? Prisma.JsonNull
          : (payload.emergency as unknown as Prisma.InputJsonValue),
      todayLunch: (payload.todayLunch ?? []) as unknown as Prisma.InputJsonValue,
      metadata:
        payload.metadata === null || payload.metadata === undefined
          ? Prisma.JsonNull
          : (payload.metadata as unknown as Prisma.InputJsonValue),
    };

    const existing = await this.prisma.homePageContent.findFirst();
    if (existing) {
      return this.prisma.homePageContent.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.homePageContent.create({ data: { ...data, date: new Date() } });
  }
}
