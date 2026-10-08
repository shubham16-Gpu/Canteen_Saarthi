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
import { AuthService } from './auth.service';
import { MultiAuthDto } from './dto/multi-auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';
import { Public } from '../../common/decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Unified multi-step login endpoint.
   * Steps: credential | otp | authenticator | vendor-credential | vendor-otp | email-otp | google
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Multi-step authentication (all roles)' })
  @ApiBody({ type: MultiAuthDto })
  @ApiResponse({ status: 200, description: 'Step result or final JWT' })
  async login(@Body() dto: MultiAuthDto) {
    return this.authService.loginMulti(dto);
  }

  /**
   * Google OAuth login for employees.
   * Body: { credential: string } — the Google ID token from the frontend.
   */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google SSO login for employees' })
  @ApiResponse({ status: 200, description: 'JWT issued on success' })
  async googleLogin(@Body() body: { credential: string }) {
    return this.authService.googleLogin(body);
  }

  /**
   * Token refresh: accepts { token: string } in the request body and
   * re-issues a fresh JWT if the provided token is still valid.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh an existing JWT' })
  @ApiResponse({ status: 200, description: 'New JWT issued' })
  @ApiResponse({ status: 401, description: 'Token invalid or expired' })
  async refresh(@Body() body: { token: string }) {
    return this.authService.loginMulti({
      step: 'refresh',
      ...body,
    });
  }

  /**
   * Return the current user's profile decoded from the bearer token.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user object' })
  getMe(@CurrentUser() user: RequestUser) {
    return { success: true, data: user };
  }

  /**
   * Setup TOTP / authenticator for superadmin.
   * Returns the TOTP secret and QR URI — no auth required (admin provides
   * credentials separately). In production restrict this via IP allowlist.
   */
  @Public()
  @Post('totp/setup')
  @ApiOperation({ summary: 'Get TOTP secret & QR URI for superadmin setup' })
  @ApiResponse({ status: 200, description: 'TOTP setup data' })
  getTotpSetup() {
    return { success: true, data: this.authService.getAuthenticatorSetup() };
  }

  /**
   * Verify a TOTP token against the superadmin authenticator secret.
   * This is the `authenticator` step in `loginMulti`.
   */
  @Public()
  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code (superadmin authenticator step)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'identifier'],
      properties: {
        token: { type: 'string', example: '654321' },
        identifier: { type: 'string', example: 'superadmin@canteen.app' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'JWT issued on success' })
  async verifyTotp(@Body() body: { token: string; identifier: string }) {
    return this.authService.verifyAuthenticator(body);
  }
}
