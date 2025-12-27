import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ApprovalStatus,
  DayOffDuration,
  DayOffType,
  RemoteType,
} from '@prisma/client';
import { AuthorizationContext } from '../auth/services/authorization-context.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { TimesheetService } from '../timesheet/timesheet.service';
import { CreateForgotCheckinRequestDto } from './dto/create-forgot-checkin-request.dto';
import { CreateLateEarlyRequestDto } from './dto/create-late-early-request.dto';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  let service: RequestsService;
  let prismaService: PrismaService;
  let leaveBalanceService: LeaveBalanceService;
  let timesheetService: TimesheetService;

  const mockPrismaService = {
    users: {
      findFirst: jest.fn(),
    },
    time_sheets: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendance_requests: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    remote_work_requests: {
      create: jest.fn(),
      update: jest.fn(),
    },
    day_offs: {
      create: jest.fn(),
      update: jest.fn(),
    },
    over_times_history: {
      create: jest.fn(),
      update: jest.fn(),
    },
    late_early_requests: {
      create: jest.fn(),
      update: jest.fn(),
    },
    forgot_checkin_requests: {
      create: jest.fn(),
      update: jest.fn(),
    },
    user_leave_balances: {
      findUnique: jest.fn(),
    },
    user_role_assignment: {
      findMany: jest.fn(),
    },
    projects: {
      findMany: jest.fn(),
    },
  };

  const mockLeaveBalanceService = {
    getOrCreateLeaveBalance: jest.fn(),
    getLeaveBalanceStats: jest.fn(),
    deductLeaveBalance: jest.fn(),
    refundLeaveBalance: jest.fn(),
  };

  const mockTimesheetService = {
    validateRequestQuota: jest.fn(),
    updateTimesheetCompleteStatus: jest.fn(),
    getRequestQuota: jest.fn(),
    getLateEarlyBalance: jest.fn(),
  };

  const mockRoleAssignmentService = {
    getUserRoles: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockAuthContext = (userId: number): AuthorizationContext => {
    return {
      userId,
      email: `user${userId}@example.com`,
      roleContexts: [],
      highestRoles: {
        COMPANY: null,
        DIVISION: {},
        TEAM: {},
        PROJECT: {},
      },
      hasRole: jest.fn().mockReturnValue(true),
      hasAnyRole: jest.fn().mockReturnValue(true),
      getHighestRole: jest.fn().mockReturnValue(null),
      canAccessResource: jest.fn().mockResolvedValue(true),
      canApproveRequest: jest.fn().mockResolvedValue(true),
    } as unknown as AuthorizationContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LeaveBalanceService,
          useValue: mockLeaveBalanceService,
        },
        {
          provide: TimesheetService,
          useValue: mockTimesheetService,
        },
        {
          provide: RoleAssignmentService,
          useValue: mockRoleAssignmentService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
    prismaService = module.get<PrismaService>(PrismaService);
    leaveBalanceService = module.get<LeaveBalanceService>(LeaveBalanceService);
    timesheetService = module.get<TimesheetService>(TimesheetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRemoteWorkRequest', () => {
    it('nên tạo đơn làm việc từ xa thành công', async () => {
      const createDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Làm việc từ xa',
        reason: 'Có việc gia đình',
      };
      const mockUser = { id: 1 };
      const mockTimesheet = {
        id: 1,
        user_id: 1,
        work_date: new Date(createDto.work_date),
      };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        work_date: new Date(createDto.work_date),
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
        remote_work_request: {
          remote_type: RemoteType.REMOTE,
          duration: DayOffDuration.FULL_DAY,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.remote_work_requests.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createRemoteWorkRequest(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.attendance_requests.create).toHaveBeenCalled();
      expect(mockPrismaService.remote_work_requests.create).toHaveBeenCalled();
    });

    it('nên throw NotFoundException khi user không tồn tại', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);

      await expect(
        service.createRemoteWorkRequest({
          user_id: 999,
          work_date: '2024-12-20',
          remote_type: RemoteType.REMOTE,
          duration: DayOffDuration.FULL_DAY,
          title: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi đã có request trùng', async () => {
      const createDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Test',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue({
        id: 1,
      });

      await expect(service.createRemoteWorkRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createDayOffRequest', () => {
    it('nên tạo đơn nghỉ phép thành công', async () => {
      const createDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.PAID,
        title: 'Nghỉ phép',
        reason: 'Có việc riêng',
      };
      const mockUser = { id: 1 };
      const mockLeaveBalance = {
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
      };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        work_date: new Date(createDto.work_date),
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.PAID,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockLeaveBalance,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.day_offs.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createDayOffRequest(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.attendance_requests.create).toHaveBeenCalled();
      expect(mockPrismaService.day_offs.create).toHaveBeenCalled();
    });

    it('nên throw BadRequestException khi không đủ số dư phép', async () => {
      const createDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.PAID,
        title: 'Nghỉ phép',
        reason: 'Lý do nghỉ phép',
      };
      const mockLeaveBalance = {
        paid_leave_balance: 0,
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockLeaveBalance,
      );

      await expect(service.createDayOffRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên tạo đơn nghỉ phép MORNING thành công', async () => {
      const createDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        duration: DayOffDuration.MORNING,
        type: DayOffType.PAID,
        title: 'Nghỉ phép buổi sáng',
        reason: 'Có việc riêng',
      };
      const mockUser = { id: 1 };
      const mockLeaveBalance = {
        paid_leave_balance: 10,
      };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        day_off: {
          duration: DayOffDuration.MORNING,
          type: DayOffType.PAID,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockLeaveBalance,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.day_offs.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createDayOffRequest(createDto);

      expect(result).toBeDefined();
    });

    it('nên tạo đơn nghỉ phép UNPAID thành công', async () => {
      const createDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.UNPAID,
        title: 'Nghỉ phép không lương',
        reason: 'Có việc riêng',
      };
      const mockUser = { id: 1 };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.UNPAID,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.day_offs.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createDayOffRequest(createDto);

      expect(result).toBeDefined();
    });
  });

  describe('getAllMyRequests', () => {
    it('nên lấy danh sách requests của tôi thành công', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );
      mockPrismaService.attendance_requests.count.mockResolvedValue(1);

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
    });

    it('nên filter theo request_type', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
        request_type: 'DAY_OFF' as any,
      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'DAY_OFF',
          status: ApprovalStatus.PENDING,
          day_off: {
            duration: DayOffDuration.FULL_DAY,
            type: DayOffType.PAID,
          },
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
    });

    it('nên filter theo remote_type khi request_type là REMOTE_WORK', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
        request_type: 'REMOTE_WORK' as any,
        remote_type: RemoteType.REMOTE,
      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
        {
          id: 2,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(2);
    });

    it('nên filter theo status', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
        status: ApprovalStatus.APPROVED,
      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'DAY_OFF',
          status: ApprovalStatus.APPROVED,
          day_off: {
            duration: DayOffDuration.FULL_DAY,
            type: DayOffType.PAID,
          },
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
    });

    it('nên filter theo date range', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'DAY_OFF',
          status: ApprovalStatus.PENDING,
          work_date: new Date('2024-12-15'),
          day_off: {
            duration: DayOffDuration.FULL_DAY,
            type: DayOffType.PAID,
          },
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
    });
  });

  describe('deleteRequest', () => {
    it('nên xóa request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.PENDING,
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        deleted_at: new Date(),
      });

      const result = await service.deleteRequest(id, user_id);

      expect(result.success).toBe(true);
      expect(mockPrismaService.attendance_requests.update).toHaveBeenCalled();
    });

    it('nên throw NotFoundException khi không tìm thấy request', async () => {
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(service.deleteRequest(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên throw ForbiddenException khi không phải owner', async () => {
      const mockRequest = {
        id: 1,
        user_id: 2,
        status: ApprovalStatus.PENDING,
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      await expect(service.deleteRequest(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createOvertimeRequest', () => {
    it('nên tạo đơn làm thêm giờ thành công', async () => {
      const createDto: CreateOvertimeRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        start_time: '18:00',
        end_time: '20:00',
        title: 'Làm thêm giờ',
        reason: 'Hoàn thành dự án',
      };
      const mockUser = { id: 1 };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        work_date: new Date(createDto.work_date),
        request_type: 'OVERTIME',
        status: ApprovalStatus.PENDING,
        overtime: {
          start_time: new Date(`1970-01-01T${createDto.start_time}:00Z`),
          end_time: new Date(`1970-01-01T${createDto.end_time}:00Z`),
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.over_times_history.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createOvertimeRequest(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.attendance_requests.create).toHaveBeenCalled();
      expect(mockPrismaService.over_times_history.create).toHaveBeenCalled();
    });

    it('nên throw BadRequestException khi thời gian làm thêm trùng với giờ làm việc', async () => {
      const createDto: CreateOvertimeRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        start_time: '10:00',
        end_time: '12:00',
        title: 'Test',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(service.createOvertimeRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createLateEarlyRequest', () => {
    it('nên tạo đơn đi muộn/về sớm thành công', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'LATE',
        late_minutes: 30,
        title: 'Đi muộn',
        reason: 'Kẹt xe',
      };
      const mockUser = { id: 1 };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        work_date: new Date(createDto.work_date),
        request_type: 'LATE_EARLY',
        status: ApprovalStatus.PENDING,
        late_early_request: {
          request_type: 'LATE',
          late_minutes: 30,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.late_early_requests.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createLateEarlyRequest(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.attendance_requests.create).toHaveBeenCalled();
      expect(mockPrismaService.late_early_requests.create).toHaveBeenCalled();
    });

    it('nên tạo đơn về sớm thành công', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'EARLY',
        early_minutes: 30,
        title: 'Về sớm',
        reason: 'Có việc riêng',
      };
      const mockUser = { id: 1 };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        request_type: 'LATE_EARLY',
        status: ApprovalStatus.PENDING,
        late_early_request: {
          request_type: 'EARLY',
          early_minutes: 30,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.late_early_requests.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createLateEarlyRequest(createDto);

      expect(result).toBeDefined();
    });

    it('nên tạo đơn đi muộn và về sớm thành công', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'BOTH',
        late_minutes: 30,
        early_minutes: 20,
        title: 'Đi muộn và về sớm',
        reason: 'Có việc riêng',
      };
      const mockUser = { id: 1 };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        request_type: 'LATE_EARLY',
        status: ApprovalStatus.PENDING,
        late_early_request: {
          request_type: 'BOTH',
          late_minutes: 30,
          early_minutes: 20,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.late_early_requests.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createLateEarlyRequest(createDto);

      expect(result).toBeDefined();
    });

    it('nên throw BadRequestException khi LATE nhưng thiếu late_minutes', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'LATE',
        title: 'Đi muộn',
        reason: 'Kẹt xe',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(service.createLateEarlyRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi EARLY nhưng thiếu early_minutes', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'EARLY',
        title: 'Về sớm',
        reason: 'Có việc riêng',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(service.createLateEarlyRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createForgotCheckinRequest', () => {
    it('nên tạo đơn bổ sung chấm công thành công', async () => {
      const createDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Bổ sung chấm công',
        reason: 'Quên chấm công',
      };
      const mockUser = { id: 1 };
      const mockTimesheet = { id: 1 };
      const mockAttendanceRequest = {
        id: 1,
        user_id: 1,
        work_date: new Date(createDto.work_date),
        request_type: 'FORGOT_CHECKIN',
        status: ApprovalStatus.PENDING,
        forgot_checkin_request: {
          checkin_time: new Date(
            `${createDto.work_date} ${createDto.checkin_time}`,
          ),
          checkout_time: new Date(
            `${createDto.work_date} ${createDto.checkout_time}`,
          ),
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.create.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockPrismaService.forgot_checkin_requests.create.mockResolvedValue({});
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        mockAttendanceRequest,
      );

      const result = await service.createForgotCheckinRequest(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.attendance_requests.create).toHaveBeenCalled();
      expect(
        mockPrismaService.forgot_checkin_requests.create,
      ).toHaveBeenCalled();
    });

    it('nên throw BadRequestException khi checkout_time <= checkin_time', async () => {
      const createDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        checkin_time: '17:30',
        checkout_time: '08:30',
        title: 'Bổ sung chấm công',
        reason: 'Quên chấm công',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.createForgotCheckinRequest(createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi work_date là tương lai', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const createDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: tomorrow.toISOString().split('T')[0],
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Bổ sung chấm công',
        reason: 'Quên chấm công',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.createForgotCheckinRequest(createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyRequestsStats', () => {
    it('nên lấy thống kê requests của tôi thành công', async () => {
      const user_id = 1;
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
        },
        {
          id: 2,
          user_id: 1,
          request_type: 'DAY_OFF',
          status: ApprovalStatus.APPROVED,
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );

      const result = await service.getMyRequestsStats(user_id);

      expect(result.total).toBeDefined();
      expect(result.pending).toBeDefined();
      expect(result.approved).toBeDefined();
      expect(result.rejected).toBeDefined();
    });
  });

  describe('getMyLeaveBalance', () => {
    it('nên lấy số dư phép của tôi thành công', async () => {
      const user_id = 1;
      const mockBalance = {
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
      };

      mockLeaveBalanceService.getLeaveBalanceStats.mockResolvedValue(
        mockBalance,
      );

      const result = await service.getMyLeaveBalance(user_id);

      expect(result).toEqual(mockBalance);
    });
  });

  describe('checkLeaveBalanceAvailability', () => {
    it('nên kiểm tra số dư phép có đủ', async () => {
      const user_id = 1;
      const leaveType = DayOffType.PAID;
      const requestedDays = 5;
      const mockBalance = {
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
      };

      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockBalance,
      );

      const result = await service.checkLeaveBalanceAvailability(
        user_id,
        leaveType,
        requestedDays,
      );

      expect(result.available).toBe(true);
      expect(result.current_balance).toBe(10);
    });

    it('nên kiểm tra số dư phép không đủ', async () => {
      const user_id = 1;
      const leaveType = DayOffType.PAID;
      const requestedDays = 15;
      const mockBalance = {
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
      };

      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockBalance,
      );

      const result = await service.checkLeaveBalanceAvailability(
        user_id,
        leaveType,
        requestedDays,
      );

      expect(result.available).toBe(false);
    });
  });

  describe('getAllRequestQuotasAndBalances', () => {
    it('nên lấy quota và balance thành công', async () => {
      const user_id = 1;

      mockPrismaService.user_leave_balances.findUnique.mockResolvedValue({
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
        annual_paid_leave_quota: 12,
        carry_over_days: 0,
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 5,
        monthly_late_early_count_quota: 10,
        last_reset_date: new Date(),
      });
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getAllRequestQuotasAndBalances(user_id);

      expect(result).toBeDefined();
      expect(result.leave_balance).toBeDefined();
      expect(result.late_early_quota).toBeDefined();
      expect(result.late_early_balance).toBeDefined();
    });

    it('nên tính toán đúng khi có requests trong tháng', async () => {
      const user_id = 1;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      mockPrismaService.user_leave_balances.findUnique.mockResolvedValue({
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
        annual_paid_leave_quota: 12,
        carry_over_days: 0,
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 5,
        last_reset_date: new Date(),
      });
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([
        {
          id: 1,
          request_type: 'FORGOT_CHECKIN',
          status: ApprovalStatus.APPROVED,
        },
        {
          id: 2,
          request_type: 'LATE_EARLY',
          status: ApprovalStatus.APPROVED,
          late_early_request: {
            late_minutes: 30,
            early_minutes: 20,
          },
        },
      ]);

      const result = await service.getAllRequestQuotasAndBalances(user_id);

      expect(result).toBeDefined();
      expect(result.forgot_checkin_quota.used).toBe(1);
      expect(result.late_early_balance.used_minutes).toBe(50);
    });

    it('nên xử lý khi không có leave balance data', async () => {
      const user_id = 1;

      mockPrismaService.user_leave_balances.findUnique.mockResolvedValue(null);
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getAllRequestQuotasAndBalances(user_id);

      expect(result).toBeDefined();
      expect(result.leave_balance.paid_leave.remaining).toBe(0);
    });
  });

  describe('getRequestById', () => {
    it('nên lấy request theo id thành công cho remote_work', async () => {
      const requestId = 1;
      const requestType = 'remote_work';
      const authContext = createMockAuthContext(1);
      const mockRequest = {
        id: requestId,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
        remote_work_request: {
          remote_type: RemoteType.REMOTE,
          duration: DayOffDuration.FULL_DAY,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      const result = await service.getRequestById(
        requestId,
        requestType,
        authContext,
      );

      expect(result).toBeDefined();
    });

    it('nên lấy request theo id thành công cho day_off', async () => {
      const requestId = 1;
      const requestType = 'day-off';
      const authContext = createMockAuthContext(1);
      const mockRequest = {
        id: requestId,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.PAID,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      const result = await service.getRequestById(
        requestId,
        requestType,
        authContext,
      );

      expect(result).toBeDefined();
    });

    it('nên lấy request theo id thành công cho overtime', async () => {
      const requestId = 1;
      const requestType = 'overtime';
      const authContext = createMockAuthContext(1);
      const mockRequest = {
        id: requestId,
        user_id: 1,
        request_type: 'OVERTIME',
        status: ApprovalStatus.PENDING,
        overtime: {
          start_time: new Date(),
          end_time: new Date(),
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      const result = await service.getRequestById(
        requestId,
        requestType,
        authContext,
      );

      expect(result).toBeDefined();
    });

    it('nên lấy request theo id thành công cho late_early', async () => {
      const requestId = 1;
      const requestType = 'late-early';
      const authContext = createMockAuthContext(1);
      const mockRequest = {
        id: requestId,
        user_id: 1,
        request_type: 'LATE_EARLY',
        status: ApprovalStatus.PENDING,
        late_early_request: {
          request_type: 'LATE',
          late_minutes: 30,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      const result = await service.getRequestById(
        requestId,
        requestType,
        authContext,
      );

      expect(result).toBeDefined();
    });

    it('nên lấy request theo id thành công cho forgot_checkin', async () => {
      const requestId = 1;
      const requestType = 'forgot-checkin';
      const authContext = createMockAuthContext(1);
      const mockRequest = {
        id: requestId,
        user_id: 1,
        request_type: 'FORGOT_CHECKIN',
        status: ApprovalStatus.PENDING,
        forgot_checkin_request: {
          checkin_time: new Date(),
          checkout_time: new Date(),
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      const result = await service.getRequestById(
        requestId,
        requestType,
        authContext,
      );

      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi không tìm thấy request', async () => {
      const requestId = 999;
      const requestType = 'remote_work';
      const authContext = createMockAuthContext(1);

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.getRequestById(requestId, requestType, authContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không có quyền xem', async () => {
      const requestId = 1;
      const requestType = 'remote_work';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id: requestId,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      authContext.canApproveRequest = jest.fn().mockResolvedValue(false);

      await expect(
        service.getRequestById(requestId, requestType, authContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên throw BadRequestException khi request type không hợp lệ', async () => {
      const requestId = 1;
      const requestType = 'invalid';
      const authContext = createMockAuthContext(1);

      await expect(
        service.getRequestById(requestId, requestType, authContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllRequests', () => {
    it('nên lấy tất cả requests thành công với ALL_ACCESS', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const user_id = 1;
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockRoleAssignmentService.getUserRoles.mockResolvedValue({
        roles: [{ name: 'admin', scope_type: 'COMPANY', scope_id: null }],
      });
      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );
      mockPrismaService.attendance_requests.count.mockResolvedValue(1);

      const result = await service.getAllRequests(paginationDto, user_id);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('nên lấy requests với DIVISION_ONLY access scope', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const user_id = 1;

      mockRoleAssignmentService.getUserRoles.mockResolvedValue({
        roles: [{ name: 'division_head', scope_type: 'DIVISION', scope_id: 1 }],
      });
      mockPrismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 2 },
        { user_id: 3 },
      ]);
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getAllRequests(paginationDto, user_id);

      expect(result).toBeDefined();
      expect(result.metadata.access_scope).toBe('DIVISION_ONLY');
    });

    it('nên lấy requests với TEAM_ONLY access scope', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const user_id = 1;

      mockRoleAssignmentService.getUserRoles.mockResolvedValue({
        roles: [{ name: 'team_leader', scope_type: 'TEAM', scope_id: 1 }],
      });
      mockPrismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 2 },
      ]);
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getAllRequests(paginationDto, user_id);

      expect(result).toBeDefined();
      expect(result.metadata.access_scope).toBe('TEAM_ONLY');
    });

    it('nên lấy requests với PROJECT_ONLY access scope', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const user_id = 1;

      mockRoleAssignmentService.getUserRoles.mockResolvedValue({
        roles: [
          { name: 'project_manager', scope_type: 'PROJECT', scope_id: 1 },
        ],
      });
      mockPrismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 2 },
      ]);
      mockPrismaService.projects.findMany.mockResolvedValue([{ team_id: 1 }]);
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getAllRequests(paginationDto, user_id);

      expect(result).toBeDefined();
      expect(result.metadata.access_scope).toBe('PROJECT_ONLY');
    });

    it('nên trả về empty khi không có user_ids', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const user_id = 1;

      mockRoleAssignmentService.getUserRoles.mockResolvedValue({
        roles: [{ name: 'division_head', scope_type: 'DIVISION', scope_id: 1 }],
      });
      mockPrismaService.user_role_assignment.findMany.mockResolvedValue([]);

      const result = await service.getAllRequests(paginationDto, user_id);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('nên lấy requests với division_id filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        division_id: 1,
      };
      const user_id = 1;

      mockRoleAssignmentService.getUserRoles.mockResolvedValue({
        roles: [{ name: 'admin', scope_type: 'COMPANY', scope_id: null }],
      });
      mockPrismaService.user_role_assignment.findMany.mockResolvedValue([
        { user_id: 2 },
      ]);
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);

      const result = await service.getAllRequests(paginationDto, user_id);

      expect(result).toBeDefined();
    });
  });

  describe('updateRemoteWorkRequest', () => {
    it('nên cập nhật remote work request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        remote_work_request: {
          id: 1,
          remote_type: RemoteType.REMOTE,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );
      mockPrismaService.attendance_requests.findMany.mockResolvedValue([]);
      mockPrismaService.attendance_requests.update.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.remote_work_requests.update.mockResolvedValue({});

      const result = await service.updateRemoteWorkRequest(
        id,
        updateDto,
        user_id,
      );

      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi request không tồn tại', async () => {
      const id = 999;
      const user_id = 1;
      const updateDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Updated',
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRemoteWorkRequest(id, updateDto, user_id),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không phải owner', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Updated',
      };
      const mockRequest = {
        id,
        user_id: 2,
        status: ApprovalStatus.REJECTED,
        remote_work_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.updateRemoteWorkRequest(id, updateDto, user_id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên throw BadRequestException khi status không phải REJECTED', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Updated',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.PENDING,
        remote_work_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.updateRemoteWorkRequest(id, updateDto, user_id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDayOffRequest', () => {
    it('nên cập nhật day off request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.PAID,
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        day_off: {
          id: 1,
          type: DayOffType.PAID,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue({
        paid_leave_balance: 10,
      });
      mockPrismaService.attendance_requests.update.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.day_offs.update.mockResolvedValue({});

      const result = await service.updateDayOffRequest(id, updateDto, user_id);

      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi request không tồn tại', async () => {
      const id = 999;
      const user_id = 1;
      const updateDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.PAID,
        title: 'Updated',
        reason: 'Updated reason',
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDayOffRequest(id, updateDto, user_id),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi không đủ số dư phép', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.PAID,
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        day_off: {
          id: 1,
          type: DayOffType.PAID,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue({
        paid_leave_balance: 0,
      });

      await expect(
        service.updateDayOffRequest(id, updateDto, user_id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOvertimeRequest', () => {
    it('nên cập nhật overtime request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateOvertimeRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        start_time: '18:00',
        end_time: '20:00',
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        overtime: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );
      mockPrismaService.attendance_requests.update.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.over_times_history.update.mockResolvedValue({});

      const result = await service.updateOvertimeRequest(
        id,
        updateDto,
        user_id,
      );

      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi request không tồn tại', async () => {
      const id = 999;
      const user_id = 1;
      const updateDto: CreateOvertimeRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        start_time: '18:00',
        end_time: '20:00',
        title: 'Updated',
        reason: 'Updated reason',
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOvertimeRequest(id, updateDto, user_id),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi thời gian làm thêm trùng với giờ làm việc', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateOvertimeRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        start_time: '10:00',
        end_time: '12:00',
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        overtime: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );

      await expect(
        service.updateOvertimeRequest(id, updateDto, user_id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateLateEarlyRequest', () => {
    it('nên cập nhật late early request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        request_type: 'LATE',
        late_minutes: 30,
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        late_early_request: {
          id: 1,
          request_type: 'LATE',
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );
      mockPrismaService.attendance_requests.update.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.late_early_requests.update.mockResolvedValue({});

      const result = await service.updateLateEarlyRequest(
        id,
        updateDto,
        user_id,
      );

      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi request không tồn tại', async () => {
      const id = 999;
      const user_id = 1;
      const updateDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        request_type: 'LATE',
        late_minutes: 30,
        title: 'Updated',
        reason: 'Updated reason',
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLateEarlyRequest(id, updateDto, user_id),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi BOTH nhưng thiếu minutes', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        request_type: 'BOTH',
        late_minutes: 30,
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        late_early_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );

      await expect(
        service.updateLateEarlyRequest(id, updateDto, user_id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateForgotCheckinRequest', () => {
    it('nên cập nhật forgot checkin request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        forgot_checkin_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );
      mockPrismaService.attendance_requests.update.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.forgot_checkin_requests.update.mockResolvedValue({});

      const result = await service.updateForgotCheckinRequest(
        id,
        updateDto,
        user_id,
      );

      expect(result).toBeDefined();
    });

    it('nên throw NotFoundException khi request không tồn tại', async () => {
      const id = 999;
      const user_id = 1;
      const updateDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Updated',
        reason: 'Updated reason',
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(null);

      await expect(
        service.updateForgotCheckinRequest(id, updateDto, user_id),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi checkout_time <= checkin_time', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: '2024-12-21',
        checkin_time: '17:30',
        checkout_time: '08:30',
        title: 'Updated',
        reason: 'Updated reason',
      };
      const mockRequest = {
        id,
        user_id,
        status: ApprovalStatus.REJECTED,
        forgot_checkin_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.attendance_requests.findFirst.mockResolvedValueOnce(
        null,
      );

      await expect(
        service.updateForgotCheckinRequest(id, updateDto, user_id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveLateEarlyRequest', () => {
    it('nên duyệt late early request thành công', async () => {
      const id = 1;
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        status: ApprovalStatus.PENDING,
        timesheet_id: 1,
        late_early_request: {
          id: 1,
          request_type: 'LATE',
          late_minutes: 30,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.APPROVED,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.APPROVED,
      });
      mockPrismaService.late_early_requests.update.mockResolvedValue({});
      mockTimesheetService.updateTimesheetCompleteStatus.mockResolvedValue(
        undefined,
      );

      const result = await service.approveLateEarlyRequest(id, authContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('rejectLateEarlyRequest', () => {
    it('nên từ chối late early request thành công', async () => {
      const id = 1;
      const reason = 'Không hợp lệ';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        status: ApprovalStatus.PENDING,
        late_early_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.REJECTED,
          reason,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.REJECTED,
        reason,
      });

      const result = await service.rejectLateEarlyRequest(
        id,
        authContext,
        reason,
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('approveForgotCheckinRequest', () => {
    it('nên duyệt forgot checkin request thành công', async () => {
      const id = 1;
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        status: ApprovalStatus.PENDING,
        timesheet_id: 1,
        forgot_checkin_request: {
          id: 1,
          checkin_time: new Date('2024-12-20T08:30:00'),
          checkout_time: new Date('2024-12-20T17:30:00'),
        },
      };
      const mockTimesheet = {
        id: 1,
        user_id: 1,
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.APPROVED,
        });
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.APPROVED,
      });
      mockPrismaService.time_sheets.update.mockResolvedValue({});
      mockPrismaService.forgot_checkin_requests.update.mockResolvedValue({});
      mockTimesheetService.updateTimesheetCompleteStatus.mockResolvedValue(
        undefined,
      );

      const result = await service.approveForgotCheckinRequest(id, authContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('rejectForgotCheckinRequest', () => {
    it('nên từ chối forgot checkin request thành công', async () => {
      const id = 1;
      const reason = 'Không hợp lệ';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        status: ApprovalStatus.PENDING,
        forgot_checkin_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.REJECTED,
          reason,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.REJECTED,
        reason,
      });

      const result = await service.rejectForgotCheckinRequest(
        id,
        authContext,
        reason,
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('approveRequest', () => {
    it('nên duyệt day_off request thành công', async () => {
      const type = 'day-off' as any;
      const id = 1;
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        day_off: {
          id: 1,
          type: DayOffType.PAID,
          duration: DayOffDuration.FULL_DAY,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.APPROVED,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.APPROVED,
      });
      mockLeaveBalanceService.deductLeaveBalance.mockResolvedValue(undefined);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.create.mockResolvedValue({ id: 1 });
      mockTimesheetService.updateTimesheetCompleteStatus.mockResolvedValue(
        undefined,
      );

      const result = await service.approveRequest(type, id, authContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên duyệt remote_work request thành công', async () => {
      const type = 'remote-work' as any;
      const id = 1;
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
        timesheet_id: 1,
        remote_work_request: {
          remote_type: RemoteType.REMOTE,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.APPROVED,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.APPROVED,
      });
      mockPrismaService.time_sheets.update.mockResolvedValue({});

      const result = await service.approveRequest(type, id, authContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên duyệt overtime request thành công', async () => {
      const type = 'overtime' as any;
      const id = 1;
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'OVERTIME',
        status: ApprovalStatus.PENDING,
        overtime: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.APPROVED,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.APPROVED,
      });

      const result = await service.approveRequest(type, id, authContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên duyệt late_early request thành công', async () => {
      const type = 'late-early' as any;
      const id = 1;
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'LATE_EARLY',
        status: ApprovalStatus.PENDING,
        timesheet_id: 1,
        late_early_request: {
          id: 1,
          request_type: 'LATE',
          late_minutes: 30,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.APPROVED,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.APPROVED,
      });
      mockPrismaService.time_sheets.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.time_sheets.update.mockResolvedValue({});
      mockTimesheetService.updateTimesheetCompleteStatus.mockResolvedValue(
        undefined,
      );

      const result = await service.approveRequest(type, id, authContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên duyệt forgot_checkin request thành công', async () => {
      const type = 'forgot-checkin' as any;
      const id = 1;
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'FORGOT_CHECKIN',
        status: ApprovalStatus.PENDING,
        timesheet_id: 1,
        forgot_checkin_request: {
          id: 1,
          checkin_time: new Date('2024-12-20T08:30:00'),
          checkout_time: new Date('2024-12-20T17:30:00'),
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.APPROVED,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.APPROVED,
      });
      mockPrismaService.time_sheets.update.mockResolvedValue({});

      const result = await service.approveRequest(type, id, authContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên throw BadRequestException khi type không hợp lệ', async () => {
      const type = 'invalid' as any;
      const id = 1;
      const authContext = createMockAuthContext(2);

      await expect(
        service.approveRequest(type, id, authContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectRequest', () => {
    it('nên từ chối day_off request thành công', async () => {
      const type = 'day-off' as any;
      const id = 1;
      const reason = 'Không hợp lệ';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        day_off: {
          id: 1,
          type: DayOffType.PAID,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.REJECTED,
          reason,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.REJECTED,
        reason,
      });
      mockTimesheetService.updateTimesheetCompleteStatus.mockResolvedValue(
        undefined,
      );

      const result = await service.rejectRequest(type, id, authContext, reason);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên từ chối remote_work request thành công', async () => {
      const type = 'remote-work' as any;
      const id = 1;
      const reason = 'Không hợp lệ';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
        remote_work_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.REJECTED,
          reason,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.REJECTED,
        reason,
      });

      const result = await service.rejectRequest(type, id, authContext, reason);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên từ chối overtime request thành công', async () => {
      const type = 'overtime' as any;
      const id = 1;
      const reason = 'Không hợp lệ';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'OVERTIME',
        status: ApprovalStatus.PENDING,
        overtime: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.REJECTED,
          reason,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.REJECTED,
        reason,
      });

      const result = await service.rejectRequest(type, id, authContext, reason);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên từ chối late_early request thành công', async () => {
      const type = 'late-early' as any;
      const id = 1;
      const reason = 'Không hợp lệ';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'LATE_EARLY',
        status: ApprovalStatus.PENDING,
        late_early_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.REJECTED,
          reason,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.REJECTED,
        reason,
      });
      mockTimesheetService.updateTimesheetCompleteStatus.mockResolvedValue(
        undefined,
      );

      const result = await service.rejectRequest(type, id, authContext, reason);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên từ chối forgot_checkin request thành công', async () => {
      const type = 'forgot-checkin' as any;
      const id = 1;
      const reason = 'Không hợp lệ';
      const authContext = createMockAuthContext(2);
      const mockRequest = {
        id,
        user_id: 1,
        request_type: 'FORGOT_CHECKIN',
        status: ApprovalStatus.PENDING,
        forgot_checkin_request: {
          id: 1,
        },
      };

      mockPrismaService.attendance_requests.findFirst
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: ApprovalStatus.REJECTED,
          reason,
        });
      mockPrismaService.attendance_requests.update.mockResolvedValue({
        ...mockRequest,
        status: ApprovalStatus.REJECTED,
        reason,
      });

      const result = await service.rejectRequest(type, id, authContext, reason);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('nên throw BadRequestException khi type không hợp lệ', async () => {
      const type = 'invalid' as any;
      const id = 1;
      const reason = 'Test';
      const authContext = createMockAuthContext(2);

      await expect(
        service.rejectRequest(type, id, authContext, reason),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRequestsByUserIds', () => {
    it('nên lấy requests theo user_ids thành công', async () => {
      const user_ids = [1, 2];
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );

      const result = await service.getRequestsByUserIds(
        user_ids,
        paginationDto,
      );

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
    });

    it('nên filter theo remote_type', async () => {
      const user_ids = [1];
      const paginationDto = {
        page: 1,
        limit: 10,
        request_type: 'REMOTE_WORK' as any,
        remote_type: RemoteType.REMOTE,
      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
        {
          id: 2,
          user_id: 1,
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockPrismaService.attendance_requests.findMany.mockResolvedValue(
        mockRequests,
      );

      const result = await service.getRequestsByUserIds(
        user_ids,
        paginationDto,
      );

      expect(result.data).toBeDefined();
    });

    it('nên trả về empty khi user_ids rỗng', async () => {
      const user_ids: number[] = [];
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const result = await service.getRequestsByUserIds(
        user_ids,
        paginationDto,
      );

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
