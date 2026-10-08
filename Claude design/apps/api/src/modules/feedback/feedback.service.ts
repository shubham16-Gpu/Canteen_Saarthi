import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FeedbackCategory,
  FeedbackKind,
  FeedbackStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

export interface CreateFeedbackDto {
  kind: FeedbackKind;
  category: FeedbackCategory;
  title: string;
  body: string;
  rating?: number;
  vendorId?: string;
  couponId?: string;
  evidence?: unknown;
  metadata?: unknown;
}

export interface UpdateFeedbackStatusDto {
  status: FeedbackStatus;
  resolvedBy?: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly prisma = new PrismaClient();

  async create(authorId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedbackEntry.create({
      data: {
        kind: dto.kind,
        category: dto.category,
        title: dto.title,
        body: dto.body,
        rating: dto.rating,
        authorId,
        vendorId: dto.vendorId ?? null,
        couponId: dto.couponId ?? null,
        evidence: (dto.evidence ?? []) as object,
        metadata: dto.metadata !== undefined ? (dto.metadata as object) : undefined,
        status: FeedbackStatus.OPEN,
      },
    });
  }

  async list(opts: {
    page?: number;
    limit?: number;
    status?: FeedbackStatus;
    kind?: FeedbackKind;
    category?: FeedbackCategory;
    authorId?: string;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.FeedbackEntryWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.kind) where.kind = opts.kind;
    if (opts.category) where.category = opts.category;
    if (opts.authorId) where.authorId = opts.authorId;

    const [items, total] = await Promise.all([
      this.prisma.feedbackEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      this.prisma.feedbackEntry.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const entry = await this.prisma.feedbackEntry.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    if (!entry) throw new NotFoundException(`Feedback entry ${id} not found`);
    return entry;
  }

  async updateStatus(id: string, dto: UpdateFeedbackStatusDto) {
    const entry = await this.findOne(id);

    return this.prisma.feedbackEntry.update({
      where: { id: entry.id },
      data: {
        status: dto.status,
        resolvedBy: dto.resolvedBy ?? null,
        resolvedAt:
          dto.status === FeedbackStatus.RESOLVED ? new Date() : null,
      },
    });
  }
}
