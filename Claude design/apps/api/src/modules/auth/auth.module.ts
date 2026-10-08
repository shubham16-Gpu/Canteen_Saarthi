import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AdminLogsController } from './admin-logs.controller';
import { AuthService } from './auth.service';
import { EmployeeTotpController } from './employee-totp.controller';
import { EmployeeTotpService } from './employee-totp.service';
import { DevLoginController } from './dev-login.controller';

@Module({
  imports: [ConfigModule],
  controllers: [
    AuthController,
    AdminLogsController,
    EmployeeTotpController,
    DevLoginController,
  ],
  providers: [AuthService, EmployeeTotpService],
  exports: [AuthService, EmployeeTotpService],
})
export class AuthModule {}
