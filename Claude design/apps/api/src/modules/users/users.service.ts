import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getProfileFromToken(authHeader: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '') || '';
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1] || '';
    try {
      const payload = JSON.parse(Buffer.from(base64, 'base64url').toString('utf8'));
      const userId: string = payload.sub || payload.id;
      if (!userId) return null;

      return this.findOne(userId);
    } catch {
      return null;
    }
  }

  async update(id: string, data: { name?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
