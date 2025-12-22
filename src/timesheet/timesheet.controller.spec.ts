import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TimesheetController } from './timesheet.controller';
import { TimesheetService } from './timesheet.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { CreateAttendanceLogDto } from './dto/attendance-log.dto';
import { RegisterFaceDto } from './dto/register-face.dto';
import { TIMESHEET_ERRORS, USER_ERRORS } from '../common/constants/error-messages.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

describe('TimesheetController', () => {
  let controller: TimesheetController;
  let service: TimesheetService;

  const mockTimesheetService = {
    createTimesheet: jest.fn(),
    findMyTimesheetsPaginated: jest.fn(),
    findTimesheetById: jest.fn(),
    removeTimesheet: jest.fn(),
    registerFace: jest.fn(),
    checkin: jest.fn(),
    checkout: jest.fn(),
    getTodayAttendance: jest.fn(),
    getDayOffInfo: jest.fn(),
    getLateEarlyBalance: jest.fn(),
    getRequestQuota: jest.fn(),
    createAttendanceLog: jest.fn(),
    getAttendanceLogs: jest.fn(),
    getAttendanceLogById: jest.fn(),
    createDailyTimesheet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimesheetController],
      providers: [
        {
          provide: TimesheetService,
          useValue: mockTimesheetService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TimesheetController>(TimesheetController);
    service = module.get<TimesheetService>(TimesheetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('nên được định nghĩa', () => {
    expect(controller).toBeDefined();
  });

  describe('create - Tạo timesheet', () => {
    const createTimesheetDto: CreateTimesheetDto = {
      work_date: '2024-10-29',
      checkin: '2024-10-29T08:00:00.000Z',
      checkout: '2024-10-29T17:00:00.000Z',
    };

    it('nên tạo timesheet thành công', async () => {
      const mockTimesheet = {
        id: 1,
        user_id: 1,
        work_date: new Date('2024-10-29'),
        checkin: new Date('2024-10-29T08:00:00.000Z'),
        checkout: new Date('2024-10-29T17:00:00.000Z'),
        type: 'NORMAL',
        remote: 'OFFICE',
        is_complete: true,
        total_work_time: 480,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      mockTimesheetService.createTimesheet.mockResolvedValue(mockTimesheet);

      const result = await controller.create(createTimesheetDto, 1);

      expect(service.createTimesheet).toHaveBeenCalledWith(createTimesheetDto, 1);
      expect(result).toEqual(mockTimesheet);
    });

    it('nên throw lỗi khi không tìm thấy user', async () => {
      mockTimesheetService.createTimesheet.mockRejectedValue(
        new NotFoundException(USER_ERRORS.USER_NOT_FOUND),
      );

      await expect(controller.create(createTimesheetDto, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên throw lỗi khi timesheet đã tồn tại', async () => {
      mockTimesheetService.createTimesheet.mockRejectedValue(
        new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS),
      );

      await expect(controller.create(createTimesheetDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findMyTimesheets - Lấy danh sách timesheet của tôi', () => {
    const paginationDto = {
      page: 1,
      limit: 10,
    };

    it('nên trả về danh sách timesheet có phân trang', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            user_id: 1,
            work_date: new Date('2024-10-29'),
            checkin: new Date('2024-10-29T08:00:00.000Z'),
            checkout: new Date('2024-10-29T17:00:00.000Z'),
            requests: [],
          },
        ],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockTimesheetService.findMyTimesheetsPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findMyTimesheets(1, paginationDto);

      expect(service.findMyTimesheetsPaginated).toHaveBeenCalledWith(1, paginationDto);
      expect(result).toEqual(mockResponse);
    });

    it('nên trả về mảng rỗng khi không tìm thấy timesheet', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          total: 0,
          current_page: 1,
          per_page: 10,
          total_pages: 0,
        },
      };

      mockTimesheetService.findMyTimesheetsPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findMyTimesheets(1, paginationDto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('remove - Xóa timesheet', () => {
    it('nên xóa timesheet thành công', async () => {
      const mockDeletedTimesheet = {
        id: 1,
        deleted_at: new Date(),
      };

      mockTimesheetService.removeTimesheet.mockResolvedValue(mockDeletedTimesheet);

      const result = await controller.remove(1);

      expect(service.removeTimesheet).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockDeletedTimesheet);
    });

    it('nên throw NotFoundException khi không tìm thấy timesheet', async () => {
      mockTimesheetService.removeTimesheet.mockRejectedValue(
        new NotFoundException('Không tìm thấy timesheet'),
      );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerFace - Đăng ký khuôn mặt', () => {
    const registerFaceDto: RegisterFaceDto = {
      user_id: 1,
      photo_url: 'https://cloudinary.com/image.jpg',
    };

    it('nên đăng ký khuôn mặt thành công', async () => {
      const mockResponse = {
        success: true,
        message: 'Đăng ký khuôn mặt thành công',
        user_id: 1,
        photo_url: 'https://cloudinary.com/image.jpg',
        register_face_at: new Date(),
      };

      mockTimesheetService.registerFace.mockResolvedValue(mockResponse);

      const result = await controller.registerFace(registerFaceDto);

      expect(service.registerFace).toHaveBeenCalledWith(1, registerFaceDto.photo_url);
      expect(result).toEqual(mockResponse);
    });

    it('nên throw lỗi khi không tìm thấy user', async () => {
      mockTimesheetService.registerFace.mockRejectedValue(
        new NotFoundException(USER_ERRORS.USER_NOT_FOUND),
      );

      await expect(controller.registerFace(registerFaceDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên throw lỗi khi URL ảnh không hợp lệ', async () => {
      mockTimesheetService.registerFace.mockRejectedValue(
        new BadRequestException('URL ảnh không hợp lệ hoặc khuôn mặt đã được đăng ký'),
      );

      await expect(controller.registerFace(registerFaceDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkin - Check-in', () => {
    const checkinDto: CheckinDto = {
      photo_url: 'https://cloudinary.com/checkin.jpg',
    };

    it('nên check-in thành công', async () => {
      const mockResponse = {
        timesheet: {
          id: 1,
          user_id: 1,
          work_date: new Date(),
          checkin: new Date(),
        },
        attendance_log: {
          id: 1,
          action_type: 'checkin',
          timestamp: new Date(),
        },
        session: null,
        message: 'Check-in thành công',
      };

      mockTimesheetService.checkin.mockResolvedValue(mockResponse);

      const result = await controller.checkin(1, checkinDto);

      expect(service.checkin).toHaveBeenCalledWith(1, checkinDto);
      expect(result).toEqual(mockResponse);
    });

    it('nên throw lỗi khi đã check-in rồi', async () => {
      mockTimesheetService.checkin.mockRejectedValue(
        new BadRequestException('Bạn đã check-in hôm nay rồi'),
      );

      await expect(controller.checkin(1, checkinDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw lỗi khi thiếu photo_url', async () => {
      mockTimesheetService.checkin.mockRejectedValue(
        new BadRequestException('Thiếu photo_url sau khi xác thực ảnh'),
      );

      await expect(controller.checkin(1, checkinDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkout - Check-out', () => {
    const checkoutDto: CheckoutDto = {
      photo_url: 'https://cloudinary.com/checkout.jpg',
    };

    it('nên check-out thành công', async () => {
      const mockResponse = {
        timesheet: {
          id: 1,
          user_id: 1,
          work_date: new Date(),
          checkout: new Date(),
          total_work_time: 480,
          is_complete: true,
        },
        attendance_log: {
          id: 1,
          action_type: 'checkout',
          timestamp: new Date(),
        },
        work_summary: {
          total_minutes: 540,
          net_work_minutes: 480,
          break_minutes: 60,
          morning_minutes: 240,
          afternoon_minutes: 240,
        },
        message: 'Thao tác thành công',
      };

      mockTimesheetService.checkout.mockResolvedValue(mockResponse);

      const result = await controller.checkout(1, checkoutDto);

      expect(service.checkout).toHaveBeenCalledWith(1, checkoutDto);
      expect(result).toEqual(mockResponse);
    });

    it('nên throw lỗi khi chưa check-in', async () => {
      mockTimesheetService.checkout.mockRejectedValue(
        new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_NOT_FOUND),
      );

      await expect(controller.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw lỗi khi đã check-out rồi', async () => {
      mockTimesheetService.checkout.mockRejectedValue(
        new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_SUBMITTED),
      );

      await expect(controller.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTodayAttendance - Lấy thông tin chấm công hôm nay', () => {
    it('nên trả về thông tin chấm công hôm nay', async () => {
      const mockTimesheet = {
        id: 1,
        user_id: 1,
        work_date: new Date(),
        checkin: new Date(),
        checkout: null,
      };

      mockTimesheetService.getTodayAttendance.mockResolvedValue(mockTimesheet);

      const result = await controller.getTodayAttendance(1);

      expect(service.getTodayAttendance).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTimesheet);
    });

    it('nên trả về null khi chưa có chấm công hôm nay', async () => {
      mockTimesheetService.getTodayAttendance.mockResolvedValue(null);

      const result = await controller.getTodayAttendance(1);

      expect(result).toBeNull();
    });
  });

  describe('getDayOffInfo - Lấy thông tin nghỉ phép', () => {
    it('nên trả về thông tin nghỉ phép', async () => {
      const mockDayOffInfo = {
        hasDayOff: true,
        dayOff: {
          id: 1,
          duration: 'FULL_DAY',
          type: 'PAID',
        },
        needsAttendance: false,
        expectedWorkHours: {
          morningHours: 0,
          afternoonHours: 0,
          totalHours: 0,
        },
      };

      mockTimesheetService.getDayOffInfo.mockResolvedValue(mockDayOffInfo);

      const result = await controller.getDayOffInfo(1, '2024-10-29');

      expect(service.getDayOffInfo).toHaveBeenCalledWith(1, '2024-10-29');
      expect(result).toEqual(mockDayOffInfo);
    });
  });

  describe('getLateEarlyBalance - Lấy số phút đi muộn/về sớm', () => {
    it('nên trả về số phút đi muộn/về sớm đã được duyệt', async () => {
      const mockBalance = {
        month: 10,
        year: 2024,
        used_minutes: 45,
        used_late_minutes: 30,
        used_early_minutes: 15,
      };

      mockTimesheetService.getLateEarlyBalance.mockResolvedValue(mockBalance);

      const result = await controller.getLateEarlyBalance(1);

      expect(service.getLateEarlyBalance).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockBalance);
    });
  });

  describe('getRequestQuota - Lấy quota request', () => {
    it('nên trả về quota request quên chấm công & đi muộn/về sớm', async () => {
      const mockQuota = {
        month: 10,
        year: 2024,
        forgot_checkin: {
          quota: 3,
          used: 1,
          remaining: 2,
          exceeded: false,
        },
        late_early: {
          count_quota: 3,
          used_count: 2,
          remaining_count: 1,
          count_exceeded: false,
          minutes_quota: 120,
          used_minutes: 75,
          remaining_minutes: 45,
          minutes_exceeded: false,
          exceeded: false,
        },
        last_reset_date: '2024-09-30',
      };

      mockTimesheetService.getRequestQuota.mockResolvedValue(mockQuota);

      const result = await controller.getRequestQuota(1);

      expect(service.getRequestQuota).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockQuota);
    });
  });

  describe('createAttendanceLog - Tạo log chấm công', () => {
    const createAttendanceLogDto: CreateAttendanceLogDto = {
      work_date: '2024-10-29',
      action_type: 'checkin',
      timestamp: '2024-10-29T08:00:00.000Z',
      photo_url: 'https://cloudinary.com/log.jpg',
    };

    it('nên tạo log chấm công thành công', async () => {
      const mockLog = {
        id: 1,
        ...createAttendanceLogDto,
        timesheet_id: 1,
        work_date: new Date(createAttendanceLogDto.work_date),
        timestamp: new Date(createAttendanceLogDto.timestamp),
        created_at: new Date(),
      };

      mockTimesheetService.createAttendanceLog.mockResolvedValue(mockLog);

      const result = await controller.createAttendanceLog(createAttendanceLogDto, 1);

      expect(service.createAttendanceLog).toHaveBeenCalledWith(createAttendanceLogDto, 1);
      expect(result).toEqual(mockLog);
    });

    it('nên throw lỗi khi không tìm thấy timesheet', async () => {
      mockTimesheetService.createAttendanceLog.mockRejectedValue(
        new NotFoundException('Không tìm thấy timesheet'),
      );

      await expect(controller.createAttendanceLog(createAttendanceLogDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAttendanceLogs - Lấy danh sách log chấm công', () => {
    it('nên trả về danh sách log chấm công', async () => {
      const queryDto = {
        user_id: 1,
        start_date: '2024-10-01',
        end_date: '2024-10-31',
      };

      const mockLogs = {
        data: [
          {
            id: 1,
            user_id: 1,
            action_type: 'checkin',
            timestamp: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
        },
      };

      mockTimesheetService.getAttendanceLogs.mockResolvedValue(mockLogs);

      const result = await controller.getMyAttendanceLogs(1, queryDto);

      expect(service.getAttendanceLogs).toHaveBeenCalledWith(1, {
        ...queryDto,
        user_id: 1,
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getAttendanceLogById - Lấy chi tiết log chấm công', () => {
    it('nên trả về log chấm công theo id', async () => {
      const mockLog = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        timestamp: new Date(),
      };

      mockTimesheetService.getAttendanceLogById.mockResolvedValue(mockLog);

      const result = await controller.getAttendanceLogById(1);

      expect(service.getAttendanceLogById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockLog);
    });

    it('nên throw NotFoundException khi không tìm thấy log', async () => {
      mockTimesheetService.getAttendanceLogById.mockRejectedValue(
        new NotFoundException('Không tìm thấy log chấm công'),
      );

      await expect(controller.getAttendanceLogById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDailyTimesheet - Tạo timesheet hàng ngày', () => {
    it('nên tạo timesheet hàng ngày thành công', async () => {
      const body = { date: '2024-10-29' };
      const mockTimesheet = {
        id: 1,
        user_id: 1,
        work_date: new Date('2024-10-29'),
        type: 'NORMAL',
      };

      mockTimesheetService.createDailyTimesheet.mockResolvedValue(mockTimesheet);

      const result = await controller.createDailyTimesheet(1, body);

      expect(service.createDailyTimesheet).toHaveBeenCalledWith(1, body.date);
      expect(result).toEqual(mockTimesheet);
    });

    it('nên throw lỗi khi timesheet đã tồn tại', async () => {
      const body = { date: '2024-10-29' };

      mockTimesheetService.createDailyTimesheet.mockRejectedValue(
        new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS),
      );

      await expect(controller.createDailyTimesheet(1, body)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
