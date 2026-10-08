import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThaliController } from './thali.controller';
import { ThaliService } from './thali.service';

@Module({
  imports: [ConfigModule],
  controllers: [ThaliController],
  providers: [ThaliService],
  exports: [ThaliService],
})
export class ThaliModule {}
