import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { getEmailProviderStatus } from '../modules/auth/providers/email.provider';
import { getSmsProviderStatus } from '../modules/auth/providers/sms.provider';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.1',
    };
  }

  @Public()
  @Get('notifications')
  @ApiOperation({ summary: 'Email and SMS provider health' })
  @ApiResponse({ status: 200, description: 'Provider status report' })
  notifications() {
    const email = getEmailProviderStatus();
    const sms = getSmsProviderStatus();
    return {
      email,
      sms,
      ready: email.configured || sms.configured,
      timestamp: new Date().toISOString(),
    };
  }
}
