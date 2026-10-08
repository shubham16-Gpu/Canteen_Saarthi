import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';

@ApiTags('users')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/profile
   * Returns the full profile of the currently authenticated user.
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser() user: RequestUser) {
    const data = await this.usersService.findOne(user.id);
    return { success: true, data };
  }

  /**
   * PUT /users/profile
   * Update the current user's mutable profile fields.
   */
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Shubham Mehra' },
        avatar: { type: 'string', example: 'https://cdn.example.com/avatar.jpg' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() body: { name?: string; avatar?: string },
  ) {
    const data = await this.usersService.update(user.id, body);
    return { success: true, data };
  }

  /**
   * GET /users
   * List all users. Restricted to ADMIN and SUPER_ADMIN.
   * Supports simple pagination via `page` and `limit` query params.
   */
  @Get()
  @ApiOperation({ summary: 'List all users (ADMIN / SUPER_ADMIN)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async listUsers(
    @CurrentUser() user: RequestUser,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to ADMIN and SUPER_ADMIN');
    }

    const all = await this.usersService.findAll();

    // Apply manual pagination (UsersService.findAll returns all records).
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const start = (pageNum - 1) * limitNum;
    const paged = all.slice(start, start + limitNum);

    return {
      success: true,
      data: paged,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: all.length,
        pages: Math.ceil(all.length / limitNum),
      },
    };
  }
}
