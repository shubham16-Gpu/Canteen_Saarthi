import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VendorFormController } from './vendor-form.controller';
import { VendorFormService } from './vendor-form.service';

@Module({
  imports: [ConfigModule],
  controllers: [VendorFormController],
  providers: [VendorFormService],
  exports: [VendorFormService],
})
export class VendorFormModule {}
