import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmployeeTotpService } from './employee-totp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';

@ApiTags('auth')
@UseGuards(JwtAuthGuard)
@Controller('auth/employee/totp')
export class EmployeeTotpController {
  constructor(private readonly employeeTotpService: EmployeeTotpService) {}

  /**
   * POST /auth/employee/totp/setup
   * Generates a TOTP secret for the authenticated employee and returns a QR URI.
   */
  @Post('setup')
  @ApiOperation({ summary: 'Setup TOTP for employee (fallback 2FA)' })
  @ApiResponse({ status: 201, description: 'TOTP secret and QR URI' })
  async setup(@CurrentUser() user: RequestUser) {
    return this.employeeTotpService.setup(user.id, user.email);
  }

  /**
   * POST /auth/employee/totp/verify
   * Verifies a TOTP code and marks the employee as enrolled.
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code for employee' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'TOTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verify(
    @CurrentUser() user: RequestUser,
    @Body() body: { token: string },
  ) {
    return this.employeeTotpService.verify(user.id, body.token);
  }

  /**
   * GET /auth/employee/totp/status
   * Returns whether the employee has enrolled TOTP.
   */
  @Get('status')
  @ApiOperation({ summary: 'Get TOTP enrollment status for employee' })
  @ApiResponse({ status: 200, description: 'Enrollment status' })
  async status(@CurrentUser() user: RequestUser) {
    return this.employeeTotpService.getStatus(user.id);
  }
}
