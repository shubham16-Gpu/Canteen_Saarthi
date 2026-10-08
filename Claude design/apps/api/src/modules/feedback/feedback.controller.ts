import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeedbackCategory, FeedbackKind, FeedbackStatus } from '@prisma/client';
import { FeedbackService, CreateFeedbackDto } from './feedback.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';

@ApiTags('feedback')
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * POST /feedback
   * Submit a new feedback entry. authorId is set from the JWT.
   */
  @Post()
  @ApiOperation({ summary: 'Submit feedback / suggestion / issue / refund request' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['kind', 'category', 'title', 'body'],
      properties: {
        kind: { type: 'string', enum: ['FEEDBACK', 'SUGGESTION', 'ISSUE', 'REFUND'] },
        category: { type: 'string', enum: ['FOOD_QUALITY', 'HYGIENE', 'STAFF', 'VENDOR', 'CANTEEN', 'SUGGESTION', 'OTHER'] },
        title: { type: 'string', example: 'Cold food served' },
        body: { type: 'string', example: 'The dal was cold when served.' },
        rating: { type: 'number', example: 2 },
        vendorId: { type: 'string' },
        couponId: { type: 'string' },
        evidence: { type: 'array' },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Feedback created' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateFeedbackDto,
  ) {
    const data = await this.feedbackService.create(user.id, dto);
    return { success: true, data };
  }

  /**
   * GET /feedback
   * List feedback entries. ADMIN/SUPER_ADMIN see all; others see only their own.
   */
  @Get()
  @ApiOperation({ summary: 'List feedback entries' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'kind', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated feedback list' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('category') category?: string,
  ) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const result = await this.feedbackService.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status: status as FeedbackStatus | undefined,
      kind: kind as FeedbackKind | undefined,
      category: category as FeedbackCategory | undefined,
      authorId: isAdmin ? undefined : user.id,
    });
    return { success: true, ...result };
  }

  /**
   * PATCH /feedback/:id/status
   * Update feedback status. Restricted to ADMIN and SUPER_ADMIN.
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update feedback status (ADMIN / SUPER_ADMIN)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] },
        resolvedBy: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { status: FeedbackStatus; resolvedBy?: string },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to ADMIN and SUPER_ADMIN');
    }
    const data = await this.feedbackService.updateStatus(id, {
      status: body.status,
      resolvedBy: body.resolvedBy ?? user.id,
    });
    return { success: true, data };
  }
}
