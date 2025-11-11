import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ActivityLogService, ActivityEvent, SubjectType } from '../common/services/activity-log.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomPaginationDto } from './dto/room-pagination.dto';
import { BookingPaginationDto } from './dto/booking-pagination.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { buildPaginationQuery, buildPaginationResponseFromDto } from '../common/utils/pagination.util';

const MAX_DURATION_MS = 4 * 60 * 60 * 1000;

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

    const room = await this.prisma.rooms.findFirst({
      where: { id: dto.room_id, is_active: true, deleted_at: null },
    });
    if (!room) {
      throw new NotFoundException('Phòng họp không tồn tại hoặc không hoạt động');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${dto.room_id} FOR UPDATE`;
      const overlapping = await tx.room_bookings.findFirst({
        where: {
          room_id: dto.room_id,
          deleted_at: null,
          start_time: { lt: end },
          end_time: { gt: start },
        },
      });
      if (overlapping) {
        throw new BadRequestException('Phòng đã bị trùng lịch trong khung giờ yêu cầu');
      }

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

      const booking = await tx.room_bookings.create({
        data: {
          room_id: dto.room_id,
          title: dto.title,
          description: dto.description ?? null,
          start_time: start,
          end_time: end,
          organizer_id: userId,
        },
        include: { room: true },
      });

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

  async createRoom(dto: CreateRoomDto) {
    const exists = await this.prisma.rooms.findFirst({ where: { name: dto.name, deleted_at: null } });
    if (exists) {
      throw new BadRequestException('Tên phòng đã tồn tại');
    }
    return this.prisma.rooms.create({ data: { ...dto } });
  }

  async findAllRooms(query: RoomPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(query);
    const where: any = { deleted_at: null };
    if (typeof query.search === 'string' && query.search.length > 0) {
      where.name = { contains: query.search };
    }
    if (typeof query.is_active === 'boolean') {
      where.is_active = query.is_active;
    }
    const [data, total] = await Promise.all([
      this.prisma.rooms.findMany({ where, skip, take, orderBy: orderBy || { created_at: 'desc' } }),
      this.prisma.rooms.count({ where }),
    ]);
    return buildPaginationResponseFromDto(data, total, query);
  }

  async findOneRoom(id: number) {
    const room = await this.prisma.rooms.findFirst({ where: { id, deleted_at: null } });
    if (!room) {
      throw new NotFoundException('Phòng họp không tồn tại');
    }
    return room;
  }

  async updateRoom(id: number, dto: UpdateRoomDto) {
    const room = await this.prisma.rooms.findFirst({ where: { id, deleted_at: null } });
    if (!room) {
      throw new NotFoundException('Phòng họp không tồn tại');
    }
    if (dto.name && dto.name !== room.name) {
      const exists = await this.prisma.rooms.findFirst({
        where: { name: dto.name, deleted_at: null, id: { not: id } as any },
      });
      if (exists) {
        throw new BadRequestException('Tên phòng đã tồn tại');
      }
    }
    return this.prisma.rooms.update({ where: { id }, data: { ...dto } });
  }

  async removeRoom(id: number) {
    const room = await this.prisma.rooms.findFirst({ where: { id, deleted_at: null } });
    if (!room) {
      throw new NotFoundException('Phòng họp không tồn tại');
    }
    return this.prisma.rooms.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  async findAllBookings(query: BookingPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(query);
    const where: any = { deleted_at: null };
    if (typeof query.room_id === 'number') where.room_id = query.room_id;
    if (typeof query.organizer_id === 'number') where.organizer_id = query.organizer_id;
    if (query.from) where.start_time = { gte: new Date(query.from) };
    if (query.to) where.end_time = Object.assign(where.end_time || {}, { lte: new Date(query.to) });
    const [data, total] = await Promise.all([
      this.prisma.room_bookings.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { start_time: 'asc' },
        include: { room: true },
      }),
      this.prisma.room_bookings.count({ where }),
    ]);
    return buildPaginationResponseFromDto(data, total, query);
  }

  async findOneBooking(id: number) {
    const booking = await this.prisma.room_bookings.findFirst({ where: { id, deleted_at: null }, include: { room: true } });
    if (!booking) {
      throw new NotFoundException('Lịch đặt phòng không tồn tại');
    }
    return booking;
  }

  async updateBooking(id: number, userId: number, dto: UpdateBookingDto) {
    const booking = await this.prisma.room_bookings.findFirst({ where: { id, deleted_at: null } });
    if (!booking) {
      throw new NotFoundException('Lịch đặt phòng không tồn tại');
    }
    const roomId = dto.room_id ?? booking.room_id;
    const title = dto.title ?? booking.title;
    const description = dto.description ?? booking.description ?? null;
    const start = dto.start_time ? new Date(dto.start_time) : new Date(booking.start_time);
    const end = dto.end_time ? new Date(dto.end_time) : new Date(booking.end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Thời gian không hợp lệ');
    }
    if (end <= start) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException('Thời lượng cuộc họp vượt quá giới hạn tối đa (4 giờ)');
    }

    const room = await this.prisma.rooms.findFirst({ where: { id: roomId, is_active: true, deleted_at: null } });
    if (!room) {
      throw new NotFoundException('Phòng họp không tồn tại hoặc không hoạt động');
    }

    const overlapping = await this.prisma.room_bookings.findFirst({
      where: {
        id: { not: id } as any,
        room_id: roomId,
        deleted_at: null,
        start_time: { lt: end },
        end_time: { gt: start },
      },
    });
    if (overlapping) {
      throw new BadRequestException('Phòng đã bị đặt trong khung giờ yêu cầu');
    }

    const organizerConflicting = await this.prisma.room_bookings.findFirst({
      where: {
        id: { not: id } as any,
        deleted_at: null,
        organizer_id: booking.organizer_id,
        start_time: { lt: end },
        end_time: { gt: start },
      },
    });
    if (organizerConflicting) {
      throw new BadRequestException('Bạn đang có lịch họp khác trùng thời gian');
    }

    const updated = await this.prisma.room_bookings.update({
      where: { id },
      data: { room_id: roomId, title, description, start_time: start, end_time: end },
      include: { room: true },
    });

    await this.activityLog.log({
      logName: 'Meeting Room',
      description: `Cập nhật đặt phòng: ${room.name} - ${title}`,
      subjectType: SubjectType.SYSTEM,
      event: ActivityEvent.NOTIFICATION_UPDATED,
      subjectId: updated.id,
      causerId: userId,
      properties: { room_id: roomId, title, start_time: start.toISOString(), end_time: end.toISOString() },
    });

    return updated;
  }

  async removeBooking(id: number, userId: number) {
    const booking = await this.prisma.room_bookings.findFirst({ where: { id, deleted_at: null }, include: { room: true } });
    if (!booking) {
      throw new NotFoundException('Lịch đặt phòng không tồn tại');
    }
    const removed = await this.prisma.room_bookings.update({ where: { id }, data: { deleted_at: new Date() } });
    await this.activityLog.log({
      logName: 'Meeting Room',
      description: `Xóa lịch đặt phòng: ${booking.room.name} - ${booking.title}`,
      subjectType: SubjectType.SYSTEM,
      event: ActivityEvent.NOTIFICATION_DELETED,
      subjectId: id,
      causerId: userId,
      properties: { room_id: booking.room_id, title: booking.title },
    });
    return removed;
  }
}
