import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingRoomsService } from './meeting-rooms.service';
import { PrismaService } from '../database/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { RoomPaginationDto } from './dto/room-pagination.dto';
import { BookingPaginationDto } from './dto/booking-pagination.dto';
import { MEETING_ROOM_ERRORS } from '../common/constants/error-messages.constants';

describe('MeetingRoomsService', () => {
  let service: MeetingRoomsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    rooms: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    room_bookings: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingRoomsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MeetingRoomsService>(MeetingRoomsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('nên tạo phòng họp thành công', async () => {
      const createRoomDto: CreateRoomDto = {
        name: 'Phòng họp A',
        is_active: true,
      };
      const mockRoom = {
        id: 1,
        ...createRoomDto,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(null);
      mockPrismaService.rooms.create.mockResolvedValue(mockRoom);

      const result = await service.createRoom(createRoomDto);

      expect(result).toEqual(mockRoom);
    });

    it('nên throw BadRequestException khi tên phòng đã tồn tại', async () => {
      const createRoomDto: CreateRoomDto = {
        name: 'Phòng họp A',
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue({ id: 1, name: 'Phòng họp A' });

      await expect(service.createRoom(createRoomDto)).rejects.toThrow(BadRequestException);
      await expect(service.createRoom(createRoomDto)).rejects.toThrow(
        MEETING_ROOM_ERRORS.ROOM_NAME_EXISTS,
      );
    });
  });

  describe('findAllRooms', () => {
    it('nên lấy danh sách phòng họp có phân trang', async () => {
      const query: RoomPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockRooms = [
        {
          id: 1,
          name: 'Phòng họp A',
          is_active: true,
        },
      ];
      const total = 1;

      mockPrismaService.rooms.findMany.mockResolvedValue(mockRooms);
      mockPrismaService.rooms.count.mockResolvedValue(total);

      const result = await service.findAllRooms(query);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(total);
    });
  });

  describe('findOneRoom', () => {
    it('nên tìm thấy phòng họp theo id', async () => {
      const id = 1;
      const mockRoom = {
        id,
        name: 'Phòng họp A',
        is_active: true,
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      const result = await service.findOneRoom(id);

      expect(result).toEqual(mockRoom);
    });

    it('nên throw NotFoundException khi không tìm thấy phòng họp', async () => {
      mockPrismaService.rooms.findFirst.mockResolvedValue(null);

      await expect(service.findOneRoom(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOneRoom(999)).rejects.toThrow(
        MEETING_ROOM_ERRORS.ROOM_NOT_FOUND,
      );
    });
  });

  describe('updateRoom', () => {
    it('nên cập nhật phòng họp thành công', async () => {
      const id = 1;
      const updateRoomDto: UpdateRoomDto = {
        name: 'Phòng họp B',
      };
      const existingRoom = {
        id,
        name: 'Phòng họp A',
        is_active: true,
      };
      const updatedRoom = {
        ...existingRoom,
        ...updateRoomDto,
      };

      mockPrismaService.rooms.findFirst
        .mockResolvedValueOnce(existingRoom)
        .mockResolvedValueOnce(null);
      mockPrismaService.rooms.update.mockResolvedValue(updatedRoom);

      const result = await service.updateRoom(id, updateRoomDto);

      expect(result).toEqual(updatedRoom);
    });

    it('nên throw NotFoundException khi không tìm thấy phòng họp', async () => {
      mockPrismaService.rooms.findFirst.mockResolvedValue(null);

      await expect(service.updateRoom(999, { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeRoom', () => {
    it('nên xóa phòng họp thành công', async () => {
      const id = 1;
      const existingRoom = {
        id,
        name: 'Phòng họp A',
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(existingRoom);
      mockPrismaService.rooms.update.mockResolvedValue({
        ...existingRoom,
        deleted_at: new Date(),
      });

      const result = await service.removeRoom(id);

      expect(result.deleted_at).toBeDefined();
    });
  });

  describe('createBooking', () => {
    it('nên tạo lịch đặt phòng thành công', async () => {
      const user_id = 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const createBookingDto: CreateBookingDto = {
        room_id: 1,
        title: 'Họp team',
        booking_date: bookingDate,
        start_hour: '09:00',
        end_hour: '11:00',
      };
      const mockRoom = {
        id: 1,
        name: 'Phòng họp A',
        is_active: true,
      };
      const mockBooking = {
        id: 1,
        ...createBookingDto,
        organizer_id: user_id,
        start_time: new Date('2024-12-20T09:00:00'),
        end_time: new Date('2024-12-20T11:00:00'),
        room: mockRoom,
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn(),
          room_bookings: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockBooking),
          },
        };
        return callback(tx);
      });

      const result = await service.createBooking(user_id, createBookingDto);

      expect(result).toEqual(mockBooking);
    });

    it('nên throw NotFoundException khi phòng không tồn tại', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const createBookingDto: CreateBookingDto = {
        room_id: 999,
        title: 'Họp team',
        booking_date: bookingDate,
        start_hour: '09:00',
        end_hour: '11:00',
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(null);

      await expect(service.createBooking(1, createBookingDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên throw BadRequestException khi thời gian kết thúc trước thời gian bắt đầu', async () => {
      const createBookingDto: CreateBookingDto = {
        room_id: 1,
        title: 'Họp team',
        booking_date: '2024-12-20',
        start_hour: '11:00',
        end_hour: '09:00',
      };
      const mockRoom = {
        id: 1,
        is_active: true,
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.createBooking(1, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllBookings', () => {
    it('nên lấy danh sách lịch đặt phòng có phân trang', async () => {
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockBookings = [
        {
          id: 1,
          title: 'Họp team',
          room: { id: 1, name: 'Phòng A' },
        },
      ];
      const total = 1;

      mockPrismaService.room_bookings.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.room_bookings.count.mockResolvedValue(total);

      const result = await service.findAllBookings(query);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(total);
    });
  });

  describe('findOneBooking', () => {
    it('nên tìm thấy lịch đặt phòng theo id', async () => {
      const id = 1;
      const mockBooking = {
        id,
        title: 'Họp team',
        room: { id: 1, name: 'Phòng A' },
      };

      mockPrismaService.room_bookings.findFirst.mockResolvedValue(mockBooking);

      const result = await service.findOneBooking(id);

      expect(result).toEqual(mockBooking);
    });

    it('nên throw NotFoundException khi không tìm thấy lịch đặt phòng', async () => {
      mockPrismaService.room_bookings.findFirst.mockResolvedValue(null);

      await expect(service.findOneBooking(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBooking', () => {
    it('nên cập nhật lịch đặt phòng thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateBookingDto: UpdateBookingDto = {
        title: 'Họp team (cập nhật)',
      };
      const existingBooking = {
        id,
        organizer_id: user_id,
        room_id: 1,
        title: 'Họp team',
        start_time: new Date('2024-12-20T09:00:00'),
        end_time: new Date('2024-12-20T11:00:00'),
      };
      const mockRoom = {
        id: 1,
        is_active: true,
      };
      const updatedBooking = {
        ...existingBooking,
        ...updateBookingDto,
        room: mockRoom,
      };

      mockPrismaService.room_bookings.findFirst
        .mockResolvedValueOnce(existingBooking)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);
      mockPrismaService.room_bookings.update.mockResolvedValue(updatedBooking);

      const result = await service.updateBooking(id, user_id, updateBookingDto);

      expect(result).toEqual(updatedBooking);
    });

    it('nên throw NotFoundException khi không tìm thấy lịch đặt phòng', async () => {
      mockPrismaService.room_bookings.findFirst.mockResolvedValue(null);

      await expect(service.updateBooking(999, 1, {})).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không phải organizer', async () => {
      const existingBooking = {
        id: 1,
        organizer_id: 2,
      };

      mockPrismaService.room_bookings.findFirst.mockResolvedValue(existingBooking);

      await expect(service.updateBooking(1, 1, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeBooking', () => {
    it('nên xóa lịch đặt phòng thành công', async () => {
      const id = 1;
      const user_id = 1;
      const existingBooking = {
        id,
        organizer_id: user_id,
        room: { id: 1, name: 'Phòng A' },
      };

      mockPrismaService.room_bookings.findFirst.mockResolvedValue(existingBooking);
      mockPrismaService.room_bookings.update.mockResolvedValue({
        ...existingBooking,
        deleted_at: new Date(),
      });

      const result = await service.removeBooking(id, user_id);

      expect(result.deleted_at).toBeDefined();
    });

    it('nên throw ForbiddenException khi không phải organizer', async () => {
      const existingBooking = {
        id: 1,
        organizer_id: 2,
      };

      mockPrismaService.room_bookings.findFirst.mockResolvedValue(existingBooking);

      await expect(service.removeBooking(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});

