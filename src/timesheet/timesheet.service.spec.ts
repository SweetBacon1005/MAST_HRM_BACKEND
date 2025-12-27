import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { TimesheetService } from './timesheet.service';
import { PrismaService } from '../database/prisma.service';
import { ip_validationService } from '../common/services/ip-validation.service';
import { UploadService } from '../upload/upload.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { TIMESHEET_ERRORS, USER_ERRORS } from '../common/constants/error-messages.constants';
import { HolidayStatus, HolidayType } from '@prisma/client';

describe('TimesheetService', () => {
  let service: TimesheetService;
  let prismaService: any;
  let ipValidationService: any;
  let uploadService: any;

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
        findMany: jest.fn(),
        update: jest.fn(),
      },
      holidays: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
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
        findFirst: jest.fn(),
      },
      user_leave_balances: {
        findUnique: jest.fn(),
      },
      user_role_assignment: {
        findMany: jest.fn(),
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
        { provide: ConfigService, useValue: mockConfigService },
        { provide: REQUEST, useValue: mockRequest },
      ],
    }).compile();

    service = module.get<TimesheetService>(TimesheetService);
    prismaService = module.get(PrismaService);
    ipValidationService = module.get(ip_validationService);
    uploadService = module.get(UploadService);
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
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
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
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
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
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
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

      prismaService.time_sheets.findMany
        .mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValueOnce([]); // attendance_requests
      prismaService.time_sheets.count.mockResolvedValue(1);

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


      const result = await service.getLateEarlyBalance(1);

      expect(result.used_late_minutes).toBe(30);
      expect(result.used_early_minutes).toBe(15);
      expect(result.used_minutes).toBe(45);
      expect(result.month).toBe(now.getMonth() + 1);
      expect(result.year).toBe(now.getFullYear());
    });
  });

  describe('updateTimesheet - Cập nhật timesheet', () => {
    const updateTimesheetDto = {
      checkin: '2024-10-29T08:00:00.000Z',
      checkout: '2024-10-29T17:00:00.000Z',
      is_complete: true,
    };

    it('nên cập nhật timesheet thành công', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.time_sheets.update.mockResolvedValue({
        ...mockTimesheet,
        ...updateTimesheetDto,
      });

      const result = await service.updateTimesheet(1, updateTimesheetDto);

      expect(prismaService.time_sheets.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(prismaService.time_sheets.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await expect(service.updateTimesheet(999, updateTimesheetDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTimesheetCompleteStatus - Cập nhật trạng thái hoàn thành', () => {
    it('nên cập nhật trạng thái hoàn thành khi đủ thời gian làm việc', async () => {
      const timesheetWithEnoughTime = {
        ...mockTimesheet,
        total_work_time: 480,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheetWithEnoughTime);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.time_sheets.update.mockResolvedValue({
        ...timesheetWithEnoughTime,
        is_complete: true,
      });

      await service.updateTimesheetCompleteStatus(1);

      expect(prismaService.time_sheets.findFirst).toHaveBeenCalled();
      expect(prismaService.time_sheets.update).toHaveBeenCalled();
    });

    it('nên không làm gì khi không tìm thấy timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await service.updateTimesheetCompleteStatus(999);

      expect(prismaService.time_sheets.update).not.toHaveBeenCalled();
    });
  });

  describe('findAllTimesheets - Lấy tất cả timesheet', () => {
    it('nên trả về danh sách timesheet', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);

      const result = await service.findAllTimesheets(1);

      expect(prismaService.time_sheets.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('nên lọc theo khoảng thời gian', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);

      await service.findAllTimesheets(1, '2024-10-01', '2024-10-31');

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

  describe('getDayOffInfo - Lấy thông tin nghỉ phép', () => {
    it('nên trả về thông tin khi không có nghỉ phép', async () => {
      prismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getDayOffInfo(1, '2024-10-29');

      expect(result.hasDayOff).toBe(false);
      expect(result.needsAttendance).toBe(true);
      expect(result.expectedWorkHours.totalHours).toBe(480);
    });

    it('nên trả về thông tin khi có nghỉ phép FULL_DAY', async () => {
      const dayOffRequest = {
        day_off: {
          duration: 'FULL_DAY',
        },
      };

      prismaService.attendance_requests.findMany.mockResolvedValue([dayOffRequest]);

      const result = await service.getDayOffInfo(1, '2024-10-29');

      expect(result.hasDayOff).toBe(true);
      expect(result.needsAttendance).toBe(false);
    });

    it('nên trả về thông tin khi có nghỉ phép MORNING', async () => {
      const dayOffRequest = {
        day_off: {
          duration: 'MORNING',
        },
      };

      prismaService.attendance_requests.findMany.mockResolvedValue([dayOffRequest]);

      const result = await service.getDayOffInfo(1, '2024-10-29');

      expect(result.hasDayOff).toBe(true);
      expect(result.needsAttendance).toBe(true);
    });
  });

  describe('createHoliday - Tạo ngày lễ', () => {
    const createHolidayDto = {
      name: 'Ngày lễ mới',
      type: HolidayType.NATIONAL,
      start_date: '2024-12-25',
      end_date: '2024-12-25',
      status: HolidayStatus.ACTIVE,
    };

    it('nên tạo ngày lễ thành công', async () => {
      prismaService.holidays.findFirst.mockResolvedValue(null);
      prismaService.holidays.create.mockResolvedValue({
        id: 1,
        ...createHolidayDto,
        start_date: new Date(createHolidayDto.start_date),
        end_date: new Date(createHolidayDto.end_date),
      });

      const result = await service.createHoliday(createHolidayDto);

      expect(prismaService.holidays.findFirst).toHaveBeenCalled();
      expect(prismaService.holidays.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw BadRequestException khi tên ngày lễ đã tồn tại', async () => {
      prismaService.holidays.findFirst.mockResolvedValue({
        id: 1,
        name: createHolidayDto.name,
      });

      await expect(service.createHoliday(createHolidayDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllHolidays - Lấy tất cả ngày lễ', () => {
    it('nên trả về danh sách ngày lễ', async () => {
      const mockHolidays = [
        {
          id: 1,
          name: 'Ngày lễ',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-01'),
          status: HolidayStatus.ACTIVE,
        },
      ];

      prismaService.holidays.findMany.mockResolvedValue(mockHolidays);

      const result = await service.findAllHolidays();

      expect(prismaService.holidays.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('nên lọc theo năm', async () => {
      prismaService.holidays.findMany.mockResolvedValue([]);

      await service.findAllHolidays('2024');

      expect(prismaService.holidays.findMany).toHaveBeenCalled();
    });

    it('nên throw BadRequestException khi năm không hợp lệ', async () => {
      await expect(service.findAllHolidays('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createAttendanceLog - Tạo log chấm công', () => {
    const createAttendanceLogDto = {
      timesheet_id: 1,
      action_type: 'checkin',
      timestamp: '2024-10-29T08:00:00.000Z',
      work_date: '2024-10-29',
      photo_url: 'https://cloudinary.com/image.jpg',
    };

    it('nên tạo log chấm công thành công với timesheet_id', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        ...createAttendanceLogDto,
        user_id: 1,
      });

      const result = await service.createAttendanceLog(createAttendanceLogDto, 1);

      expect(prismaService.time_sheets.findFirst).toHaveBeenCalled();
      expect(prismaService.attendance_logs.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy timesheet', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await expect(
        service.createAttendanceLog(createAttendanceLogDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi user không có quyền', async () => {
      const otherUserTimesheet = {
        ...mockTimesheet,
        user_id: 999,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(otherUserTimesheet);

      await expect(
        service.createAttendanceLog(createAttendanceLogDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên tạo timesheet mới khi không có timesheet_id', async () => {
      const createLogDtoWithoutTimesheet = {
        ...createAttendanceLogDto,
        timesheet_id: undefined,
      };

      prismaService.time_sheets.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...mockTimesheet,
        id: 1,
      });
      prismaService.time_sheets.create.mockResolvedValue(mockTimesheet);
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        ...createLogDtoWithoutTimesheet,
        user_id: 1,
        timesheet_id: 1,
      });

      const result = await service.createAttendanceLog(createLogDtoWithoutTimesheet, 1);

      expect(prismaService.time_sheets.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getAttendanceLogs - Lấy danh sách log chấm công', () => {
    const queryDto = {
      user_id: 1,
      start_date: '2024-10-01',
      end_date: '2024-10-31',
      action_type: 'checkin',
      page: 1,
      limit: 20,
    };

    it('nên trả về danh sách log chấm công', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          action_type: 'checkin',
          timestamp: new Date(),
        },
      ];

      prismaService.attendance_logs.findMany.mockResolvedValue(mockLogs);
      prismaService.attendance_logs.count.mockResolvedValue(1);

      const result = await service.getAttendanceLogs(1, queryDto);

      expect(prismaService.attendance_logs.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw BadRequestException khi user không có quyền xem log của user khác', async () => {
      const queryDtoOtherUser = {
        ...queryDto,
        user_id: 999,
      };

      await expect(
        service.getAttendanceLogs(1, queryDtoOtherUser, []),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên cho phép admin xem log của user khác', async () => {
      const queryDtoOtherUser = {
        ...queryDto,
        user_id: 999,
      };

      prismaService.attendance_logs.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.count.mockResolvedValue(0);

      const result = await service.getAttendanceLogs(1, queryDtoOtherUser, ['admin']);

      expect(result).toBeDefined();
    });
  });

  describe('getAttendanceLogById - Lấy log chấm công theo id', () => {
    it('nên trả về log chấm công theo id', async () => {
      const mockLog = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        timestamp: new Date(),
      };

      prismaService.attendance_logs.findFirst.mockResolvedValue(mockLog);

      const result = await service.getAttendanceLogById(1);

      expect(prismaService.attendance_logs.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(result).toEqual(mockLog);
    });

    it('nên throw NotFoundException khi không tìm thấy log', async () => {
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);

      await expect(service.getAttendanceLogById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAttendanceLog - Cập nhật log chấm công', () => {
    const updateDto = {
      user_id: 1,
    };

    it('nên cập nhật log chấm công thành công', async () => {
      const existingLog = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        timestamp: new Date(),
      };

      prismaService.attendance_logs.findFirst.mockResolvedValue(existingLog);
      prismaService.attendance_logs.update.mockResolvedValue({
        ...existingLog,
        ...updateDto,
      });

      const result = await service.updateAttendanceLog(1, updateDto);

      expect(prismaService.attendance_logs.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy log', async () => {
      prismaService.attendance_logs.findFirst.mockResolvedValue(null);

      await expect(service.updateAttendanceLog(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAttendanceLog - Xóa log chấm công', () => {
    it('nên xóa mềm log chấm công', async () => {
      const existingLog = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
      };

      prismaService.attendance_logs.findFirst.mockResolvedValue(existingLog);
      prismaService.attendance_logs.update.mockResolvedValue({
        ...existingLog,
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

  describe('checkout - Check-out edge cases', () => {
    const checkoutDto: CheckoutDto = {
      photo_url: 'https://cloudinary.com/checkout.jpg',
    };

    it('nên throw lỗi khi không tìm thấy timesheet trong transaction', async () => {
      const today = new Date().toISOString().split('T')[0];
      const existingCheckin = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        work_date: new Date(today),
        timestamp: new Date(),
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
      prismaService.time_sheets.findFirst.mockResolvedValue(null);

      await expect(service.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkin - Check-in edge cases', () => {
    const checkinDto: CheckinDto = {
      photo_url: 'https://cloudinary.com/checkin.jpg',
    };

    it('nên throw lỗi khi IP không hợp lệ', async () => {
      prismaService.users.findFirst.mockResolvedValue(mockUser);
      ipValidationService.validateIpForAttendance.mockResolvedValue({
        isValid: false,
        is_office_network: false,
        has_approved_remote_request: false,
        message: 'IP không hợp lệ',
      });

      await expect(service.checkin(1, checkinDto)).rejects.toThrow(BadRequestException);
    });

    it('nên xử lý remote work request', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkinTime = new Date();

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
        work_date: new Date(today),
        checkin: checkinTime,
        remote: 'REMOTE',
      });
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 1,
        action_type: 'checkin',
        timestamp: checkinTime,
      });
      prismaService.time_sheets.update.mockResolvedValue({
        ...mockTimesheet,
        checkin: checkinTime,
        remote: 'REMOTE',
      });

      const result = await service.checkin(1, checkinDto);

      expect(result.message).toBe('Check-in thành công');
    });
  });

  describe('checkout - Check-out success cases', () => {
    const checkoutDto: CheckoutDto = {
      photo_url: 'https://cloudinary.com/checkout.jpg',
    };

    it('nên checkout thành công', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkinTime = new Date();
      checkinTime.setHours(8, 0, 0, 0);
      const checkoutTime = new Date();
      checkoutTime.setHours(17, 0, 0, 0);

      const existingCheckin = {
        id: 1,
        user_id: 1,
        action_type: 'checkin',
        work_date: new Date(today),
        timestamp: checkinTime,
        is_open: true,
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
        .mockResolvedValueOnce(existingCheckin);
      prismaService.time_sheets.findFirst.mockResolvedValue({
        ...mockTimesheet,
        work_date: new Date(today),
        checkin: checkinTime,
      });
      prismaService.attendance_logs.create.mockResolvedValue({
        id: 2,
        action_type: 'checkout',
        timestamp: checkoutTime,
      });
      prismaService.time_sheets.update.mockResolvedValue({
        ...mockTimesheet,
        checkout: checkoutTime,
        is_complete: true,
      });
      prismaService.attendance_logs.update.mockResolvedValue({
        ...existingCheckin,
        is_open: false,
      });

      const result = await service.checkout(1, checkoutDto);

      expect(result.message).toBe('Check-out thành công');
    });
  });

  describe('findAllHolidaysPaginated - Lấy danh sách ngày lễ có phân trang', () => {
    it('nên trả về danh sách ngày lễ có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const mockHolidays = [
        {
          id: 1,
          name: 'Ngày lễ',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-01'),
          status: HolidayStatus.ACTIVE,
        },
      ];

      prismaService.holidays.findMany.mockResolvedValue(mockHolidays);
      prismaService.holidays.count.mockResolvedValue(1);

      const result = await service.findAllHolidaysPaginated(paginationDto);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('nên lọc theo năm', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        year: 2024,
      };

      prismaService.holidays.findMany.mockResolvedValue([]);
      prismaService.holidays.count.mockResolvedValue(0);

      const result = await service.findAllHolidaysPaginated(paginationDto);

      expect(prismaService.holidays.findMany).toHaveBeenCalled();
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updateHoliday - Cập nhật ngày lễ', () => {
    const updateHolidayDto = {
      name: 'Ngày lễ đã cập nhật',
      start_date: '2024-12-25',
      end_date: '2024-12-25',
    };

    it('nên cập nhật ngày lễ thành công', async () => {
      const existingHoliday = {
        id: 1,
        name: 'Ngày lễ',
        start_date: new Date('2024-12-25'),
        end_date: new Date('2024-12-25'),
        status: HolidayStatus.ACTIVE,
      };

      prismaService.holidays.findFirst.mockResolvedValue(existingHoliday);
      prismaService.holidays.update.mockResolvedValue({
        ...existingHoliday,
        ...updateHolidayDto,
        start_date: new Date(updateHolidayDto.start_date),
        end_date: new Date(updateHolidayDto.end_date),
      });

      const result = await service.updateHoliday(1, updateHolidayDto);

      expect(prismaService.holidays.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(prismaService.holidays.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy ngày lễ', async () => {
      prismaService.holidays.findFirst.mockResolvedValue(null);

      await expect(service.updateHoliday(999, updateHolidayDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeHoliday - Xóa ngày lễ', () => {
    it('nên xóa mềm ngày lễ thành công', async () => {
      const existingHoliday = {
        id: 1,
        name: 'Ngày lễ',
        start_date: new Date('2024-12-25'),
        end_date: new Date('2024-12-25'),
        status: HolidayStatus.ACTIVE,
      };

      prismaService.holidays.findFirst.mockResolvedValue(existingHoliday);
      prismaService.holidays.update.mockResolvedValue({
        ...existingHoliday,
        deleted_at: new Date(),
      });

      const result = await service.removeHoliday(1);

      expect(prismaService.holidays.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
      expect(prismaService.holidays.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted_at: expect.any(Date) },
      });
      expect(result.deleted_at).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy ngày lễ', async () => {
      prismaService.holidays.findFirst.mockResolvedValue(null);

      await expect(service.removeHoliday(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAttendanceStatistics - Thống kê chấm công', () => {
    it('nên trả về thống kê chấm công cho user', async () => {
      const startDate = '2024-10-01';
      const endDate = '2024-10-31';

      const mockTimesheets = [
        {
          ...mockTimesheet,
          is_complete: true,
          total_work_time: 480,
        },
      ];

      prismaService.time_sheets.findMany.mockResolvedValue(mockTimesheets);
      prismaService.attendance_requests.findMany
        .mockResolvedValueOnce([]) // overtime requests
        .mockResolvedValueOnce([]); // day off requests
      prismaService.user_leave_balances.findUnique.mockResolvedValue(null);

      const result = await service.getAttendanceStatistics(1, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.attendance).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('nên trả về thống kê với ngày mặc định khi không truyền tham số', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.user_leave_balances.findUnique.mockResolvedValue(null);

      const result = await service.getAttendanceStatistics(1);

      expect(result).toBeDefined();
    });

    it('nên tính toán overtime hours từ requests', async () => {
      const startDate = '2024-10-01';
      const endDate = '2024-10-31';

      const mockTimesheets = [
        {
          ...mockTimesheet,
          is_complete: true,
        },
      ];

      const mockOvertimeRequests = [
        {
          id: 1,
          overtime: {
            start_time: new Date('2024-10-01T18:00:00'),
            end_time: new Date('2024-10-01T20:00:00'),
          },
        },
      ];

      prismaService.time_sheets.findMany.mockResolvedValue(mockTimesheets);
      prismaService.attendance_requests.findMany
        .mockResolvedValueOnce(mockOvertimeRequests)
        .mockResolvedValueOnce([]);
      prismaService.user_leave_balances.findUnique.mockResolvedValue(null);

      const result = await service.getAttendanceStatistics(1, startDate, endDate);

      expect(result.overtime.total_hours).toBeGreaterThan(0);
    });
  });

  describe('getAttendanceLogsPaginated - Lấy danh sách log chấm công có phân trang', () => {
    const paginationDto = {
      page: 1,
      limit: 10,
      user_id: 1,
    };

    it('nên trả về danh sách log chấm công có phân trang', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          action_type: 'checkin',
          timestamp: new Date(),
          user: { id: 1, email: 'test@example.com' },
          timesheet: { id: 1, work_date: new Date() },
        },
      ];

      prismaService.attendance_logs.findMany.mockResolvedValue(mockLogs);
      prismaService.attendance_logs.count.mockResolvedValue(1);

      const result = await service.getAttendanceLogsPaginated(1, paginationDto, false);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('nên throw BadRequestException khi user không có quyền xem log của user khác', async () => {
      const paginationDtoOtherUser = {
        ...paginationDto,
        user_id: 999,
      };

      await expect(
        service.getAttendanceLogsPaginated(1, paginationDtoOtherUser, false),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên cho phép admin xem log của user khác', async () => {
      const paginationDtoOtherUser = {
        ...paginationDto,
        user_id: 999,
      };

      prismaService.attendance_logs.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.count.mockResolvedValue(0);

      const result = await service.getAttendanceLogsPaginated(
        1,
        paginationDtoOtherUser,
        true,
      );

      expect(result).toBeDefined();
    });

    it('nên lọc theo khoảng thời gian', async () => {
      const paginationDtoWithDate = {
        ...paginationDto,
        start_date: '2024-10-01',
        end_date: '2024-10-31',
      };

      prismaService.attendance_logs.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.count.mockResolvedValue(0);

      await service.getAttendanceLogsPaginated(1, paginationDtoWithDate, false);

      expect(prismaService.attendance_logs.findMany).toHaveBeenCalled();
    });

    it('nên lọc theo log_type', async () => {
      const paginationDtoWithType = {
        ...paginationDto,
        log_type: 'checkin',
      };

      prismaService.attendance_logs.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.count.mockResolvedValue(0);

      await service.getAttendanceLogsPaginated(1, paginationDtoWithType, false);

      expect(prismaService.attendance_logs.findMany).toHaveBeenCalled();
    });
  });

  describe('getPersonalSchedule - Lấy lịch làm việc cá nhân', () => {
    it('nên trả về lịch làm việc cá nhân', async () => {
      const user_id = 1;
      const getScheduleDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getPersonalSchedule(user_id, getScheduleDto);

      expect(result).toBeDefined();
      expect(result.timesheets).toBeDefined();
      expect(result.dayOffs).toBeDefined();
      expect(result.overtimes).toBeDefined();
      expect(result.holidays).toBeDefined();
    });

    it('nên sử dụng ngày mặc định khi không truyền tham số', async () => {
      const user_id = 1;

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getPersonalSchedule(user_id, {});

      expect(result).toBeDefined();
    });
  });

  describe('getTeamSchedule - Lấy lịch làm việc của team', () => {
    it('nên trả về lịch làm việc của team', async () => {
      const team_id = 1;
      const getScheduleDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 1 },
        { user_id: 2 },
      ]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTeamSchedule(team_id, getScheduleDto);

      expect(result).toBeDefined();
      expect(result.teamMembers).toBeDefined();
      expect(result.timesheets).toBeDefined();
      expect(result.dayOffs).toBeDefined();
      expect(result.holidays).toBeDefined();
    });

    it('nên sử dụng ngày mặc định khi không truyền tham số', async () => {
      const team_id = 1;

      prismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 1 },
      ]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTeamSchedule(team_id, {});

      expect(result).toBeDefined();
    });
  });

  describe('getTimesheetNotifications - Lấy thông báo timesheet', () => {
    it('nên trả về thông báo khi chưa check-in', async () => {
      const user_id = 1;

      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.attendance_requests.count.mockResolvedValue(0);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.getTimesheetNotifications(user_id);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('nên trả về thông báo khi chưa check-out', async () => {
      const user_id = 1;
      const mockTimesheet = {
        id: 1,
        user_id: 1,
        checkin: new Date(),
        checkout: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.attendance_requests.count.mockResolvedValue(0);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.getTimesheetNotifications(user_id);

      expect(result).toBeDefined();
    });

    it('nên trả về thông báo khi có đơn nghỉ phép chờ duyệt', async () => {
      const user_id = 1;
      const mockTimesheet = {
        id: 1,
        user_id: 1,
        checkin: new Date(),
        checkout: new Date(),
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.attendance_requests.count.mockResolvedValue(2);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.getTimesheetNotifications(user_id);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getTimesheetReport - Báo cáo timesheet', () => {
    it('nên trả về báo cáo timesheet', async () => {
      const reportDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result).toBeDefined();
    });

    it('nên lọc theo team_id', async () => {
      const reportDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        team_id: 1,
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 1 },
      ]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result).toBeDefined();
    });

    it('nên lọc theo division_id', async () => {
      const reportDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        division_id: 1,
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 1 },
      ]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result).toBeDefined();
    });
  });

  describe('getWorkingTimeReport - Báo cáo giờ làm việc', () => {
    it('nên trả về báo cáo giờ làm việc', async () => {
      const reportDto: any = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
    });

    it('nên lọc theo team_id', async () => {
      const reportDto: any = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        team_id: 1,
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 1 },
      ]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
    });
  });

  describe('getAllUsersAttendanceStatistics - Thống kê chấm công tất cả users', () => {
    it('nên trả về thống kê chấm công tất cả users', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics();

      expect(result).toBeDefined();
      expect(result.employees).toBeDefined();
      expect(Array.isArray(result.employees)).toBe(true);
    });

    it('nên lọc theo khoảng thời gian', async () => {
      const startDate = '2024-12-01';
      const endDate = '2024-12-31';

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics(
        startDate,
        endDate,
      );

      expect(result).toBeDefined();
      expect(result.period.start_date).toBe(startDate);
      expect(result.period.end_date).toBe(endDate);
    });
  });

  describe('validateRequestQuota - Validate request quota', () => {
    it('nên validate forgot_checkin quota thành công khi chưa vượt quota', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue({
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      });
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          id: 1,
          status: 'PENDING',
          forgot_checkin_request: {},
        },
      ]);

      await expect(
        service.validateRequestQuota(1, 'forgot_checkin'),
      ).resolves.not.toThrow();
    });

    it('nên throw BadRequestException khi forgot_checkin đã vượt quota', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue({
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      });
      prismaService.attendance_requests.findMany.mockResolvedValue([
        { id: 1, status: 'PENDING', forgot_checkin_request: {} },
        { id: 2, status: 'APPROVED', forgot_checkin_request: {} },
        { id: 3, status: 'PENDING', forgot_checkin_request: {} },
        { id: 4, status: 'APPROVED', forgot_checkin_request: {} },
      ]);

      await expect(
        service.validateRequestQuota(1, 'forgot_checkin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên validate late_early quota thành công khi chưa vượt quota', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue({
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      });
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          id: 1,
          status: 'PENDING',
          late_early_request: {
            late_minutes: 30,
            early_minutes: 0,
          },
        },
      ]);

      await expect(
        service.validateRequestQuota(1, 'late_early', 20),
      ).resolves.not.toThrow();
    });

    it('nên throw BadRequestException khi late_early count đã vượt quota', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue({
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      });
      prismaService.attendance_requests.findMany.mockResolvedValue([
        { id: 1, status: 'PENDING', late_early_request: {} },
        { id: 2, status: 'APPROVED', late_early_request: {} },
        { id: 3, status: 'PENDING', late_early_request: {} },
        { id: 4, status: 'APPROVED', late_early_request: {} },
      ]);

      await expect(
        service.validateRequestQuota(1, 'late_early', 20),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi late_early minutes đã vượt quota', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue({
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      });
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          id: 1,
          status: 'PENDING',
          late_early_request: {
            late_minutes: 100,
            early_minutes: 0,
          },
        },
      ]);

      await expect(
        service.validateRequestQuota(1, 'late_early', 30),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên validate late_early thành công khi requestMinutes là undefined', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue({
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      });
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          id: 1,
          status: 'PENDING',
          late_early_request: {
            late_minutes: 30,
            early_minutes: 0,
          },
        },
      ]);

      await expect(
        service.validateRequestQuota(1, 'late_early'),
      ).resolves.not.toThrow();
    });
  });

  describe('getWorkingTimeReport - Edge cases', () => {
    it('nên xử lý month là number', async () => {
      const reportDto: any = {
        month: 12,
        year: 2024,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
      expect(result.period).toBe('2024-12');
    });

    it('nên xử lý month là string với format YYYY-MM', async () => {
      const reportDto: any = {
        month: '2024-12',
        year: 2024,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
      expect(result.period).toBe('2024-12');
    });

    it('nên sử dụng month hiện tại khi month không được truyền', async () => {
      const reportDto: any = {
        year: 2024,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
    });

    it('nên lọc theo user_id', async () => {
      const reportDto: any = {
        month: 12,
        year: 2024,
        user_id: 1,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          total_work_time: 480,
          remote: 'OFFICE',
        },
      ]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
      expect(result.user_stats.length).toBe(1);
    });

    it('nên tính toán đúng khi có nhiều users', async () => {
      const reportDto: any = {
        month: 12,
        year: 2024,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          total_work_time: 480,
          remote: 'OFFICE',
        },
        {
          id: 2,
          user_id: 2,
          total_work_time: 480,
          remote: 'REMOTE',
        },
      ]);

      const result = await service.getWorkingTimeReport(reportDto);

      expect(result).toBeDefined();
      expect(result.user_stats.length).toBe(2);
      expect(result.summary.total_users).toBe(2);
    });
  });

  describe('getAllUsersAttendanceStatistics - Edge cases', () => {
    it('nên tính toán đúng khi có timesheets với user information', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          is_complete: true,
          total_work_time: 480,
          user: {
            id: 1,
            email: 'user1@example.com',
            user_information: {
              name: 'User 1',
            },
          },
        },
      ]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics();

      expect(result).toBeDefined();
      expect(result.employees.length).toBeGreaterThan(0);
    });

    it('nên xử lý khi user không có user_information', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          is_complete: true,
          total_work_time: 480,
          user: {
            id: 1,
            email: 'user1@example.com',
            user_information: null,
          },
        },
      ]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics();

      expect(result).toBeDefined();
      expect(result.employees[0].name).toBe('N/A');
    });

    it('nên tính toán đúng attendance_rate và punctuality_rate', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          is_complete: true,
          total_work_time: 480,
          user: {
            id: 1,
            email: 'user1@example.com',
            user_information: {
              name: 'User 1',
            },
          },
        },
        {
          id: 2,
          user_id: 1,
          is_complete: false,
          total_work_time: 240,
          user: {
            id: 1,
            email: 'user1@example.com',
            user_information: {
              name: 'User 1',
            },
          },
        },
      ]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics();

      expect(result).toBeDefined();
      expect(result.employees[0].attendance_rate).toBeDefined();
      expect(result.employees[0].punctuality_rate).toBeDefined();
    });

    it('nên tính toán đúng status (good/warning/critical)', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          is_complete: true,
          total_work_time: 480,
          user: {
            id: 1,
            email: 'user1@example.com',
            user_information: {
              name: 'User 1',
            },
          },
        },
      ]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAllUsersAttendanceStatistics();

      expect(result).toBeDefined();
      expect(['good', 'warning', 'critical']).toContain(
        result.employees[0].status,
      );
    });
  });

  describe('updateTimesheetCompleteStatus - Edge cases', () => {
    it('nên cập nhật is_complete = false khi không đủ thời gian làm việc', async () => {
      const timesheet = {
        id: 1,
        total_work_time: 200,
        deleted_at: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          day_off: {
            duration: 'MORNING',
          },
          late_early_request: null,
        },
      ]);
      prismaService.time_sheets.update.mockResolvedValue({
        ...timesheet,
        is_complete: false,
      });

      await service.updateTimesheetCompleteStatus(1);

      expect(prismaService.time_sheets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { is_complete: false },
        }),
      );
    });

    it('nên xử lý day_off với duration AFTERNOON', async () => {
      const timesheet = {
        id: 1,
        total_work_time: 480,
        deleted_at: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          day_off: {
            duration: 'AFTERNOON',
          },
          late_early_request: null,
        },
      ]);
      prismaService.time_sheets.update.mockResolvedValue(timesheet);

      await service.updateTimesheetCompleteStatus(1);

      expect(prismaService.time_sheets.update).toHaveBeenCalled();
    });

    it('nên xử lý late_early_request với cả late_minutes và early_minutes', async () => {
      const timesheet = {
        id: 1,
        total_work_time: 480,
        deleted_at: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          day_off: null,
          late_early_request: {
            late_minutes: 30,
            early_minutes: 20,
          },
        },
      ]);
      prismaService.time_sheets.update.mockResolvedValue(timesheet);

      await service.updateTimesheetCompleteStatus(1);

      expect(prismaService.time_sheets.update).toHaveBeenCalled();
    });

    it('nên xử lý khi total_work_time là null', async () => {
      const timesheet = {
        id: 1,
        total_work_time: null,
        deleted_at: null,
      };

      prismaService.time_sheets.findFirst.mockResolvedValue(timesheet);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.time_sheets.update.mockResolvedValue({
        ...timesheet,
        is_complete: false,
      });

      await service.updateTimesheetCompleteStatus(1);

      expect(prismaService.time_sheets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { is_complete: false },
        }),
      );
    });
  });

  describe('getDayOffInfo - Edge cases', () => {
    it('nên trả về thông tin khi có nghỉ phép AFTERNOON', async () => {
      const dayOffRequests = [
        {
          day_off: {
            duration: 'AFTERNOON',
            type: 'PAID',
          },
        },
      ];

      prismaService.attendance_requests.findMany.mockResolvedValue(
        dayOffRequests,
      );

      const result = await service.getDayOffInfo(1, '2024-12-20');

      expect(result.hasDayOff).toBe(true);
      expect(result.needsAttendance).toBe(true);
    });
  });

  describe('createTimesheet - Edge cases', () => {
    it('nên xử lý khi có approvedDayOff với needsAttendance = true', async () => {
      const createDto: CreateTimesheetDto = {
        work_date: '2024-12-20',
      };

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          day_off: {
            duration: 'MORNING',
            type: 'PAID',
          },
        },
      ]);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.holidays.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.create.mockResolvedValue(mockTimesheet);

      const result = await service.createTimesheet(createDto, 1);

      expect(result).toBeDefined();
    });

    it('nên xử lý khi type được truyền vào và không phải NORMAL', async () => {
      const createDto: CreateTimesheetDto = {
        work_date: '2024-12-20',
        type: 'HOLIDAY',
      };

      prismaService.users.findFirst.mockResolvedValue(mockUser);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.time_sheets.findFirst.mockResolvedValue(null);
      prismaService.time_sheets.create.mockResolvedValue({
        ...mockTimesheet,
        type: 'HOLIDAY',
      });

      const result = await service.createTimesheet(createDto, 1);

      expect(result).toBeDefined();
      expect(result.type).toBe('HOLIDAY');
    });
  });

  describe('findMyTimesheetsPaginated - Edge cases', () => {
    it('nên xử lý khi có requests với các request types khác nhau', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      prismaService.time_sheets.findMany.mockResolvedValue([mockTimesheet]);
      prismaService.time_sheets.count.mockResolvedValue(1);
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          id: 1,
          timesheet_id: 1,
          request_type: 'DAY_OFF',
          status: 'PENDING',
          day_off: {
            request_id: 1,
            type: 'PAID',
            duration: 'FULL_DAY',
          },
        },
        {
          id: 2,
          timesheet_id: 1,
          request_type: 'OVERTIME',
          status: 'APPROVED',
          overtime: {
            request_id: 2,
            start_time: new Date('2024-12-20T18:00:00'),
            end_time: new Date('2024-12-20T20:00:00'),
          },
        },
        {
          id: 3,
          timesheet_id: 1,
          request_type: 'REMOTE_WORK',
          status: 'PENDING',
          remote_work_request: {
            request_id: 3,
            remote_type: 'REMOTE',
          },
        },
        {
          id: 4,
          timesheet_id: 1,
          request_type: 'LATE_EARLY',
          status: 'APPROVED',
          late_early_request: {
            request_id: 4,
            late_minutes: 30,
            early_minutes: 0,
          },
        },
        {
          id: 5,
          timesheet_id: 1,
          request_type: 'FORGOT_CHECKIN',
          status: 'PENDING',
          forgot_checkin_request: {
            request_id: 5,
            checkin_time: new Date('2024-12-20T08:30:00'),
            checkout_time: new Date('2024-12-20T17:30:00'),
          },
        },
      ]);

      const result = await service.findMyTimesheetsPaginated(1, paginationDto);

      expect(result).toBeDefined();
      expect(result.data[0].requests.length).toBe(5);
    });
  });

  describe('getRequestQuota - Edge cases', () => {
    it('nên xử lý khi không có leaveBalance', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue(null);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getRequestQuota(1);

      expect(result).toBeDefined();
      expect(result.forgot_checkin.quota).toBe(3);
      expect(result.late_early.minutes_quota).toBe(120);
    });

    it('nên tính toán đúng khi có rejected requests (không tính vào quota)', async () => {
      prismaService.user_leave_balances.findUnique.mockResolvedValue({
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
      });
      prismaService.attendance_requests.findMany
        .mockResolvedValueOnce([
          {
            id: 1,
            status: 'REJECTED',
            forgot_checkin_request: {},
          },
          {
            id: 2,
            status: 'PENDING',
            forgot_checkin_request: {},
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 3,
            status: 'REJECTED',
            late_early_request: {
              late_minutes: 50,
              early_minutes: 0,
            },
          },
          {
            id: 4,
            status: 'PENDING',
            late_early_request: {
              late_minutes: 30,
              early_minutes: 0,
            },
          },
        ]);

      const result = await service.getRequestQuota(1);

      expect(result).toBeDefined();
      expect(result.forgot_checkin.used).toBe(1); // Chỉ tính PENDING
      expect(result.late_early.used_count).toBe(1); // Chỉ tính PENDING
      expect(result.late_early.used_minutes).toBe(30); // Chỉ tính PENDING
    });
  });

  describe('getLateEarlyBalance - Edge cases', () => {
    it('nên xử lý khi không có approved requests', async () => {
      prismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getLateEarlyBalance(1);

      expect(result).toBeDefined();
      expect(result.used_minutes).toBe(0);
      expect(result.used_late_minutes).toBe(0);
      expect(result.used_early_minutes).toBe(0);
    });

    it('nên tính toán đúng khi có cả late_minutes và early_minutes', async () => {
      prismaService.attendance_requests.findMany.mockResolvedValue([
        {
          late_early_request: {
            late_minutes: 30,
            early_minutes: 20,
          },
        },
        {
          late_early_request: {
            late_minutes: 15,
            early_minutes: null,
          },
        },
      ]);

      const result = await service.getLateEarlyBalance(1);

      expect(result).toBeDefined();
      expect(result.used_late_minutes).toBe(45);
      expect(result.used_early_minutes).toBe(20);
      expect(result.used_minutes).toBe(65);
    });
  });

  describe('getAttendanceStatistics - Edge cases', () => {
    it('nên xử lý khi không có user_id', async () => {
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAttendanceStatistics();

      expect(result).toBeDefined();
    });

    it('nên tính toán đúng paid_leave và unpaid_leave', async () => {
      const startDate = '2024-12-01';
      const endDate = '2024-12-31';

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            work_date: new Date('2024-12-15'),
            day_off: {
              type: 'PAID',
              duration: 'FULL_DAY',
            },
          },
          {
            work_date: new Date('2024-12-16'),
            day_off: {
              type: 'UNPAID',
              duration: 'MORNING',
            },
          },
        ]);
      prismaService.user_leave_balances.findUnique.mockResolvedValue(null);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getAttendanceStatistics(1, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.leave.paid_leave).toBe(1);
      expect(result.leave.unpaid_leave).toBe(0.5);
    });
  });

  describe('createAttendanceLog - Edge cases', () => {
    it('nên throw BadRequestException khi work_date không khớp với timesheet', async () => {
      const createDto = {
        timesheet_id: 1,
        work_date: '2024-12-20',
        timestamp: '2024-12-20T08:30:00',
        action_type: 'checkin',
      };

      prismaService.time_sheets.findFirst.mockResolvedValue({
        id: 1,
        user_id: 1,
        work_date: new Date('2024-12-21'),
      });

      await expect(
        service.createAttendanceLog(createDto, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAttendanceLogs - Edge cases', () => {
    it('nên xử lý khi không có userRoles', async () => {
      const queryDto = {
        user_id: 2,
        page: 1,
        limit: 20,
      };

      await expect(
        service.getAttendanceLogs(1, queryDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên filter theo action_type', async () => {
      const queryDto = {
        action_type: 'checkin',
        page: 1,
        limit: 20,
      };

      prismaService.attendance_logs.findMany.mockResolvedValue([]);
      prismaService.attendance_logs.count.mockResolvedValue(0);

      const result = await service.getAttendanceLogs(1, queryDto);

      expect(result).toBeDefined();
    });
  });

  describe('getPersonalSchedule - Edge cases', () => {
    it('nên filter đúng overtime requests theo date range', async () => {
      const getScheduleDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            overtime: {
              start_time: new Date('2024-12-15T18:00:00'),
              end_time: new Date('2024-12-15T20:00:00'),
            },
          },
        ]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getPersonalSchedule(1, getScheduleDto);

      expect(result).toBeDefined();
      expect(result.overtimes.length).toBe(1);
    });
  });

  describe('getTeamSchedule - Edge cases', () => {
    it('nên xử lý khi team không có members', async () => {
      const getScheduleDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.user_role_assignment.findMany.mockResolvedValue([]);
      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.attendance_requests.findMany.mockResolvedValue([]);
      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTeamSchedule(1, getScheduleDto);

      expect(result).toBeDefined();
      expect(result.teamMembers).toEqual([]);
    });
  });

  describe('getTimesheetNotifications - Edge cases', () => {
    it('nên trả về thông báo khi có timesheet bị từ chối', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      prismaService.attendance_requests.count.mockResolvedValue(0);
      prismaService.time_sheets.count.mockResolvedValue(2);

      const result = await service.getTimesheetNotifications(1);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((n) => n.type === 'error')).toBe(true);
    });

    it('nên không trả về thông báo khi đã check-in và check-out', async () => {
      prismaService.time_sheets.findFirst.mockResolvedValue({
        ...mockTimesheet,
        checkin: new Date(),
        checkout: new Date(),
      });
      prismaService.attendance_requests.count.mockResolvedValue(0);
      prismaService.time_sheets.count.mockResolvedValue(0);

      const result = await service.getTimesheetNotifications(1);

      expect(result).toBeDefined();
      expect(
        result.some((n) => n.message.includes('check-in')),
      ).toBe(false);
      expect(
        result.some((n) => n.message.includes('check-out')),
      ).toBe(false);
    });
  });

  describe('getTimesheetReport - Edge cases', () => {
    it('nên xử lý khi không có division_id và team_id', async () => {
      const reportDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.time_sheets.findMany.mockResolvedValue([]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result).toBeDefined();
    });

    it('nên tính toán đúng stats khi có timesheets', async () => {
      const reportDto = {
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };

      prismaService.time_sheets.findMany.mockResolvedValue([
        {
          id: 1,
          is_complete: true,
          total_work_time: 480,
          remote: 'OFFICE',
        },
        {
          id: 2,
          is_complete: false,
          total_work_time: 240,
          remote: 'REMOTE',
        },
      ]);
      prismaService.holidays.findMany.mockResolvedValue([]);

      const result = await service.getTimesheetReport(reportDto);

      expect(result).toBeDefined();
      expect(result.stats.total_records).toBe(2);
      expect(result.stats.total_incomplete).toBe(1);
      expect(result.stats.total_remote).toBe(1);
    });
  });
});
