import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MeetingRoomsController } from './meeting-rooms.controller';
import { MeetingRoomsService } from './meeting-rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { RoomPaginationDto } from './dto/room-pagination.dto';
import { BookingPaginationDto } from './dto/booking-pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

describe('MeetingRoomsController', () => {
  let controller: MeetingRoomsController;
  let service: MeetingRoomsService;

  const mockMeetingRoomsService = {
    createRoom: jest.fn(),
    findAllRooms: jest.fn(),
    findOneRoom: jest.fn(),
    updateRoom: jest.fn(),
    removeRoom: jest.fn(),
    createBooking: jest.fn(),
    findAllBookings: jest.fn(),
    findMyBookings: jest.fn(),
    findOneBooking: jest.fn(),
    updateBooking: jest.fn(),
    removeBooking: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingRoomsController],
      providers: [
        {
          provide: MeetingRoomsService,
          useValue: mockMeetingRoomsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MeetingRoomsController>(MeetingRoomsController);
    service = module.get<MeetingRoomsService>(MeetingRoomsService);
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
      };

      mockMeetingRoomsService.createRoom.mockResolvedValue(mockRoom);

      const result = await controller.createRoom(createRoomDto);

      expect(service.createRoom).toHaveBeenCalledWith(createRoomDto);
      expect(result).toEqual(mockRoom);
    });
  });

  describe('findAllRooms', () => {
    it('nên lấy danh sách phòng họp thành công', async () => {
      const query: RoomPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResult = {
        data: [{ id: 1, name: 'Phòng A' }],
        pagination: { total: 1, current_page: 1, per_page: 10, total_pages: 1 },
      };

      mockMeetingRoomsService.findAllRooms.mockResolvedValue(mockResult);

      const result = await controller.findAllRooms(query);

      expect(service.findAllRooms).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOneRoom', () => {
    it('nên lấy thông tin phòng họp thành công', async () => {
      const id = 1;
      const mockRoom = {
        id,
        name: 'Phòng họp A',
      };

      mockMeetingRoomsService.findOneRoom.mockResolvedValue(mockRoom);

      const result = await controller.findOneRoom(id);

      expect(service.findOneRoom).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockRoom);
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
      const mockBooking = {
        id: 1,
        ...createBookingDto,
        organizer_id: user_id,
      };

      mockMeetingRoomsService.createBooking.mockResolvedValue(mockBooking);

      const result = await controller.createBooking(user_id, createBookingDto);

      expect(service.createBooking).toHaveBeenCalledWith(user_id, createBookingDto);
      expect(result).toEqual(mockBooking);
    });
  });

  describe('findMyBookings', () => {
    it('nên lấy danh sách lịch đặt phòng của tôi thành công', async () => {
      const user_id = 1;
      const query: BookingPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResult = {
        data: [{ id: 1, title: 'Họp team' }],
        pagination: { total: 1, current_page: 1, per_page: 10, total_pages: 1 },
      };

      mockMeetingRoomsService.findMyBookings.mockResolvedValue(mockResult);

      const result = await controller.findMyBookings(user_id, query);

      expect(service.findMyBookings).toHaveBeenCalledWith(user_id, query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateBooking', () => {
    it('nên cập nhật lịch đặt phòng thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateBookingDto: UpdateBookingDto = {
        title: 'Họp team (cập nhật)',
      };
      const mockBooking = {
        id,
        ...updateBookingDto,
        organizer_id: user_id,
      };

      mockMeetingRoomsService.updateBooking.mockResolvedValue(mockBooking);

      const result = await controller.updateBooking(id, user_id, updateBookingDto);

      expect(service.updateBooking).toHaveBeenCalledWith(id, user_id, updateBookingDto);
      expect(result).toEqual(mockBooking);
    });
  });

  describe('removeBooking', () => {
    it('nên xóa lịch đặt phòng thành công', async () => {
      const id = 1;
      const user_id = 1;
      const mockBooking = {
        id,
        deleted_at: new Date(),
      };

      mockMeetingRoomsService.removeBooking.mockResolvedValue(mockBooking);

      const result = await controller.removeBooking(id, user_id);

      expect(service.removeBooking).toHaveBeenCalledWith(id, user_id);
      expect(result).toEqual(mockBooking);
    });
  });
});

