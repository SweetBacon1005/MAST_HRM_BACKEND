import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { TimesheetService } from './timesheet.service';
import { PrismaService } from '../database/prisma.service';
import { ip_validationService } from '../common/services/ip-validation.service';
import { UploadService } from '../upload/upload.service';
import { AttendanceRequestService } from '../requests/services/attendance-request.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { TIMESHEET_ERRORS, USER_ERRORS } from '../common/constants/error-messages.constants';
import { HolidayStatus } from '@prisma/client';

describe('TimesheetService', () => {
  let service: TimesheetService;
  let prismaService: any;
  let ipValidationService: any;
  let uploadService: any;
  let attendanceRequestService: any;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    deleted_at: null,
  };

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

  beforeEach(async () => {
    const mockPrismaService = {
      time_sheets: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      users: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      holidays: {
        findFirst: jest.fn(),
      },
      attendance_logs: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      attendance_requests: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user_leave_balances: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const mockIpValidationService = {
      getclient_ip: jest.fn().mockReturnValue('192.168.1.1'),
      validateIpForAttendance: jest.fn().mockResolvedValue({
        isValid: true,
        is_office_network: true,
        has_approved_remote_request: false,
        message: 'IP hợp lệ',
        client_ip: '192.168.1.1',
      }),
    };

    const mockUploadService = {
      validateCloudinaryUrl: jest.fn().mockReturnValue(true),
    };

    const mockAttendanceRequestService = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          START_MORNING_WORK_TIME: '8:30',
          END_MORNING_WORK_TIME: '12:00',
          START_AFTERNOON_WORK_TIME: '13:00',
          END_AFTERNOON_WORK_TIME: '17:30',
        };
        return config[key] || defaultValue;
      }),
    };

    const mockRequest = {
      ip: '192.168.1.1',
      headers: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ip_validationService, useValue: mockIpValidationService },
        { provide: UploadService, useValue: mockUploadService },
        { provide: AttendanceRequestService, useValue: mockAttendanceRequestService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: REQUEST, useValue: mockRequest },
      ],
    }).compile();

    service = module.get<TimesheetService>(TimesheetService);
    prismaService = module.get(PrismaService);
    ipValidationService = module.get(ip_validationService);
    uploadService = module.get(UploadService);
    attendanceRequestService = module.get(AttendanceRequestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('nên được định nghĩa', () => {
    expect(service).toBeDefined();
  });

  describe('createTimesheet - Tạo timesheet', () => {
    const createTimesheetDto: CreateTimesheetDto = {
      work_date: '2024-10-29',
      checkin: '2024-10-29T08:00:00.000Z',
      checkout: '2024-10-29T17:00:00.000Z',
    };

    it('nên tạo timesheet thành công', async () => {
      prismaService.users.findFirst.mockResolvedValue(mockUser);
      attendanceRequestService.findMany.mockResolvedValue([]);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.holidays.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.create.mockResolvedValue(mockTimesheet);

      const result = await service.createTimesheet(createTimesheetDto, 1);

      expect(prismaService.users.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(prismaService.time_sheets.create).toHaveBeenCalled();
      expect(result).toEqual(mockTimesheet);
    });

    it('nên throw NotFoundException khi không tìm thấy user', async () => {
      prismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.createTimesheet(createTimesheetDto, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createTimesheet(createTimesheetDto, 999)).rejects.toThrow(
        USER_ERRORS.USER_NOT_FOUND,
      );
    });

    it('nên throw BadRequestException khi timesheet đã tồn tại', async () => {
      prismaService.users.findFirst.mockResolvedValue(mockUser);
      attendanceRequestService.findMany.mockResolvedValue([]);
      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);

      await expect(service.createTimesheet(createTimesheetDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createTimesheet(createTimesheetDto, 1)).rejects.toThrow(
        TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS,
      );
    });

    it('nên tự động phát hiện loại holiday khi work_date là ngày lễ', async () => {
      const holiday = {
        id: 1,
        name: 'Ngày lễ',
        start_date: new Date('2024-10-29'),
        end_date: new Date('2024-10-29'),
        status: HolidayStatus.ACTIVE,
      };

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      attendanceRequestService.findMany.mockResolvedValue([]);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.holidays.findFirst.mockResolvedValue(holiday);
      prismaService.time_sheets.create.mockResolvedValue({
        ...mockTimesheet,
        type: 'HOLIDAY',
      });

      const result = await service.createTimesheet(createTimesheetDto, 1);

      expect(prismaService.holidays.findFirst).toHaveBeenCalled();
      expect(result.type).toBe('HOLIDAY');
    });
  });

  describe('findMyTimesheetsPaginated - Lấy danh sách timesheet có phân trang', () => {
    it('nên trả về danh sách timesheet có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      prismaService.time_sheets.count.mockResolvedValue(1);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.findMyTimesheetsPaginated(1, paginationDto);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.current_page).toBe(1);
      expect(result.pagination.per_page).toBe(10);
    });

    it('nên trả về mảng rỗng khi không tìm thấy timesheet', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.findMyTimesheetsPaginated(1, paginationDto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('nên lọc theo khoảng thời gian', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        start_date: '2024-10-01',
        end_date: '2024-10-31',
      };

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      prismaService.time_sheets.count.mockResolvedValue(1);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);

      await service.findMyTimesheetsPaginated(1, paginationDto);

      expect(prismaService.time_sheets.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 1,
            deleted_at: null,
          }),
        }),
      );
    });
  });

  describe('findTimesheetById - Tìm timesheet theo id', () => {
    it('nên trả về timesheet theo id', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);

      const result = await service.findTimesheetById(1);

      expect(prismaService.time_sheets.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(result).toEqual(mockTimesheet);
    });

    it('nên throw NotFoundException khi không tìm thấy timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await expect(service.findTimesheetById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findTimesheetById(999)).rejects.toThrow('Không tìm thấy timesheet');
    });
  });

  describe('removeTimesheet - Xóa timesheet', () => {
    it('nên xóa mềm timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.time_sheets.update.mockResolvedValue({
        ...mockTimesheet,
        deleted_at: new Date(),
      });

      const result = await service.removeTimesheet(1);

      expect(prismaService.time_sheets.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted_at: expect.any(Date) },
      });
      expect(result.deleted_at).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await expect(service.removeTimesheet(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerFace - Đăng ký khuôn mặt', () => {
    it('nên đăng ký khuôn mặt thành công', async () => {
      const photoUrl = 'https://cloudinary.com/image.jpg';
      const userWithFace = {
        ...mockUser,
        register_face_url: null,
      };

      prismaService.users.findFirst.mockResolvedValue(userWithFace);
      uploadService.validateCloudinaryUrl.mockReturnValue(true);
      prismaService.users.update.mockResolvedValue({
        ...userWithFace,
        register_face_url: photoUrl,
        register_face_at: new Date(),
      });

      const result = await service.registerFace(1, photoUrl);

      expect(prismaService.users.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(uploadService.validateCloudinaryUrl).toHaveBeenCalledWith(photoUrl);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Đăng ký khuôn mặt thành công');
    });

    it('nên throw NotFoundException khi không tìm thấy user', async () => {
      prismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.registerFace(999, 'https://cloudinary.com/image.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên throw BadRequestException khi URL ảnh không hợp lệ', async () => {
      prismaService.users.findFirst.mockResolvedValue(mockUser);
      uploadService.validateCloudinaryUrl.mockReturnValue(false);

      await expect(service.registerFace(1, 'invalid-url')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkin - Check-in', () => {
    const checkinDto: CheckinDto = {
      photo_url: 'https://cloudinary.com/checkin.jpg',
    };

    it('nên check-in thành công', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkinTime = new Date();

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: true,
        is_office_network: true,
        has_approved_remote_request: false,
        message: 'IP hợp lệ',
      });
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.holidays.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.create.mockResolvedValue({
        ...mockTimesheet,
        work_date: new Date(today),
        checkin: checkinTime,
      });
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        action_type: 'checkin',
        timestamp: checkinTime,
      });
      prismaService.time_sheets.update.mockResolvedValue({
        ...mockTimesheet,
        checkin: checkinTime,
      });

      const result = await service.checkin(1, checkinDto);

      expect(ipValidationService.validateIpForAttendance).toHaveBeenCalled();
      expect(prismaService.attendance_logs.create).toHaveBeenCalled();
      expect(result.message).toBe('Check-in thành công');
    });

    it('nên throw lỗi khi đã check-in rồi', async () => {
      const today = new Date().toISOString().split('T')[0];
      const existingCheckin = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        work_date: new Date(today),
      };

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: true,
        is_office_network: true,
        has_approved_remote_request: false,
        message: 'IP hợp lệ',
      });
      prismaService.attendance_logs.findFirst.mockResolvedValue(existingCheckin);

      await expect(service.checkin(1, checkinDto)).rejects.toThrow(BadRequestException);
      await expect(service.checkin(1, checkinDto)).rejects.toThrow(
        'Bạn đã check-in hôm nay rồi',
      );
    });

    it('nên throw lỗi khi thiếu photo_url', async () => {
      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: true,
        is_office_network: true,
        has_approved_remote_request: false,
        message: 'IP hợp lệ',
      });
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);

      await expect(service.checkin(1, {} as CheckinDto)).rejects.toThrow(BadRequestException);
      await expect(service.checkin(1, {} as CheckinDto)).rejects.toThrow(
        'Thiếu photo_url sau khi xác thực ảnh',
      );
    });
  });

  describe('checkout - Check-out', () => {
    const checkoutDto: CheckoutDto = {
      photo_url: 'https://cloudinary.com/checkout.jpg',
    };

    it('nên check-out thành công', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkoutTime = new Date();
      const checkinTime = new Date();
      checkinTime.setHours(8, 0, 0, 0);

      const existingCheckin = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        work_date: new Date(today),
        timestamp: checkinTime,
      };

      const todayTimesheet = {
        ...mockTimesheet,
        work_date: new Date(today),
        checkin: checkinTime,
        checkout: null,
      };

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: true,
        is_office_network: true,
        has_approved_remote_request: false,
        message: 'IP hợp lệ',
      });
      prismaService.attendance_logs.findFirst
        .mockResolvedValueOnce(existingCheckin)
        .mockResolvedValueOnce(null);
      prismaService.time_sheets.findFirst.mockResolvedValue(todayTimesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 2,
        action_type: 'checkout',
        timestamp: checkoutTime,
      });
      prismaService.time_sheets.update.mockResolvedValue({
        ...todayTimesheet,
        checkout: checkoutTime,
        total_work_time: 480,
        is_complete: true,
      });

      const result = await service.checkout(1, checkoutDto);

      expect(prismaService.attendance_logs.create).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('nên throw lỗi khi chưa check-in', async () => {
      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: true,
        is_office_network: true,
        has_approved_remote_request: false,
        message: 'IP hợp lệ',
      });
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);

      await expect(service.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTodayAttendance - Lấy thông tin chấm công hôm nay', () => {
    it('nên trả về thông tin chấm công hôm nay', async () => {
      const today = new Date().toISOString().split('T')[0];

      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);

      const result = await service.getTodayAttendance(1);

      expect(prismaService.time_sheets.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          work_date: new Date(today),
          deleted_at: null,
        },
      });
      expect(result).toEqual(mockTimesheet);
    });

    it('nên trả về null khi chưa có chấm công hôm nay', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      const result = await service.getTodayAttendance(1);

      expect(result).toBeNull();
    });
  });

  describe('createDailyTimesheet - Tạo timesheet hàng ngày', () => {
    it('nên tạo timesheet hàng ngày thành công', async () => {
      const workDate = '2024-10-29';
      const targetDate = new Date(workDate);

      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.create.mockResolvedValue({
        ...mockTimesheet,
        work_date: targetDate,
        type: 'NORMAL',
      });

      const result = await service.createDailyTimesheet(1, workDate);

      expect(prismaService.time_sheets.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          work_date: targetDate,
          deleted_at: null,
        },
      });
      expect(prismaService.time_sheets.create).toHaveBeenCalledWith({
        data: {
          user_id: 1,
          work_date: targetDate,
          type: 'NORMAL',
        },
      });
      expect(result.type).toBe('NORMAL');
    });

    it('nên throw BadRequestException khi timesheet đã tồn tại', async () => {
      const workDate = '2024-10-29';

      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);

      await expect(service.createDailyTimesheet(1, workDate)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createDailyTimesheet(1, workDate)).rejects.toThrow(
        TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS,
      );
    });
  });

  describe('getRequestQuota - Lấy quota request', () => {
    it('nên trả về quota request', async () => {
      const now = new Date();
      const leaveBalance = {
        user_id: 1,
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
        last_reset_date: new Date('2024-09-30'),
      };

      prismaService.user_leave_balances.findUnique.mockResolvedValue(leaveBalance);
      attendanceRequestService.findMany
        .mockResolvedValueOnce([]) // forgot checkin requests
        .mockResolvedValueOnce([]); // late early requests

      const result = await service.getRequestQuota(1);

      expect(result.forgot_checkin.quota).toBe(3);
      expect(result.late_early.count_quota).toBe(3);
      expect(result.late_early.minutes_quota).toBe(120);
      expect(result.month).toBe(now.getMonth() + 1);
      expect(result.year).toBe(now.getFullYear());
    });
  });

  describe('getLateEarlyBalance - Lấy số phút đi muộn/về sớm', () => {
    it('nên trả về số phút đi muộn/về sớm đã được duyệt', async () => {
      const now = new Date();
      const approvedRequests = [
        {
          id: 1,
          late_early_request: {
            late_minutes: 30,
            early_minutes: 0,
          },
        },
        {
          id: 2,
          late_early_request: {
            late_minutes: 0,
            early_minutes: 15,
          },
        },
      ];

      attendanceRequestService.findMany.mockResolvedValue(approvedRequests);

      const result = await service.getLateEarlyBalance(1);

      expect(result.used_late_minutes).toBe(30);
      expect(result.used_early_minutes).toBe(15);
      expect(result.used_minutes).toBe(45);
      expect(result.month).toBe(now.getMonth() + 1);
      expect(result.year).toBe(now.getFullYear());
    });
  });
});
