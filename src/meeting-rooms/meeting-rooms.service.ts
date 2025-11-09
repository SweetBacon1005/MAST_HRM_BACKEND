import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ActivityLogService, ActivityEvent, SubjectType } from '../common/services/activity-log.service';

const MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

@Injectable()
export class MeetingRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async createBooking(userId: number, dto: CreateBookingDto) {
    const now = new Date();
    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);

    // Basic time validations
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Thời gian không hợp lệ');
    }
    if (end <= start) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (start < now) {
      throw new BadRequestException('Không thể đặt phòng trong quá khứ');
    }
    if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException('Thời lượng cuộc họp vượt quá giới hạn tối đa (4 giờ)');
    }

    // Check room exists and active
    const room = await this.prisma.rooms.findFirst({
      where: { id: dto.room_id, is_active: true, deleted_at: null },
    });
    if (!room) {
      throw new NotFoundException('Phòng họp không tồn tại hoặc không hoạt động');
    }

    // Concurrency-safe booking creation using transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Row lock on room to serialize bookings per room
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${dto.room_id} FOR UPDATE`;
      // Check room overlap (any overlap counts)
      const overlapping = await tx.room_bookings.findFirst({
        where: {
          room_id: dto.room_id,
          deleted_at: null,
          // overlap: existing.start < end AND existing.end > start
          start_time: { lt: end },
          end_time: { gt: start },
        },
      });
      if (overlapping) {
        throw new BadRequestException('Phòng đã bị trùng lịch trong khung giờ yêu cầu');
      }

      // Check organizer personal conflicts (as organizer or attendee)
      const organizerConflicting = await tx.room_bookings.findFirst({
        where: {
          deleted_at: null,
          organizer_id: userId,
          start_time: { lt: end },
          end_time: { gt: start },
        },
      });

      if (organizerConflicting) {
        throw new BadRequestException('Bạn đang có lịch họp khác trùng thời gian');
      }

      // Create booking
      const booking = await tx.room_bookings.create({
        data: {
          room_id: dto.room_id,
          title: dto.title,
          description: dto.description ?? null,
          start_time: start,
          end_time: end,
          organizer_id: userId,
          status: 'confirmed',
        },
        include: { room: true },
      });

      // Log activity
      await this.activityLog.log({
        logName: 'Meeting Room',
        description: `Đặt phòng: ${room.name} - ${dto.title}`,
        subjectType: SubjectType.SYSTEM,
        event: ActivityEvent.NOTIFICATION_CREATED,
        subjectId: booking.id,
        causerId: userId,
        properties: {
          room_id: dto.room_id,
          title: dto.title,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        },
      });

      return booking;
    });

    return result;
  }
}
