import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export const PRISMA_TOKEN = 'PRISMA';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_TOKEN,
      useValue: new PrismaClient(),
    },
  ],
  exports: [PRISMA_TOKEN],
})
export class DatabaseModule {}
