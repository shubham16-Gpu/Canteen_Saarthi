import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';

@ApiTags('auth')
@UseGuards(JwtAuthGuard)
@Controller('auth/admin')
export class AdminLogsController {
  private readonly prisma = new PrismaClient();

  /**
   * GET /auth/admin/security-logs
   * Returns paginated SecurityAuditEvent records.
   * Requires ADMIN or SUPER_ADMIN role.
   */
  @Get('security-logs')
  @ApiOperation({ summary: 'Paginated security audit log (ADMIN / SUPER_ADMIN)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'severity', required: false, type: String, example: 'WARNING' })
  @ApiResponse({ status: 200, description: 'Paginated security events' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getSecurityLogs(
    @CurrentUser() user: RequestUser,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('severity') severity?: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to ADMIN and SUPER_ADMIN');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = severity
      ? { severity: severity as 'INFO' | 'WARNING' | 'CRITICAL' }
      : {};

    const [events, total] = await Promise.all([
      this.prisma.securityAuditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.securityAuditEvent.count({ where }),
    ]);

    return {
      success: true,
      data: events,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }
}
