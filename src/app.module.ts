import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { AttendanceModule } from './attendance/attendance.module';
import { RequestsModule } from './requests/requests.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { LeaveManagementModule } from './leave-management/leave-management.module';
import { DivisionModule } from './division/division.module';
import { ProjectsModule } from './projects/projects.module';
import { ReportsModule } from './reports/reports.module';
import { UploadModule } from './upload/upload.module';
import { PrismaService } from './database/prisma.service';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';
import { DateFormatInterceptor } from './common/interceptors/date-format.interceptor';
import { Reflector, APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    CommonModule, // Add shared services
    AuthModule,
    UsersModule,
    UserProfileModule,
    TimesheetModule,
    AttendanceModule,
    RequestsModule,
    SchedulerModule,
    LeaveManagementModule,
    DivisionModule,
    ProjectsModule,
    ReportsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService, 
    GlobalAuthGuard, 
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: DateFormatInterceptor,
    },
  ],
})
export class AppModule {}
