import { Global, Module } from '@nestjs/common';
import { SecurityAuditController } from './security-audit.controller';
import { SecurityAuditService } from './security-audit.service';

@Global()
@Module({
  controllers: [SecurityAuditController],
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
