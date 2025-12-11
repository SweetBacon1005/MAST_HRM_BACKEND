import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ActivityLogService, ActivityEvent, SubjectType } from '../common/services/activity-log.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomPaginationDto } from './dto/room-pagination.dto';
import { BookingPaginationDto } from './dto/booking-pagination.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { buildPaginationQuery, buildPaginationResponseFromDto } from '../common/utils/pagination.util';
import { MEETING_ROOM_ERRORS } from '../common/constants/error-messages.constants';
import { Prisma } from '@prisma/client';

const MAX_DURATION_MS = 4 * 60 * 60 * 1000;

@Injectable()
export class MeetingRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async createBooking(user_id: number, dto: CreateBookingDto) {
    const now = new Date();
    
    const [year, month, day] = dto.booking_date.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day);
    
    if (isNaN(bookingDate.getTime())) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.INVALID_TIME);
    }

    const [startHour, startMinute] = dto.start_hour.split(':').map(Number);
    const [endHour, endMinute] = dto.end_hour.split(':').map(Number);

    const start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
    const end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.INVALID_TIME);
    }
    if (end <= start) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.END_TIME_BEFORE_START);
    }
    
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfBookingDate = new Date(bookingDate);
    startOfBookingDate.setHours(0, 0, 0, 0);
    
    if (startOfBookingDate < startOfToday) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.CANNOT_BOOK_PAST);
    }
    
    if (startOfBookingDate.getTime() === startOfToday.getTime() && start < now) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.CANNOT_BOOK_PAST);
    }
    
    if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.DURATION_EXCEEDED);
    }

    const room = await this.prisma.rooms.findFirst({
      where: { id: dto.room_id, is_active: true, deleted_at: null },
    });
    if (!room) {
      throw new NotFoundException(MEETING_ROOM_ERRORS.ROOM_NOT_ACTIVE);
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
        throw new BadRequestException(MEETING_ROOM_ERRORS.ROOM_TIME_CONFLICT);
      }

      const organizerConflicting = await tx.room_bookings.findFirst({
        where: {
          deleted_at: null,
          organizer_id: user_id,
          start_time: { lt: end },
          end_time: { gt: start },
        },
      });

      if (organizerConflicting) {
        throw new BadRequestException(MEETING_ROOM_ERRORS.ORGANIZER_TIME_CONFLICT);
      }

      const booking = await tx.room_bookings.create({
        data: {
          room_id: dto.room_id,
          title: dto.title,
          description: dto.description ?? null,
          start_time: start,
          end_time: end,
          organizer_id: user_id,
        },
        include: { room: true },
      });

      await this.activityLog.log({
        logName: 'Meeting Room',
        description: `Đặt phòng: ${room.name} - ${dto.title}`,
        subjectType: SubjectType.SYSTEM,
        event: ActivityEvent.NOTIFICATION_CREATED,
        subjectId: booking.id,
        causer_id: user_id,
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
      throw new BadRequestException(MEETING_ROOM_ERRORS.ROOM_NAME_EXISTS);
    }
    return this.prisma.rooms.create({ data: { ...dto } });
  }

  async findAllRooms(query: RoomPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(query);
    const where: Prisma.roomsWhereInput = { deleted_at: null };
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
      throw new NotFoundException(MEETING_ROOM_ERRORS.ROOM_NOT_FOUND);
    }
    return room;
  }

  async updateRoom(id: number, dto: UpdateRoomDto) {
    const room = await this.prisma.rooms.findFirst({ where: { id, deleted_at: null } });
    if (!room) {
      throw new NotFoundException(MEETING_ROOM_ERRORS.ROOM_NOT_FOUND);
    }
    if (dto.name && dto.name !== room.name) {
      const exists = await this.prisma.rooms.findFirst({
        where: { name: dto.name, deleted_at: null, id: { not: id } as any },
      });
      if (exists) {
        throw new BadRequestException(MEETING_ROOM_ERRORS.ROOM_NAME_EXISTS);
      }
    }
    return this.prisma.rooms.update({ where: { id }, data: { ...dto } });
  }

  async removeRoom(id: number) {
    const room = await this.prisma.rooms.findFirst({ where: { id, deleted_at: null } });
    if (!room) {
      throw new NotFoundException(MEETING_ROOM_ERRORS.ROOM_NOT_FOUND);
    }
    return this.prisma.rooms.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  async findAllBookings(query: BookingPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(query);
    const where: Prisma.room_bookingsWhereInput = { deleted_at: null };
    if (typeof query.room_id === 'number') where.room_id = query.room_id;
    if (typeof query.organizer_id === 'number') where.organizer_id = query.organizer_id;
    
    if (query.from_date) {
      const [year, month, day] = query.from_date.split('-').map(Number);
      const fromDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      where.start_time = { gte: fromDate };
    }
    
    if (query.to_date) {
      const [year, month, day] = query.to_date.split('-').map(Number);
      const toDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      where.end_time = Object.assign(where.end_time || {}, { lte: toDate });
    }
    
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

  async findMyBookings(user_id: number, query: BookingPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(query);
    const where: Prisma.room_bookingsWhereInput = { deleted_at: null, organizer_id: user_id };
    if (typeof query.room_id === 'number') where.room_id = query.room_id;
    
    if (query.from_date) {
      const [year, month, day] = query.from_date.split('-').map(Number);
      const fromDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      where.start_time = { gte: fromDate };
    }
    
    if (query.to_date) {
      const [year, month, day] = query.to_date.split('-').map(Number);
      const toDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      where.end_time = Object.assign(where.end_time || {}, { lte: toDate });
    }
    
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
      throw new NotFoundException(MEETING_ROOM_ERRORS.BOOKING_NOT_FOUND);
    }
    return booking;
  }

  async updateBooking(id: number, user_id: number, dto: UpdateBookingDto) {
    const booking = await this.prisma.room_bookings.findFirst({ where: { id, deleted_at: null } });
    if (!booking) {
      throw new NotFoundException(MEETING_ROOM_ERRORS.BOOKING_NOT_FOUND);
    }
    if (booking.organizer_id !== user_id) {
      throw new ForbiddenException(MEETING_ROOM_ERRORS.UNAUTHORIZED_UPDATE);
    }
    
    const roomId = dto.room_id ?? booking.room_id;
    const title = dto.title ?? booking.title;
    const description = dto.description ?? booking.description ?? null;

    let start: Date;
    let end: Date;

    if (dto.booking_date || dto.start_hour || dto.end_hour) {
      let year: number, month: number, day: number;
      
      if (dto.booking_date) {
        [year, month, day] = dto.booking_date.split('-').map(Number);
      } else {
        const existingDate = new Date(booking.start_time);
        year = existingDate.getFullYear();
        month = existingDate.getMonth() + 1;
        day = existingDate.getDate();
      }
      
      const bookingDate = new Date(year, month - 1, day);
      
      if (isNaN(bookingDate.getTime())) {
        throw new BadRequestException(MEETING_ROOM_ERRORS.INVALID_TIME);
      }

      let startHour: number, startMinute: number, endHour: number, endMinute: number;

      if (dto.start_hour) {
        [startHour, startMinute] = dto.start_hour.split(':').map(Number);
      } else {
        const existingStart = new Date(booking.start_time);
        startHour = existingStart.getHours();
        startMinute = existingStart.getMinutes();
      }

      if (dto.end_hour) {
        [endHour, endMinute] = dto.end_hour.split(':').map(Number);
      } else {
        const existingEnd = new Date(booking.end_time);
        endHour = existingEnd.getHours();
        endMinute = existingEnd.getMinutes();
      }

      start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
      end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
    } else {
      start = new Date(booking.start_time);
      end = new Date(booking.end_time);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.INVALID_TIME);
    }
    if (end <= start) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.END_TIME_BEFORE_START);
    }
    if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException(MEETING_ROOM_ERRORS.DURATION_EXCEEDED);
    }

    const room = await this.prisma.rooms.findFirst({ where: { id: roomId, is_active: true, deleted_at: null } });
    if (!room) {
      throw new NotFoundException(MEETING_ROOM_ERRORS.ROOM_NOT_ACTIVE);
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
      throw new BadRequestException(MEETING_ROOM_ERRORS.ROOM_TIME_CONFLICT);
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
      throw new BadRequestException(MEETING_ROOM_ERRORS.ORGANIZER_TIME_CONFLICT);
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
      causer_id: user_id,
      properties: { room_id: roomId, title, start_time: start.toISOString(), end_time: end.toISOString() },
    });

    return updated;
  }

  async removeBooking(id: number, user_id: number) {
    const booking = await this.prisma.room_bookings.findFirst({ where: { id, deleted_at: null }, include: { room: true } });
    if (!booking) {
      throw new NotFoundException(MEETING_ROOM_ERRORS.BOOKING_NOT_FOUND);
    }
    if (booking.organizer_id !== user_id) {
      throw new ForbiddenException(MEETING_ROOM_ERRORS.UNAUTHORIZED_DELETE);
    }
    const removed = await this.prisma.room_bookings.update({ where: { id }, data: { deleted_at: new Date() } });
    await this.activityLog.log({
      logName: 'Meeting Room',
      description: `Xóa lịch đặt phòng: ${booking.room.name} - ${booking.title}`,
      subjectType: SubjectType.SYSTEM,
      event: ActivityEvent.NOTIFICATION_DELETED,
      subjectId: id,
      causer_id: user_id,
      properties: { room_id: booking.room_id, title: booking.title },
    });
    return removed;
  }
}
