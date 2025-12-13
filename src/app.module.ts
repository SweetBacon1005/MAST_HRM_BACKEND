import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
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

import { DailyReportsModule } from './daily-reports/daily-reports.module';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AssetsModule } from './assets/assets.module';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';
import { PermissionModule } from './auth/permission.module';
import { CommonModule } from './common/common.module';
import { DateFormatInterceptor } from './common/interceptors/date-format.interceptor';
import { DatabaseModule } from './database/database.module';
import { MeetingRoomsModule } from './meeting-rooms/meeting-rooms.module';
import { MilestonesModule } from './milestones/milestones.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { TeamModule } from './team/team.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Redis Cache Module (Global)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        password: configService.get<string>('REDIS_PASSWORD'),
        db: configService.get<number>('REDIS_DB', 0),
        ttl: parseInt(configService.get<string>('ROLE_CACHE_TTL', '300'), 10),
        // Fallback to in-memory cache if Redis connection fails
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 3) {
              console.warn('Redis connection failed. Falling back to in-memory cache.');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      }),
      inject: [ConfigService],
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
    DailyReportsModule,
    UploadModule,
    AssetsModule,
    NewsModule,
    NotificationsModule,
    MeetingRoomsModule,
    MilestonesModule,
    TeamModule,
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
