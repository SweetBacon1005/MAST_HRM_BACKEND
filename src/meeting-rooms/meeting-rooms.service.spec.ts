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

    it('nên lọc theo search', async () => {
      const query: RoomPaginationDto = {
        page: 1,
        limit: 10,
        search: 'Phòng A',
      };

      mockPrismaService.rooms.findMany.mockResolvedValue([]);
      mockPrismaService.rooms.count.mockResolvedValue(0);

      await service.findAllRooms(query);

      expect(mockPrismaService.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Phòng A' },
          }),
        }),
      );
    });

    it('nên lọc theo is_active', async () => {
      const query: RoomPaginationDto = {
        page: 1,
        limit: 10,
        is_active: true,
      };

      mockPrismaService.rooms.findMany.mockResolvedValue([]);
      mockPrismaService.rooms.count.mockResolvedValue(0);

      await service.findAllRooms(query);

      expect(mockPrismaService.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
          }),
        }),
      );
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

    it('nên throw BadRequestException khi tên phòng đã tồn tại', async () => {
      const id = 1;
      const updateRoomDto: UpdateRoomDto = {
        name: 'Phòng họp B',
      };
      const existingRoom = {
        id,
        name: 'Phòng họp A',
        is_active: true,
      };
      const existingRoomWithSameName = {
        id: 2,
        name: 'Phòng họp B',
      };

      mockPrismaService.rooms.findFirst
        .mockResolvedValueOnce(existingRoom)
        .mockResolvedValueOnce(existingRoomWithSameName);

      await expect(service.updateRoom(id, updateRoomDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên cập nhật thành công khi không đổi tên', async () => {
      const id = 1;
      const updateRoomDto: UpdateRoomDto = {
        is_active: false,
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

      mockPrismaService.rooms.findFirst.mockResolvedValue(existingRoom);
      mockPrismaService.rooms.update.mockResolvedValue(updatedRoom);

      const result = await service.updateRoom(id, updateRoomDto);

      expect(result).toEqual(updatedRoom);
      expect(mockPrismaService.rooms.findFirst).toHaveBeenCalledTimes(1);
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

    it('nên throw NotFoundException khi không tìm thấy phòng họp', async () => {
      mockPrismaService.rooms.findFirst.mockResolvedValue(null);

      await expect(service.removeRoom(999)).rejects.toThrow(NotFoundException);
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

    it('nên throw BadRequestException khi thời gian đặt phòng vượt quá 4 giờ', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const createBookingDto: CreateBookingDto = {
        room_id: 1,
        title: 'Họp team',
        booking_date: bookingDate,
        start_hour: '09:00',
        end_hour: '14:00', // 5 giờ
      };
      const mockRoom = {
        id: 1,
        name: 'Phòng họp A',
        is_active: true,
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.createBooking(1, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi đặt phòng trong quá khứ', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const bookingDate = yesterday.toISOString().split('T')[0];
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

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.createBooking(1, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi đặt phòng hôm nay nhưng thời gian đã qua', async () => {
      const today = new Date().toISOString().split('T')[0];
      const createBookingDto: CreateBookingDto = {
        room_id: 1,
        title: 'Họp team',
        booking_date: today,
        start_hour: '08:00',
        end_hour: '09:00',
      };
      const mockRoom = {
        id: 1,
        name: 'Phòng họp A',
        is_active: true,
      };

      // Mock thời gian hiện tại là 10:00
      jest.useFakeTimers();
      jest.setSystemTime(new Date(`${today}T10:00:00`));

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.createBooking(1, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );

      jest.useRealTimers();
    });

    it('nên throw BadRequestException khi thời gian không hợp lệ', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const createBookingDto: CreateBookingDto = {
        room_id: 1,
        title: 'Họp team',
        booking_date: 'invalid-date',
        start_hour: '09:00',
        end_hour: '11:00',
      };
      const mockRoom = {
        id: 1,
        name: 'Phòng họp A',
        is_active: true,
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.createBooking(1, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi phòng đã được đặt trong khoảng thời gian đó', async () => {
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
      const existingBooking = {
        id: 1,
        room_id: 1,
        start_time: new Date(`${bookingDate}T09:30:00`),
        end_time: new Date(`${bookingDate}T10:30:00`),
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn(),
          room_bookings: {
            findFirst: jest.fn().mockResolvedValueOnce(existingBooking), // Overlapping booking
          },
        };
        return callback(tx);
      });

      await expect(service.createBooking(1, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi organizer đã có lịch trùng', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const user_id = 1;
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
      const conflictingBooking = {
        id: 1,
        organizer_id: user_id,
        start_time: new Date(`${bookingDate}T09:30:00`),
        end_time: new Date(`${bookingDate}T10:30:00`),
      };

      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn(),
          room_bookings: {
            findFirst: jest
              .fn()
              .mockResolvedValueOnce(null) // No room conflict
              .mockResolvedValueOnce(conflictingBooking), // Organizer conflict
          },
        };
        return callback(tx);
      });

      await expect(service.createBooking(user_id, createBookingDto)).rejects.toThrow(
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

    it('nên lọc theo room_id', async () => {
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
        room_id: 1,
      };

      mockPrismaService.room_bookings.findMany.mockResolvedValue([]);
      mockPrismaService.room_bookings.count.mockResolvedValue(0);

      await service.findAllBookings(query);

      expect(mockPrismaService.room_bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            room_id: 1,
          }),
        }),
      );
    });

    it('nên lọc theo organizer_id', async () => {
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
        organizer_id: 1,
      };

      mockPrismaService.room_bookings.findMany.mockResolvedValue([]);
      mockPrismaService.room_bookings.count.mockResolvedValue(0);

      await service.findAllBookings(query);

      expect(mockPrismaService.room_bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizer_id: 1,
          }),
        }),
      );
    });

    it('nên lọc theo from_date', async () => {
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
        from_date: '2024-12-01',
      };

      mockPrismaService.room_bookings.findMany.mockResolvedValue([]);
      mockPrismaService.room_bookings.count.mockResolvedValue(0);

      await service.findAllBookings(query);

      expect(mockPrismaService.room_bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            start_time: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('nên lọc theo to_date', async () => {
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
        to_date: '2024-12-31',
      };

      mockPrismaService.room_bookings.findMany.mockResolvedValue([]);
      mockPrismaService.room_bookings.count.mockResolvedValue(0);

      await service.findAllBookings(query);

      expect(mockPrismaService.room_bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            end_time: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('findMyBookings', () => {
    it('nên lấy danh sách lịch đặt phòng của tôi', async () => {
      const user_id = 1;
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockBookings = [
        {
          id: 1,
          title: 'Họp team',
          organizer_id: user_id,
          room: { id: 1, name: 'Phòng A' },
        },
      ];
      const total = 1;

      mockPrismaService.room_bookings.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.room_bookings.count.mockResolvedValue(total);

      const result = await service.findMyBookings(user_id, query);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(total);
    });

    it('nên lọc theo room_id', async () => {
      const user_id = 1;
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
        room_id: 1,
      };

      mockPrismaService.room_bookings.findMany.mockResolvedValue([]);
      mockPrismaService.room_bookings.count.mockResolvedValue(0);

      await service.findMyBookings(user_id, query);

      expect(mockPrismaService.room_bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizer_id: user_id,
            room_id: 1,
          }),
        }),
      );
    });

    it('nên lọc theo from_date và to_date', async () => {
      const user_id = 1;
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
        from_date: '2024-12-01',
        to_date: '2024-12-31',
      };

      mockPrismaService.room_bookings.findMany.mockResolvedValue([]);
      mockPrismaService.room_bookings.count.mockResolvedValue(0);

      await service.findMyBookings(user_id, query);

      expect(mockPrismaService.room_bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizer_id: user_id,
            start_time: expect.objectContaining({
              gte: expect.any(Date),
            }),
            end_time: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        }),
      );
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

    it('nên throw BadRequestException khi cập nhật với thời gian trùng với booking khác', async () => {
      const id = 1;
      const user_id = 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const updateBookingDto: UpdateBookingDto = {
        booking_date: bookingDate,
        start_hour: '09:00',
        end_hour: '11:00',
      };
      const existingBooking = {
        id,
        organizer_id: user_id,
        room_id: 1,
        title: 'Họp team',
        start_time: new Date(`${bookingDate}T08:00:00`),
        end_time: new Date(`${bookingDate}T09:00:00`),
      };
      const mockRoom = {
        id: 1,
        is_active: true,
      };
      const overlappingBooking = {
        id: 2,
        room_id: 1,
        start_time: new Date(`${bookingDate}T09:30:00`),
        end_time: new Date(`${bookingDate}T10:30:00`),
      };

      mockPrismaService.room_bookings.findFirst
        .mockResolvedValueOnce(existingBooking)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(overlappingBooking);
      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.updateBooking(id, user_id, updateBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi cập nhật với organizer conflict', async () => {
      const id = 1;
      const user_id = 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const updateBookingDto: UpdateBookingDto = {
        booking_date: bookingDate,
        start_hour: '09:00',
        end_hour: '11:00',
      };
      const existingBooking = {
        id,
        organizer_id: user_id,
        room_id: 1,
        title: 'Họp team',
        start_time: new Date(`${bookingDate}T08:00:00`),
        end_time: new Date(`${bookingDate}T09:00:00`),
      };
      const mockRoom = {
        id: 1,
        is_active: true,
      };
      const conflictingBooking = {
        id: 2,
        organizer_id: user_id,
        start_time: new Date(`${bookingDate}T09:30:00`),
        end_time: new Date(`${bookingDate}T10:30:00`),
      };

      mockPrismaService.room_bookings.findFirst
        .mockResolvedValueOnce(existingBooking)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(conflictingBooking);
      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.updateBooking(id, user_id, updateBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi thời gian không hợp lệ', async () => {
      const id = 1;
      const user_id = 1;
      const updateBookingDto: UpdateBookingDto = {
        booking_date: 'invalid-date',
        start_hour: '09:00',
        end_hour: '11:00',
      };
      const existingBooking = {
        id,
        organizer_id: user_id,
        room_id: 1,
        title: 'Họp team',
        start_time: new Date('2024-12-20T08:00:00'),
        end_time: new Date('2024-12-20T09:00:00'),
      };

      mockPrismaService.room_bookings.findFirst.mockResolvedValue(existingBooking);

      await expect(service.updateBooking(id, user_id, updateBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi duration vượt quá 4 giờ', async () => {
      const id = 1;
      const user_id = 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const updateBookingDto: UpdateBookingDto = {
        booking_date: bookingDate,
        start_hour: '09:00',
        end_hour: '14:00', // 5 giờ
      };
      const existingBooking = {
        id,
        organizer_id: user_id,
        room_id: 1,
        title: 'Họp team',
        start_time: new Date(`${bookingDate}T08:00:00`),
        end_time: new Date(`${bookingDate}T09:00:00`),
      };
      const mockRoom = {
        id: 1,
        is_active: true,
      };

      mockPrismaService.room_bookings.findFirst.mockResolvedValue(existingBooking);
      mockPrismaService.rooms.findFirst.mockResolvedValue(mockRoom);

      await expect(service.updateBooking(id, user_id, updateBookingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên cập nhật thành công khi chỉ thay đổi title', async () => {
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

    it('nên cập nhật thành công khi chỉ thay đổi room_id', async () => {
      const id = 1;
      const user_id = 1;
      const updateBookingDto: UpdateBookingDto = {
        room_id: 2,
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
        id: 2,
        is_active: true,
      };
      const updatedBooking = {
        ...existingBooking,
        room_id: 2,
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

    it('nên cập nhật thành công khi chỉ thay đổi start_hour', async () => {
      const id = 1;
      const user_id = 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const updateBookingDto: UpdateBookingDto = {
        start_hour: '10:00',
      };
      const existingBooking = {
        id,
        organizer_id: user_id,
        room_id: 1,
        title: 'Họp team',
        start_time: new Date(`${bookingDate}T09:00:00`),
        end_time: new Date(`${bookingDate}T11:00:00`),
      };
      const mockRoom = {
        id: 1,
        is_active: true,
      };
      const updatedBooking = {
        ...existingBooking,
        start_time: new Date(`${bookingDate}T10:00:00`),
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

    it('nên throw NotFoundException khi room không active', async () => {
      const id = 1;
      const user_id = 1;
      const updateBookingDto: UpdateBookingDto = {
        room_id: 2,
      };
      const existingBooking = {
        id,
        organizer_id: user_id,
        room_id: 1,
        title: 'Họp team',
        start_time: new Date('2024-12-20T09:00:00'),
        end_time: new Date('2024-12-20T11:00:00'),
      };

      mockPrismaService.room_bookings.findFirst.mockResolvedValue(existingBooking);
      mockPrismaService.rooms.findFirst.mockResolvedValue(null);

      await expect(service.updateBooking(id, user_id, updateBookingDto)).rejects.toThrow(
        NotFoundException,
      );
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

    it('nên throw NotFoundException khi không tìm thấy booking', async () => {
      mockPrismaService.room_bookings.findFirst.mockResolvedValue(null);

      await expect(service.removeBooking(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});

