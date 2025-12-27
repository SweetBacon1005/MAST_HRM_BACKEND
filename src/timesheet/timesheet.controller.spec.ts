import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TimesheetController } from './timesheet.controller';
import { TimesheetService } from './timesheet.service';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { RegisterFaceDto } from './dto/register-face.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { TIMESHEET_ERRORS, USER_ERRORS } from '../common/constants/error-messages.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { HolidayStatus, HolidayType } from '@prisma/client';

describe('TimesheetController', () => {
  let controller: TimesheetController;
  let service: TimesheetService;

  const mockTimesheetService = {
    findMyTimesheetsPaginated: jest.fn(),
    registerFace: jest.fn(),
    checkin: jest.fn(),
    checkout: jest.fn(),
    createHoliday: jest.fn(),
    findAllHolidaysPaginated: jest.fn(),
    updateHoliday: jest.fn(),
    removeHoliday: jest.fn(),
    getAttendanceStatistics: jest.fn(),
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

    it('nên lọc theo start_date và end_date', async () => {
      const paginationDtoWithDate = {
        page: 1,
        limit: 10,
        start_date: '2024-10-01',
        end_date: '2024-10-31',
      };

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

      const result = await controller.findMyTimesheets(1, paginationDtoWithDate);

      expect(service.findMyTimesheetsPaginated).toHaveBeenCalledWith(1, paginationDtoWithDate);
      expect(result).toEqual(mockResponse);
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

    it('nên throw NotFoundException khi không tìm thấy user', async () => {
      mockTimesheetService.registerFace.mockRejectedValue(
        new NotFoundException(USER_ERRORS.USER_NOT_FOUND),
      );

      await expect(controller.registerFace(registerFaceDto)).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi URL ảnh không hợp lệ', async () => {
      mockTimesheetService.registerFace.mockRejectedValue(
        new BadRequestException('URL ảnh không hợp lệ hoặc khuôn mặt đã được đăng ký'),
      );

      await expect(controller.registerFace(registerFaceDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi khuôn mặt đã được đăng ký', async () => {
      mockTimesheetService.registerFace.mockRejectedValue(
        new BadRequestException('URL ảnh không hợp lệ hoặc khuôn mặt đã được đăng ký'),
      );

      await expect(controller.registerFace(registerFaceDto)).rejects.toThrow(BadRequestException);
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

    it('nên throw BadRequestException khi đã check-in rồi', async () => {
      mockTimesheetService.checkin.mockRejectedValue(
        new BadRequestException('Bạn đã check-in hôm nay rồi'),
      );

      await expect(controller.checkin(1, checkinDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi thiếu photo_url', async () => {
      mockTimesheetService.checkin.mockRejectedValue(
        new BadRequestException('Thiếu photo_url sau khi xác thực ảnh'),
      );

      await expect(controller.checkin(1, checkinDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi IP không hợp lệ', async () => {
      mockTimesheetService.checkin.mockRejectedValue(
        new BadRequestException('IP không hợp lệ'),
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

    it('nên throw BadRequestException khi chưa check-in', async () => {
      mockTimesheetService.checkout.mockRejectedValue(
        new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_NOT_FOUND),
      );

      await expect(controller.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi đã check-out rồi', async () => {
      mockTimesheetService.checkout.mockRejectedValue(
        new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_SUBMITTED),
      );

      await expect(controller.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi thiếu photo_url', async () => {
      mockTimesheetService.checkout.mockRejectedValue(
        new BadRequestException('Thiếu photo_url sau khi xác thực ảnh'),
      );

      await expect(controller.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi IP không hợp lệ', async () => {
      mockTimesheetService.checkout.mockRejectedValue(
        new BadRequestException('IP không hợp lệ'),
      );

      await expect(controller.checkout(1, checkoutDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createHoliday - Tạo ngày lễ mới', () => {
    it('nên tạo ngày lễ thành công', async () => {
      const createHolidayDto: CreateHolidayDto = {
        name: 'Ngày Quốc khánh',
        type: HolidayType.NATIONAL,
        status: HolidayStatus.ACTIVE,
        start_date: '2024-09-02',
        end_date: '2024-09-02',
      };

      const mockHoliday = {
        id: 1,
        ...createHolidayDto,
        start_date: new Date(createHolidayDto.start_date),
        end_date: new Date(createHolidayDto.end_date),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTimesheetService.createHoliday.mockResolvedValue(mockHoliday);

      const result = await controller.createHoliday(createHolidayDto);

      expect(service.createHoliday).toHaveBeenCalledWith(createHolidayDto);
      expect(result).toEqual(mockHoliday);
    });

    it('nên throw BadRequestException khi tên ngày lễ đã tồn tại', async () => {
      const createHolidayDto: CreateHolidayDto = {
        name: 'Ngày lễ đã tồn tại',
        type: HolidayType.NATIONAL,
        status: HolidayStatus.ACTIVE,
        start_date: '2024-09-02',
        end_date: '2024-09-02',
      };

      mockTimesheetService.createHoliday.mockRejectedValue(
        new BadRequestException('Ngày lễ đã tồn tại'),
      );

      await expect(controller.createHoliday(createHolidayDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllHolidays - Lấy danh sách ngày lễ có phân trang', () => {
    it('nên trả về danh sách ngày lễ có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Ngày Quốc khánh',
            start_date: new Date('2024-09-02'),
            end_date: new Date('2024-09-02'),
            status: 'ACTIVE',
          },
        ],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockTimesheetService.findAllHolidaysPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findAllHolidays(paginationDto);

      expect(service.findAllHolidaysPaginated).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResponse);
    });

    it('nên lọc theo năm', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        year: 2024,
      };

      const mockResponse = {
        data: [],
        pagination: {
          total: 0,
          current_page: 1,
          per_page: 10,
          total_pages: 0,
        },
      };

      mockTimesheetService.findAllHolidaysPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findAllHolidays(paginationDto);

      expect(service.findAllHolidaysPaginated).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResponse);
    });

    it('nên trả về mảng rỗng khi không tìm thấy ngày lễ', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        data: [],
        pagination: {
          total: 0,
          current_page: 1,
          per_page: 10,
          total_pages: 0,
        },
      };

      mockTimesheetService.findAllHolidaysPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findAllHolidays(paginationDto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updateHoliday - Cập nhật ngày lễ', () => {
    it('nên cập nhật ngày lễ thành công', async () => {
      const id = 1;
      const updateHolidayDto: UpdateHolidayDto = {
        name: 'Ngày Quốc khánh (Cập nhật)',
        status: HolidayStatus.INACTIVE,
      };

      const mockUpdatedHoliday = {
        id,
        name: updateHolidayDto.name,
        status: updateHolidayDto.status,
        updated_at: new Date(),
      };

      mockTimesheetService.updateHoliday.mockResolvedValue(mockUpdatedHoliday);

      const result = await controller.updateHoliday(id, updateHolidayDto);

      expect(service.updateHoliday).toHaveBeenCalledWith(id, updateHolidayDto);
      expect(result).toEqual(mockUpdatedHoliday);
    });

    it('nên throw NotFoundException khi không tìm thấy ngày lễ', async () => {
      const id = 999;
      const updateHolidayDto: UpdateHolidayDto = {
        name: 'Ngày lễ không tồn tại',
      };

      mockTimesheetService.updateHoliday.mockRejectedValue(
        new NotFoundException('Không tìm thấy ngày lễ'),
      );

      await expect(controller.updateHoliday(id, updateHolidayDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên cập nhật start_date và end_date', async () => {
      const id = 1;
      const updateHolidayDto: UpdateHolidayDto = {
        start_date: '2024-10-01',
        end_date: '2024-10-02',
      };

      const mockUpdatedHoliday = {
        id,
        start_date: new Date(updateHolidayDto.start_date!),
        end_date: new Date(updateHolidayDto.end_date!),
        updated_at: new Date(),
      };

      mockTimesheetService.updateHoliday.mockResolvedValue(mockUpdatedHoliday);

      const result = await controller.updateHoliday(id, updateHolidayDto);

      expect(service.updateHoliday).toHaveBeenCalledWith(id, updateHolidayDto);
      expect(result).toEqual(mockUpdatedHoliday);
    });
  });

  describe('removeHoliday - Xóa ngày lễ', () => {
    it('nên xóa ngày lễ thành công', async () => {
      const id = 1;
      const mockDeletedHoliday = {
        id,
        deleted_at: new Date(),
      };

      mockTimesheetService.removeHoliday.mockResolvedValue(mockDeletedHoliday);

      const result = await controller.removeHoliday(id);

      expect(service.removeHoliday).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockDeletedHoliday);
    });

    it('nên throw NotFoundException khi không tìm thấy ngày lễ', async () => {
      mockTimesheetService.removeHoliday.mockRejectedValue(
        new NotFoundException('Không tìm thấy ngày lễ'),
      );

      await expect(controller.removeHoliday(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyAttendanceStatistics - Thống kê chấm công cá nhân', () => {
    it('nên trả về thống kê chấm công cá nhân', async () => {
      const dateRange = {
        start_date: '2024-10-01',
        end_date: '2024-10-31',
      };

      const mockStatistics = {
        period: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
        total_work_days: '20/22',
        overtime_hours: 5,
        late_minutes: 30,
        violation_time: '2/20',
        paid_leave_hours: 8,
        unpaid_leave_hours: 0,
        attendance: {
          total_days: '20/22',
          complete_days: 20,
          working_days_in_month: 22,
          late: 30,
          late_days: 2,
          early_leave: '0/20',
          early_leave_days: 0,
          early_leave_minutes: 0,
        },
        overtime: {
          total_hours: 5,
          total_requests: 2,
        },
        leave: {
          paid_leave: 1,
          unpaid_leave: 0,
          total_leave_requests: 1,
        },
        holidays: [],
        summary: {
          attendance_rate: 91,
          punctuality_rate: 90,
        },
      };

      mockTimesheetService.getAttendanceStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getMyAttendanceStatistics(1, dateRange);

      expect(service.getAttendanceStatistics).toHaveBeenCalledWith(
        1,
        dateRange.start_date,
        dateRange.end_date,
      );
      expect(result).toEqual(mockStatistics);
    });

    it('nên sử dụng ngày mặc định khi không truyền dateRange', async () => {
      const dateRange: any = {};

      const mockStatistics = {
        period: {
          start_date: '2024-10-01',
          end_date: '2024-10-31',
        },
        attendance: {},
        summary: {},
      };

      mockTimesheetService.getAttendanceStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getMyAttendanceStatistics(1, dateRange);

      expect(service.getAttendanceStatistics).toHaveBeenCalledWith(1, undefined, undefined);
      expect(result).toEqual(mockStatistics);
    });

    it('nên xử lý khi chỉ có start_date', async () => {
      const dateRange: any = {
        start_date: '2024-10-01',
      };

      const mockStatistics = {
        period: {
          start_date: dateRange.start_date,
          end_date: '2024-10-31',
        },
        attendance: {},
        summary: {},
      };

      mockTimesheetService.getAttendanceStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getMyAttendanceStatistics(1, dateRange);

      expect(service.getAttendanceStatistics).toHaveBeenCalledWith(
        1,
        dateRange.start_date,
        undefined,
      );
      expect(result).toEqual(mockStatistics);
    });

    it('nên xử lý khi chỉ có end_date', async () => {
      const dateRange: any = {
        end_date: '2024-10-31',
      };

      const mockStatistics = {
        period: {
          start_date: '2024-10-01',
          end_date: dateRange.end_date,
        },
        attendance: {},
        summary: {},
      };

      mockTimesheetService.getAttendanceStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getMyAttendanceStatistics(1, dateRange);

      expect(service.getAttendanceStatistics).toHaveBeenCalledWith(
        1,
        undefined,
        dateRange.end_date,
      );
      expect(result).toEqual(mockStatistics);
    });
  });
});
