import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { AttendanceModule } from './attendance/attendance.module';
import { RequestsModule } from './requests/requests.module';
import { PrismaService } from './database/prisma.service';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    UserProfileModule,
    TimesheetModule,
    AttendanceModule,
    RequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, GlobalAuthGuard, Reflector],
})
export class AppModule {}
