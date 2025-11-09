import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule as AppCommonModule } from './common/common.module';
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
import { AssetsModule } from './assets/assets.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { PermissionModule } from './auth/permission.module';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';
import { DateFormatInterceptor } from './common/interceptors/date-format.interceptor';
import { Reflector, APP_INTERCEPTOR } from '@nestjs/core';
import { MeetingRoomsModule } from './meeting-rooms/meeting-rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule, 
    PermissionModule,
    ScheduleModule.forRoot(),
    CommonModule,
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
    AssetsModule,
    NewsModule,
    NotificationsModule,
    MeetingRoomsModule,
    AppCommonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    GlobalAuthGuard, 
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: DateFormatInterceptor,
    }
  ],
})
export class AppModule {}
