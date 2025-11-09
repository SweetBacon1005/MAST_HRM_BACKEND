import { Module } from '@nestjs/common';
import { MeetingRoomsService } from './meeting-rooms.service';
import { MeetingRoomsController } from './meeting-rooms.controller';
import { ActivityLogService } from '../common/services/activity-log.service';

@Module({
  controllers: [MeetingRoomsController],
  providers: [MeetingRoomsService, ActivityLogService],
  exports: [MeetingRoomsService],
})
export class MeetingRoomsModule {}
