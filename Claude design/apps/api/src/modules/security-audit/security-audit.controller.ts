import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SecurityEventType, SecuritySeverity } from '@prisma/client';
import { SecurityAuditService } from './security-audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';

@ApiTags('security-audit')
@UseGuards(JwtAuthGuard)
@Controller('security-audit')
export class SecurityAuditController {
  constructor(private readonly securityAuditService: SecurityAuditService) {}

  /**
   * GET /security-audit
   * Returns paginated security audit events. Restricted to SUPER_ADMIN.
   */
  @Get()
  @ApiOperation({ summary: 'List security audit events (SUPER_ADMIN only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'severity', required: false, type: String, example: 'WARNING' })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated audit events' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('severity') severity?: string,
    @Query('eventType') eventType?: string,
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to SUPER_ADMIN');
    }

    const result = await this.securityAuditService.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      severity: severity as SecuritySeverity | undefined,
      eventType: eventType as SecurityEventType | undefined,
      actorId,
      entityType,
    });

    return { success: true, ...result };
  }
}
