import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Làm cho module này global, có thể sử dụng ở bất kỳ đâu
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
