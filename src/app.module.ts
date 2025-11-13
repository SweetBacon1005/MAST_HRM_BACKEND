import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule as AppCommonModule } from './common/common.module';
import { DivisionModule } from './division/division.module';
import { LeaveManagementModule } from './leave-management/leave-management.module';
import { ProjectsModule } from './projects/projects.module';
import { RequestsModule } from './requests/requests.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { UsersModule } from './users/users.module';

// import { DailyReportsModule } from './daily-reports/daily-reports.module';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AssetsModule } from './assets/assets.module';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionModule } from './auth/permission.module';
import { CommonModule } from './common/common.module';
import { DateFormatInterceptor } from './common/interceptors/date-format.interceptor';
import { DatabaseModule } from './database/database.module';
import { MeetingRoomsModule } from './meeting-rooms/meeting-rooms.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { UploadModule } from './upload/upload.module';

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
    // DailyReportsModule,
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
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: DateFormatInterceptor,
    },
    GlobalAuthGuard,
  ],
})
export class AppModule {}
