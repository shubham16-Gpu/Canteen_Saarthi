import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThaliService, DeclareDto } from './thali.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';

@ApiTags('thali')
@UseGuards(JwtAuthGuard)
@Controller('thali')
export class ThaliController {
  constructor(private readonly thaliService: ThaliService) {}

  /**
   * POST /thali/declare
   * Vendor declares today's thali quantity.
   */
  @Post('declare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vendor declares daily thali quantity' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['date', 'quantity'],
      properties: {
        date: { type: 'string', example: '2026-05-15' },
        quantity: { type: 'number', example: 100 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Declaration saved' })
  @ApiResponse({ status: 403, description: 'Only vendors can declare' })
  async declare(
    @CurrentUser() user: RequestUser,
    @Body() dto: DeclareDto,
  ) {
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only vendors (or admins) can declare thali');
    }

    // For admin overrides, vendorId must be passed in the body;
    // for vendors, it's derived from their user id.
    const vendorId =
      (dto as DeclareDto & { vendorId?: string }).vendorId ?? user.id;

    const result = await this.thaliService.declare(
      vendorId,
      dto,
      { id: user.id, email: user.email, role: user.role },
    );
    return { success: true, data: result };
  }

  /**
   * GET /thali/today
   * Today's thali declaration status for the calling vendor.
   */
  @Get('today')
  @ApiOperation({ summary: "Get vendor's thali declaration for today" })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2026-05-15' })
  @ApiResponse({ status: 200, description: 'Thali declaration or null' })
  async getToday(
    @CurrentUser() user: RequestUser,
    @Query('date') date?: string,
  ) {
    const today = date ?? new Date().toISOString().slice(0, 10);
    const data = await this.thaliService.getMine(user.id, today);
    return { success: true, data };
  }

  /**
   * GET /thali/list
   * Admin: list all vendor declarations for a given date.
   */
  @Get('list')
  @ApiOperation({ summary: 'List all thali declarations for a date (ADMIN/SA)' })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2026-05-15' })
  @ApiResponse({ status: 200, description: 'List of declarations' })
  async listForAdmin(
    @CurrentUser() user: RequestUser,
    @Query('date') date?: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to ADMIN and SUPER_ADMIN');
    }
    const today = date ?? new Date().toISOString().slice(0, 10);
    const data = await this.thaliService.listForAdmin(today);
    return { success: true, data };
  }

  /**
   * POST /thali/lock
   * Admin locks declarations for a date (no further changes allowed).
   */
  @Post('lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock thali declarations for a date (ADMIN/SA)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['date'],
      properties: {
        date: { type: 'string', example: '2026-05-15' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Declarations locked' })
  async lock(
    @CurrentUser() user: RequestUser,
    @Body() body: { date: string },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to ADMIN and SUPER_ADMIN');
    }
    const result = await this.thaliService.lock(body.date, {
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return { success: true, data: result };
  }

  /**
   * POST /thali/admin/override/:id
   * Admin overrides a locked declaration quantity.
   */
  @Post('admin/override/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin override thali declaration quantity' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['quantity', 'reason'],
      properties: {
        quantity: { type: 'number', example: 90 },
        reason: { type: 'string', example: 'Short delivery by supplier' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Declaration updated' })
  async adminOverride(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { quantity: number; reason: string },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to ADMIN and SUPER_ADMIN');
    }
    const result = await this.thaliService.adminOverride(
      id,
      body.quantity,
      user.id,
      body.reason,
      { id: user.id, email: user.email, role: user.role },
    );
    return { success: true, data: result };
  }
}
