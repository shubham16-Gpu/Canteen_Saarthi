import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HomeService } from './home.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';
import { Public } from '../../common/decorators';

@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * GET /home
   * Returns today's home page content: trivia, emergency banner, today's lunch.
   * Public endpoint — also works for authenticated users.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Get today's home page content" })
  @ApiResponse({ status: 200, description: 'Home page content' })
  async getHome() {
    const data = await this.homeService.getHomeContent();
    return { success: true, data };
  }

  /**
   * POST /home/config
   * Update home page content. Restricted to ADMIN and SUPER_ADMIN.
   */
  @UseGuards(JwtAuthGuard)
  @Post('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update home page content (ADMIN / SUPER_ADMIN)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        trivia: { type: 'array' },
        emergency: { type: 'object', nullable: true },
        todayLunch: { type: 'array' },
        metadata: { type: 'object', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated home content' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async updateHomeContent(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      trivia?: unknown[];
      emergency?: unknown | null;
      todayLunch?: unknown[];
      metadata?: unknown | null;
    },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to ADMIN and SUPER_ADMIN');
    }

    const data = await this.homeService.updateHomeContent(body);
    return { success: true, data };
  }
}
