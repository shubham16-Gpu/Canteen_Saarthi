import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ThaliModule } from './modules/thali/thali.module';
import { HomeModule } from './modules/home/home.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './health/health.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { VendorFormModule } from './modules/vendor-form/vendor-form.module';
import { SecurityAuditModule } from './modules/security-audit/security-audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: [
        '.env.local',
        '.env',
        '../../.env.local',
        '../../.env',
      ],
    }),
    DatabaseModule,
    CommonModule,
    AuditModule,
    AdminModule,
    RealtimeModule,
    AuthModule,
    ThaliModule,
    HomeModule,
    UsersModule,
    HealthModule,
    FeedbackModule,
    VendorFormModule,
    SecurityAuditModule,
  ],
})
export class AppModule {}
