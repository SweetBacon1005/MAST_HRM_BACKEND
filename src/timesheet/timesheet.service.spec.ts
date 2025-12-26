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

    it('nên throw BadRequestException khi không có openSession', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkinTime = new Date();
      checkinTime.setHours(8, 0, 0, 0);

      const existingCheckin = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        work_date: new Date(today),
        timestamp: checkinTime,
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

      await expect(service.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
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

  describe('updateTimesheetCompleteStatus - Cập nhật trạng thái hoàn thành', () => {
    it('nên cập nhật is_complete thành true khi total_work_time >= requiredWorkTime', async () => {
      const timesheetId = 1;
      const timesheet = {
        id: timesheetId,
        total_work_time: 480,
        deleted_at: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.time_sheets.update.mockResolvedValue({
        ...timesheet,
        is_complete: true,
      });

      await service.updateTimesheetCompleteStatus(timesheetId);

      expect(prismaService.time_sheets.update).toHaveBeenCalledWith({
        where: { id: timesheetId },
        data: { is_complete: true },
      });
    });

    it('nên cập nhật is_complete thành false khi total_work_time < requiredWorkTime', async () => {
      const timesheetId = 1;
      const timesheet = {
        id: timesheetId,
        total_work_time: 200,
        deleted_at: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.time_sheets.update.mockResolvedValue({
        ...timesheet,
        is_complete: false,
      });

      await service.updateTimesheetCompleteStatus(timesheetId);

      expect(prismaService.time_sheets.update).toHaveBeenCalledWith({
        where: { id: timesheetId },
        data: { is_complete: false },
      });
    });

    it('nên return sớm khi không tìm thấy timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await service.updateTimesheetCompleteStatus(999);

      expect(prismaService.time_sheets.update).not.toHaveBeenCalled();
    });

    it('nên tính toán requiredWorkTime dựa trên day off và late/early requests', async () => {
      const timesheetId = 1;
      const timesheet = {
        id: timesheetId,
        total_work_time: 240,
        deleted_at: null,
      };

      const approvedRequests = [
        {
          day_off: { duration: 'MORNING' },
          late_early_request: null,
        },
        {
          day_off: null,
          late_early_request: { late_minutes: 30, early_minutes: 0 },
        },
      ];

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue(approvedRequests);
      prismaService.time_sheets.update.mockResolvedValue({
        ...timesheet,
        is_complete: false,
      });

      await service.updateTimesheetCompleteStatus(timesheetId);

      expect(prismaService.attendance_requests.findMany).toHaveBeenCalled();
      expect(prismaService.time_sheets.update).toHaveBeenCalled();
    });
  });

  describe('updateTimesheet - Cập nhật timesheet', () => {
    it('nên cập nhật timesheet thành công', async () => {
      const updateDto = {
        checkin: '2024-10-29T08:00:00.000Z',
        checkout: '2024-10-29T17:00:00.000Z',
        is_complete: true,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.time_sheets.update.mockResolvedValue({
        ...mockTimesheet,
        ...updateDto,
      });

      const result = await service.updateTimesheet(1, updateDto);

      expect(prismaService.time_sheets.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(prismaService.time_sheets.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await expect(service.updateTimesheet(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllTimesheets - Lấy tất cả timesheet', () => {
    it('nên trả về danh sách timesheet không có date range', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);

      const result = await service.findAllTimesheets(1);

      expect(prismaService.time_sheets.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          deleted_at: null,
        },
        orderBy: { work_date: 'desc' },
      });
      expect(result).toEqual([mockTimesheet]);
    });

    it('nên trả về danh sách timesheet với date range', async () => {
      const startDate = '2024-10-01';
      const endDate = '2024-10-31';

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);

      const result = await service.findAllTimesheets(1, startDate, endDate);

      expect(prismaService.time_sheets.findMany).toHaveBeenCalled();
      expect(result).toEqual([mockTimesheet]);
    });
  });

  describe('getDayOffInfo - Lấy thông tin nghỉ phép', () => {
    it('nên trả về thông tin khi không có day off', async () => {
      const workDate = '2024-10-29';

      attendanceRequestService.findMany.mockResolvedValue([]);

      const result = await service.getDayOffInfo(1, workDate);

      expect(result.hasDayOff).toBe(false);
      expect(result.needsAttendance).toBe(true);
      expect(result.expectedWorkHours.totalHours).toBe(8 * 60);
    });

    it('nên trả về thông tin khi có day off FULL_DAY', async () => {
      const workDate = '2024-10-29';
      const dayOffRequests = [
        {
          day_off: {
            duration: 'FULL_DAY',
            type: 'PAID',
          },
        },
      ];

      attendanceRequestService.findMany.mockResolvedValue(dayOffRequests);

      const result = await service.getDayOffInfo(1, workDate);

      expect(result.hasDayOff).toBe(true);
      expect(result.needsAttendance).toBe(false);
      expect(result.dayOff).toBeDefined();
    });

    it('nên trả về thông tin khi có day off MORNING', async () => {
      const workDate = '2024-10-29';
      const dayOffRequests = [
        {
          day_off: {
            duration: 'MORNING',
            type: 'PAID',
          },
        },
      ];

      attendanceRequestService.findMany.mockResolvedValue(dayOffRequests);

      const result = await service.getDayOffInfo(1, workDate);

      expect(result.hasDayOff).toBe(true);
      expect(result.needsAttendance).toBe(true);
      expect(result.expectedWorkHours.morningHours).toBe(0);
      expect(result.expectedWorkHours.afternoonHours).toBe(4 * 60);
    });
  });

  describe('getPersonalSchedule - Lấy lịch cá nhân', () => {
    it('nên trả về lịch cá nhân với timesheets, dayOffs, overtimes, holidays', async () => {
      const getScheduleDto = {
        start_date: '2024-10-01',
        end_date: '2024-10-31',
      };

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      attendanceRequestService.findMany
        .mockResolvedValueOnce([]) // day off requests
        .mockResolvedValueOnce([]); // overtime requests
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getPersonalSchedule(1, getScheduleDto);

      expect(result.timesheets).toBeDefined();
      expect(result.dayOffs).toBeDefined();
      expect(result.overtimes).toBeDefined();
      expect(result.holidays).toBeDefined();
    });

    it('nên sử dụng default dates khi không cung cấp', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      attendanceRequestService.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getPersonalSchedule(1, {});

      expect(result).toBeDefined();
    });
  });

  describe('getTeamSchedule - Lấy lịch team', () => {
    it('nên trả về lịch team với teamMembers, timesheets, dayOffs, holidays', async () => {
      const getScheduleDto = {
        start_date: '2024-10-01',
        end_date: '2024-10-31',
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 1 },
        { user_id: 2 },
      ]);
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      attendanceRequestService.findMany.mockResolvedValue([]);
      prismaService.users.findMany.mockResolvedValue([
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' },
      ]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTeamSchedule(1, getScheduleDto);

      expect(result.teamMembers).toBeDefined();
      expect(result.timesheets).toBeDefined();
      expect(result.dayOffs).toBeDefined();
      expect(result.holidays).toBeDefined();
    });
  });

  describe('getTimesheetNotifications - Lấy thông báo timesheet', () => {
    it('nên trả về thông báo khi chưa check-in', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      attendanceRequestService.count.mockResolvedValue(0);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.getTimesheetNotifications(1);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('warning');
      expect(result[0].message).toBe('Bạn chưa check-in hôm nay');
    });

    it('nên trả về thông báo khi chưa check-out', async () => {
      const todayCheckin = {
        ...mockTimesheet,
        checkin: new Date(),
        checkout: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(todayCheckin);
      attendanceRequestService.count.mockResolvedValue(0);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.getTimesheetNotifications(1);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('info');
      expect(result[0].message).toBe('Đừng quên check-out khi kết thúc làm việc');
    });

    it('nên trả về thông báo khi có đơn nghỉ phép chờ duyệt', async () => {
      const todayCheckin = {
        ...mockTimesheet,
        checkin: new Date(),
        checkout: new Date(),
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(todayCheckin);
      attendanceRequestService.count.mockResolvedValue(2);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.getTimesheetNotifications(1);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('info');
      expect(result[0].message).toContain('đơn nghỉ phép chờ duyệt');
    });
  });

  describe('getTimesheetReport - Lấy báo cáo timesheet', () => {
    it('nên trả về báo cáo timesheet với team_id', async () => {
      const reportDto = {
        start_date: '2024-10-01',
        end_date: '2024-10-31',
        team_id: 1,
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([{ user_id: 1 }]);
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      prismaService.users.findMany.mockResolvedValue([mockUser]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result.timesheets).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.holidays).toBeDefined();
    });

    it('nên trả về báo cáo timesheet với division_id', async () => {
      const reportDto = {
        start_date: '2024-10-01',
        end_date: '2024-10-31',
        division_id: 1,
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([{ user_id: 1 }]);
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      prismaService.users.findMany.mockResolvedValue([mockUser]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result).toBeDefined();
    });

    it('nên sử dụng default dates khi không cung cấp', async () => {
      const reportDto = {};

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result).toBeDefined();
    });
  });

  describe('getWorkingTimeReport - Lấy báo cáo thời gian làm việc', () => {
    it('nên trả về báo cáo thời gian làm việc theo tháng', async () => {
      const reportDto = {
        month: '2024-10',
        year: 2024,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result.period).toBe('2024-10');
      expect(result.user_stats).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('nên trả về báo cáo với user_id cụ thể', async () => {
      const reportDto = {
        month: '2024-10',
        year: 2024,
        user_id: 1,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
    });
  });

  describe('getAllUsersAttendanceStatistics - Lấy thống kê chấm công tất cả users', () => {
    it('nên trả về thống kê chấm công với default dates', async () => {
      const mockTimesheetWithUser = {
        ...mockTimesheet,
        user: {
          id: 1,
          email: 'test@example.com',
          user_information: {
            name: 'Test User',
          },
        },
      };

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheetWithUser]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics();

      expect(result.period).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.employees).toBeDefined();
      expect(result.holidays).toBeDefined();
    });

    it('nên trả về thống kê với custom dates', async () => {
      const startDate = '2024-10-01';
      const endDate = '2024-10-31';

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics(startDate, endDate);

      expect(result.period.start_date).toBe(startDate);
      expect(result.period.end_date).toBe(endDate);
    });
  });

  describe('getAttendanceStatistics - Lấy thống kê chấm công', () => {
    it('nên trả về thống kê chấm công không có user_id', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      attendanceRequestService.findMany
        .mockResolvedValueOnce([]) // overtime requests
        .mockResolvedValueOnce([]); // day off requests
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAttendanceStatistics();

      expect(result.period).toBeDefined();
      expect(result.attendance).toBeDefined();
      expect(result.overtime).toBeDefined();
      expect(result.leave).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('nên trả về thống kê chấm công với user_id', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      attendanceRequestService.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.user_leave_balances.findUnique.mockResolvedValue(null);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAttendanceStatistics(1);

      expect(result).toBeDefined();
    });
  });

  describe('createAttendanceLog - Tạo log chấm công', () => {
    it('nên tạo attendance log thành công', async () => {
      const createDto = {
        action_type: 'checkin',
        timestamp: '2024-10-29T08:00:00.000Z',
        work_date: '2024-10-29',
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        ...createDto,
        user_id: 1,
        timesheet_id: 1,
      });

      const result = await service.createAttendanceLog(createDto, 1);

      expect(prismaService.attendance_logs.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên tạo timesheet mới nếu chưa có', async () => {
      const createDto = {
        action_type: 'checkin',
        timestamp: '2024-10-29T08:00:00.000Z',
        work_date: '2024-10-29',
      };

      prismaService.time_sheets.findFirst
        .mockResolvedValueOnce(null) // không tìm thấy timesheet
        .mockResolvedValueOnce(mockTimesheet); // sau khi tạo
      prismaService.time_sheets.create.mockResolvedValue(mockTimesheet);
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        ...createDto,
        user_id: 1,
        timesheet_id: 1,
      });

      const result = await service.createAttendanceLog(createDto, 1);

      expect(prismaService.time_sheets.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi timesheet_id không tồn tại', async () => {
      const createDto = {
        action_type: 'checkin',
        timestamp: '2024-10-29T08:00:00.000Z',
        work_date: '2024-10-29',
        timesheet_id: 999,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await expect(service.createAttendanceLog(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên throw BadRequestException khi timesheet không thuộc về user', async () => {
      const createDto = {
        action_type: 'checkin',
        timestamp: '2024-10-29T08:00:00.000Z',
        work_date: '2024-10-29',
        timesheet_id: 1,
      };

      const otherUserTimesheet = {
        ...mockTimesheet,
        user_id: 2,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(otherUserTimesheet);

      await expect(service.createAttendanceLog(createDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi work_date không khớp với timesheet', async () => {
      const createDto = {
        action_type: 'checkin',
        timestamp: '2024-10-29T08:00:00.000Z',
        work_date: '2024-10-30',
        timesheet_id: 1,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);

      await expect(service.createAttendanceLog(createDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAttendanceLogs - Lấy danh sách log chấm công', () => {
    it('nên trả về danh sách log của user hiện tại', async () => {
      const queryDto = {
        page: 1,
        limit: 20,
      };

      const mockLogs = [
        {
          id: 1,
          action_type: 'checkin',
          timestamp: new Date(),
          user: { id: 1, email: 'test@example.com' },
          timesheet: { id: 1, work_date: new Date() },
        },
      ];

      prismaService.attendance_logs.findMany.mockResolvedValue(mockLogs);
      prismaService.attendance_logs.count.mockResolvedValue(1);

      const result = await service.getAttendanceLogs(1, queryDto);

      expect(result.data).toEqual(mockLogs);
      expect(result.pagination.total).toBe(1);
    });

    it('nên throw BadRequestException khi user không có quyền xem log của user khác', async () => {
      const queryDto = {
        user_id: 2,
        page: 1,
        limit: 20,
      };

      await expect(service.getAttendanceLogs(1, queryDto, [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên cho phép xem log của user khác khi có quyền admin', async () => {
      const queryDto = {
        user_id: 2,
        page: 1,
        limit: 20,
      };

      const mockLogs = [
        {
          id: 1,
          action_type: 'checkin',
          user: { id: 2, email: 'other@example.com' },
          timesheet: { id: 1, work_date: new Date() },
        },
      ];

      prismaService.attendance_logs.findMany.mockResolvedValue(mockLogs);
      prismaService.attendance_logs.count.mockResolvedValue(1);

      const result = await service.getAttendanceLogs(1, queryDto, ['admin']);

      expect(result.data).toEqual(mockLogs);
    });

    it('nên lọc theo date range', async () => {
      const queryDto = {
        start_date: '2024-10-01',
        end_date: '2024-10-31',
        page: 1,
        limit: 20,
      };

      prismaService.attendance_logs.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.count.mockResolvedValue(0);

      await service.getAttendanceLogs(1, queryDto);

      expect(prismaService.attendance_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            work_date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('nên lọc theo action_type', async () => {
      const queryDto = {
        action_type: 'checkin',
        page: 1,
        limit: 20,
      };

      prismaService.attendance_logs.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.count.mockResolvedValue(0);

      await service.getAttendanceLogs(1, queryDto);

      expect(prismaService.attendance_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action_type: 'checkin',
          }),
        }),
      );
    });
  });

  describe('getAttendanceLogsPaginated - Lấy danh sách log có phân trang', () => {
    it('nên trả về danh sách log có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const mockLogs = [
        {
          id: 1,
          action_type: 'checkin',
          user: { id: 1, email: 'test@example.com' },
          timesheet: { id: 1, work_date: new Date() },
        },
      ];

      prismaService.attendance_logs.findMany.mockResolvedValue(mockLogs);
      prismaService.attendance_logs.count.mockResolvedValue(1);

      const result = await service.getAttendanceLogsPaginated(1, paginationDto);

      expect(result.data).toEqual(mockLogs);
      expect(result.pagination.total).toBe(1);
    });

    it('nên throw BadRequestException khi không có quyền xem log của user khác', async () => {
      const paginationDto = {
        user_id: 2,
        page: 1,
        limit: 10,
      };

      await expect(
        service.getAttendanceLogsPaginated(1, paginationDto, false),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAttendanceLogById - Lấy log theo id', () => {
    it('nên trả về log theo id', async () => {
      const mockLog = {
        id: 1,
        action_type: 'checkin',
        user: { id: 1, email: 'test@example.com' },
        timesheet: { id: 1, work_date: new Date() },
      };

      prismaService.attendance_logs.findFirst.mockResolvedValue(mockLog);

      const result = await service.getAttendanceLogById(1);

      expect(prismaService.attendance_logs.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockLog);
    });

    it('nên throw NotFoundException khi không tìm thấy log', async () => {
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);

      await expect(service.getAttendanceLogById(999)).rejects.toThrow(NotFoundException);
      await expect(service.getAttendanceLogById(999)).rejects.toThrow(
        'Không tìm thấy log chấm công',
      );
    });
  });

  describe('updateAttendanceLog - Cập nhật log chấm công', () => {
    it('nên cập nhật log thành công', async () => {
      const updateDto = {
        user_id: 1,
        action_type: 'checkout',
        timestamp: '2024-10-29T17:00:00.000Z',
      };

      const mockLog = {
        id: 1,
        action_type: 'checkin',
        user_id: 1,
      };

      prismaService.attendance_logs.findFirst.mockResolvedValue(mockLog);
      prismaService.attendance_logs.update.mockResolvedValue({
        ...mockLog,
        ...updateDto,
      });

      const result = await service.updateAttendanceLog(1, updateDto);

      expect(prismaService.attendance_logs.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy log', async () => {
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);

      await expect(service.updateAttendanceLog(999, { user_id: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAttendanceLog - Xóa log chấm công', () => {
    it('nên xóa mềm log thành công', async () => {
      const mockLog = {
        id: 1,
        action_type: 'checkin',
        deleted_at: null,
      };

      prismaService.attendance_logs.findFirst.mockResolvedValue(mockLog);
      prismaService.attendance_logs.update.mockResolvedValue({
        ...mockLog,
        deleted_at: new Date(),
      });

      const result = await service.deleteAttendanceLog(1);

      expect(prismaService.attendance_logs.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted_at: expect.any(Date) },
      });
      expect(result.deleted_at).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy log', async () => {
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);

      await expect(service.deleteAttendanceLog(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateRequestQuota - Validate quota request', () => {
    it('nên throw BadRequestException khi vượt quota forgot_checkin', async () => {
      const leaveBalance = {
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      };

      prismaService.user_leave_balances.findUnique.mockResolvedValue(leaveBalance);
      attendanceRequestService.findMany.mockResolvedValue([
        { status: 'PENDING' },
        { status: 'APPROVED' },
        { status: 'PENDING' },
        { status: 'APPROVED' },
      ]);

      await expect(service.validateRequestQuota(1, 'forgot_checkin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi vượt quota số lượng late_early', async () => {
      const leaveBalance = {
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      };

      prismaService.user_leave_balances.findUnique.mockResolvedValue(leaveBalance);
      attendanceRequestService.findMany.mockResolvedValue([
        { status: 'PENDING', late_early_request: { late_minutes: 10 } },
        { status: 'APPROVED', late_early_request: { late_minutes: 20 } },
        { status: 'PENDING', late_early_request: { late_minutes: 30 } },
        { status: 'APPROVED', late_early_request: { late_minutes: 40 } },
      ]);

      await expect(service.validateRequestQuota(1, 'late_early', 50)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi vượt quota phút late_early', async () => {
      const leaveBalance = {
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      };

      prismaService.user_leave_balances.findUnique.mockResolvedValue(leaveBalance);
      attendanceRequestService.findMany.mockResolvedValue([
        { status: 'APPROVED', late_early_request: { late_minutes: 100, early_minutes: 0 } },
      ]);

      await expect(service.validateRequestQuota(1, 'late_early', 30)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên không throw khi quota còn đủ', async () => {
      const leaveBalance = {
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      };

      prismaService.user_leave_balances.findUnique.mockResolvedValue(leaveBalance);
      attendanceRequestService.findMany.mockResolvedValue([
        { status: 'APPROVED', late_early_request: { late_minutes: 50, early_minutes: 0 } },
      ]);

      await expect(service.validateRequestQuota(1, 'late_early', 30)).resolves.not.toThrow();
    });
  });

  describe('checkin - Edge cases', () => {
    it('nên throw BadRequestException khi IP không hợp lệ', async () => {
      const checkinDto: CheckinDto = {
        photo_url: 'https://cloudinary.com/checkin.jpg',
      };

      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: false,
        message: 'IP không hợp lệ',
      });

      await expect(service.checkin(1, checkinDto)).rejects.toThrow(BadRequestException);
    });

    it('nên tạo timesheet HOLIDAY khi là ngày lễ', async () => {
      const checkinDto: CheckinDto = {
        photo_url: 'https://cloudinary.com/checkin.jpg',
      };

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: true,
        is_office_network: true,
        has_approved_remote_request: false,
        message: 'IP hợp lệ',
      });
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.holidays.findFirst.mockResolvedValue({
        id: 1,
        name: 'Ngày lễ',
        status: HolidayStatus.ACTIVE,
      });
      prismaService.time_sheets.create.mockResolvedValue({
        ...mockTimesheet,
        type: 'HOLIDAY',
      });
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        action_type: 'checkin',
      });
      prismaService.time_sheets.update.mockResolvedValue(mockTimesheet);

      const result = await service.checkin(1, checkinDto);

      expect(result).toBeDefined();
    });

    it('nên xử lý remote work request khi check-in', async () => {
      const checkinDto: CheckinDto = {
        photo_url: 'https://cloudinary.com/checkin.jpg',
      };

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: true,
        is_office_network: false,
        has_approved_remote_request: true,
        message: 'IP hợp lệ',
      });
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.holidays.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.create.mockResolvedValue({
        ...mockTimesheet,
        remote: 'REMOTE',
      });
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        action_type: 'checkin',
      });
      prismaService.time_sheets.update.mockResolvedValue({
        ...mockTimesheet,
        remote: 'REMOTE',
      });

      const result = await service.checkin(1, checkinDto);

      expect(result.timesheet.remote).toBe('REMOTE');
    });
  });

  describe('checkout - Edge cases', () => {
    it('nên throw BadRequestException khi đã checkout rồi', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkoutDto: CheckoutDto = {
        photo_url: 'https://cloudinary.com/checkout.jpg',
      };

      const existingCheckin = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        work_date: new Date(today),
      };

      const existingCheckout = {
        id: 2,
        user_id: 1,
        action_type: 'checkout',
        work_date: new Date(today),
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
        .mockResolvedValueOnce(existingCheckout);

      await expect(service.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });

    it('nên tính toán is_complete dựa trên requiredWorkTime', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkoutTime = new Date();
      checkoutTime.setHours(17, 30, 0, 0);
      const checkinTime = new Date();
      checkinTime.setHours(8, 30, 0, 0);

      const checkoutDto: CheckoutDto = {
        photo_url: 'https://cloudinary.com/checkout.jpg',
      };

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
      });
      prismaService.time_sheets.update.mockResolvedValue({
        ...todayTimesheet,
        checkout: checkoutTime,
        total_work_time: 480,
        is_complete: true,
      });

      const result = await service.checkout(1, checkoutDto);

      expect(result.timesheet.is_complete).toBe(true);
    });
  });

  describe('createTimesheet - Edge cases', () => {
    it('nên throw BadRequestException khi có day off FULL_DAY không cần attendance', async () => {
      const createTimesheetDto: CreateTimesheetDto = {
        work_date: '2024-10-29',
      };

      const dayOffRequests = [
        {
          day_off: {
            duration: 'FULL_DAY',
            type: 'PAID',
          },
        },
      ];

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      attendanceRequestService.findMany.mockResolvedValue(dayOffRequests);

      await expect(service.createTimesheet(createTimesheetDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên cho phép tạo timesheet khi có day off MORNING cần attendance', async () => {
      const createTimesheetDto: CreateTimesheetDto = {
        work_date: '2024-10-29',
      };

      const dayOffRequests = [
        {
          day_off: {
            duration: 'MORNING',
            type: 'PAID',
          },
        },
      ];

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      attendanceRequestService.findMany.mockResolvedValue(dayOffRequests);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.holidays.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.create.mockResolvedValue(mockTimesheet);

      const result = await service.createTimesheet(createTimesheetDto, 1);

      expect(result).toBeDefined();
    });
  });
});
