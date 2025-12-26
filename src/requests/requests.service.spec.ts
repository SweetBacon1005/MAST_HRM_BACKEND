import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ApprovalStatus,
  AttendanceRequestType,
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
import { RequestType } from './interfaces/request.interface';
import { RequestsService } from './requests.service';
import { AttendanceRequestService } from './services/attendance-request.service';
import { DayOffDetailService } from './services/day-off-detail.service';
import { ForgotCheckinDetailService } from './services/forgot-checkin-detail.service';
import { LateEarlyDetailService } from './services/late-early-detail.service';
import { OvertimeDetailService } from './services/overtime-detail.service';
import { RemoteWorkDetailService } from './services/remote-work-detail.service';

describe('RequestsService', () => {
  let service: RequestsService;
  let prismaService: PrismaService;
  let attendanceRequestService: AttendanceRequestService;
  let leaveBalanceService: LeaveBalanceService;
  let timesheetService: TimesheetService;

  const mockPrismaService = {
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    time_sheets: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendance_requests: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user_leave_balances: {
      findUnique: jest.fn(),
    },
    user_role_assignment: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAttendanceRequestService = {
    checkDuplicateRequest: jest.fn(),
    findMany: jest.fn(),
    createAttendanceRequest: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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
  };

  const mockRoleAssignmentService = {
    getUserRoles: jest.fn(),
  };

  const mockDayOffDetailService = {
    createDayOffDetail: jest.fn(),
    updateDayOffDetail: jest.fn(),
  };

  const mockRemoteWorkDetailService = {
    createRemoteWorkDetail: jest.fn(),
    updateRemoteWorkDetail: jest.fn(),
  };

  const mockLateEarlyDetailService = {
    createLateEarlyDetail: jest.fn(),
    updateLateEarlyDetail: jest.fn(),
  };

  const mockForgotCheckinDetailService = {
    createForgotCheckinDetail: jest.fn(),
    updateForgotCheckinDetail: jest.fn(),
  };

  const mockOvertimeDetailService = {
    createOvertimeDetail: jest.fn(),
    updateOvertimeDetail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
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
          provide: AttendanceRequestService,
          useValue: mockAttendanceRequestService,
        },
        {
          provide: DayOffDetailService,
          useValue: mockDayOffDetailService,
        },
        {
          provide: RemoteWorkDetailService,
          useValue: mockRemoteWorkDetailService,
        },
        {
          provide: LateEarlyDetailService,
          useValue: mockLateEarlyDetailService,
        },
        {
          provide: ForgotCheckinDetailService,
          useValue: mockForgotCheckinDetailService,
        },
        {
          provide: OvertimeDetailService,
          useValue: mockOvertimeDetailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
    prismaService = module.get<PrismaService>(PrismaService);
    attendanceRequestService = module.get<AttendanceRequestService>(
      AttendanceRequestService,
    );
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockAttendanceRequestService.findMany.mockResolvedValue([]);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockRemoteWorkDetailService.createRemoteWorkDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createRemoteWorkRequest(createDto);

      expect(result).toBeDefined();
      expect(result.remote_type).toBe(RemoteType.REMOTE);
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        true,
      );

      await expect(service.createRemoteWorkRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi có conflicting day off', async () => {
      const createDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Test',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockAttendanceRequestService.findMany.mockResolvedValue([
        { id: 1, status: ApprovalStatus.APPROVED },
      ]);

      await expect(service.createRemoteWorkRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi remote_type là OFFICE', async () => {
      const createDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        remote_type: RemoteType.OFFICE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Test',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockAttendanceRequestService.findMany.mockResolvedValue([]);

      await expect(service.createRemoteWorkRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên tạo timesheet mới khi timesheet không tồn tại', async () => {
      const createDto: CreateRemoteWorkRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Làm việc từ xa',
        reason: 'Có việc gia đình',
      };
      const mockUser = { id: 1 };
      const mockNewTimesheet = { id: 2 };
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockAttendanceRequestService.findMany.mockResolvedValue([]);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.create.mockResolvedValue(mockNewTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 2,
      });
      mockRemoteWorkDetailService.createRemoteWorkDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createRemoteWorkRequest(createDto);

      expect(mockPrismaService.time_sheets.create).toHaveBeenCalled();
      expect(result).toBeDefined();
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockLeaveBalance,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockDayOffDetailService.createDayOffDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createDayOffRequest(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe(DayOffType.PAID);
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockLeaveBalance,
      );

      await expect(service.createDayOffRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên tạo đơn nghỉ phép với HALF_DAY duration', async () => {
      const createDto: CreateDayOffRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        duration: DayOffDuration.MORNING,
        type: DayOffType.PAID,
        title: 'Nghỉ phép nửa ngày',
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
          duration: DayOffDuration.MORNING,
          type: DayOffType.PAID,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockLeaveBalance,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockDayOffDetailService.createDayOffDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createDayOffRequest(createDto);

      expect(result).toBeDefined();
    });

    it('nên tạo đơn nghỉ phép với UNPAID type', async () => {
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
        work_date: new Date(createDto.work_date),
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.UNPAID,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockDayOffDetailService.createDayOffDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createDayOffRequest(createDto);

      expect(result).toBeDefined();
      expect(mockLeaveBalanceService.getOrCreateLeaveBalance).not.toHaveBeenCalled();
    });

    it('nên tạo timesheet mới khi timesheet không tồn tại', async () => {
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
      const mockNewTimesheet = { id: 2 };
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockLeaveBalance,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.create.mockResolvedValue(mockNewTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 2,
      });
      mockDayOffDetailService.createDayOffDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createDayOffRequest(createDto);

      expect(mockPrismaService.time_sheets.create).toHaveBeenCalled();
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
          created_at: new Date(),
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockAttendanceRequestService.findMany.mockResolvedValue(mockRequests);

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
    });

    it('nên lấy danh sách requests với filter request_type', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
        request_type: AttendanceRequestType.DAY_OFF,

      };
      const mockRequests = [
        {
          id: 1,
          user_id: 1,
          request_type: 'DAY_OFF',
          status: ApprovalStatus.PENDING,
          created_at: new Date(),
          day_off: {
            duration: DayOffDuration.FULL_DAY,
            type: DayOffType.PAID,
          },
        },
      ];

      mockAttendanceRequestService.findMany.mockResolvedValue(mockRequests);

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
    });

    it('nên lấy danh sách requests với filter status', async () => {
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
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.APPROVED,
          created_at: new Date(),
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockAttendanceRequestService.findMany.mockResolvedValue(mockRequests);

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
    });

    it('nên lấy danh sách requests với filter date range', async () => {
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
          request_type: 'REMOTE_WORK',
          status: ApprovalStatus.PENDING,
          created_at: new Date(),
          remote_work_request: {
            remote_type: RemoteType.REMOTE,
          },
        },
      ];

      mockAttendanceRequestService.findMany.mockResolvedValue(mockRequests);

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

      mockAttendanceRequestService.findOne.mockResolvedValue(mockRequest);
      mockAttendanceRequestService.softDelete.mockResolvedValue({});

      const result = await service.deleteRequest(id, user_id);

      expect(result.success).toBe(true);
    });

    it('nên throw NotFoundException khi không tìm thấy request', async () => {
      mockAttendanceRequestService.findOne.mockResolvedValue(null);

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

      mockAttendanceRequestService.findOne.mockResolvedValue(mockRequest);

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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockOvertimeDetailService.createOvertimeDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createOvertimeRequest(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.start_time).toBeDefined();
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );

      await expect(service.createOvertimeRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi có duplicate', async () => {
      const createDto: CreateOvertimeRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        start_time: '18:00',
        end_time: '20:00',
        title: 'Test',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        true,
      );

      await expect(service.createOvertimeRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên tạo timesheet mới khi timesheet không tồn tại', async () => {
      const createDto: CreateOvertimeRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        start_time: '18:00',
        end_time: '20:00',
        title: 'Làm thêm giờ',
        reason: 'Hoàn thành dự án',
      };
      const mockUser = { id: 1 };
      const mockNewTimesheet = { id: 2 };
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.create.mockResolvedValue(mockNewTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 2,
      });
      mockOvertimeDetailService.createOvertimeDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createOvertimeRequest(createDto);

      expect(mockPrismaService.time_sheets.create).toHaveBeenCalled();
      expect(result).toBeDefined();
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockLateEarlyDetailService.createLateEarlyDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createLateEarlyRequest(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.late_minutes).toBe(30);
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
        work_date: new Date(createDto.work_date),
        request_type: 'LATE_EARLY',
        status: ApprovalStatus.PENDING,
        late_early_request: {
          request_type: 'EARLY',
          early_minutes: 30,
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockLateEarlyDetailService.createLateEarlyDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createLateEarlyRequest(createDto);

      expect(result).toBeDefined();
      expect(result.early_minutes).toBe(30);
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
        work_date: new Date(createDto.work_date),
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockLateEarlyDetailService.createLateEarlyDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createLateEarlyRequest(createDto);

      expect(result).toBeDefined();
    });

    it('nên throw BadRequestException khi thiếu late_minutes cho LATE', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'LATE',
        title: 'Đi muộn',
        reason: 'Kẹt xe',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );

      await expect(service.createLateEarlyRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi thiếu early_minutes cho EARLY', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'EARLY',
        title: 'Về sớm',
        reason: 'Có việc riêng',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );

      await expect(service.createLateEarlyRequest(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên throw BadRequestException khi có duplicate', async () => {
      const createDto: CreateLateEarlyRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        request_type: 'LATE',
        late_minutes: 30,
        title: 'Đi muộn',
        reason: 'Kẹt xe',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        true,
      );

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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockForgotCheckinDetailService.createForgotCheckinDetail.mockResolvedValue(
        {},
      );
      mockAttendanceRequestService.findOne.mockResolvedValue(
        mockAttendanceRequest,
      );

      const result = await service.createForgotCheckinRequest(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.checkin_time).toBeDefined();
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );

      await expect(
        service.createForgotCheckinRequest(createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi có duplicate', async () => {
      const createDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: '2024-12-20',
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Bổ sung chấm công',
        reason: 'Quên chấm công',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        true,
      );

      await expect(
        service.createForgotCheckinRequest(createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi date là tương lai', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const createDto: CreateForgotCheckinRequestDto = {
        user_id: 1,
        work_date: futureDate.toISOString().split('T')[0],
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Bổ sung chấm công',
        reason: 'Quên chấm công',
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockTimesheetService.validateRequestQuota.mockResolvedValue(undefined);
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(
        false,
      );

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

      mockAttendanceRequestService.findMany.mockResolvedValue(mockRequests);

      const result = await service.getMyRequestsStats(user_id);

      expect(result.total).toBeDefined();
      expect(result.pending).toBeDefined();
      expect(result.approved).toBeDefined();
      expect(result.rejected).toBeDefined();
    });

    it('nên tính toán thống kê đúng với nhiều request types', async () => {
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
        {
          id: 3,
          user_id: 1,
          request_type: 'OVERTIME',
          status: ApprovalStatus.REJECTED,
        },
        {
          id: 4,
          user_id: 1,
          request_type: 'LATE_EARLY',
          status: ApprovalStatus.PENDING,
        },
        {
          id: 5,
          user_id: 1,
          request_type: 'FORGOT_CHECKIN',
          status: ApprovalStatus.APPROVED,
        },
      ];

      mockAttendanceRequestService.findMany.mockResolvedValue(mockRequests);

      const result = await service.getMyRequestsStats(user_id);

      expect(result.total).toBe(5);
      expect(result.pending).toBe(2);
      expect(result.approved).toBe(2);
      expect(result.rejected).toBe(1);
      expect(result.by_type).toBeDefined();
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

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
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

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
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

    it('nên kiểm tra số dư phép UNPAID', async () => {
      const user_id = 1;
      const leaveType = DayOffType.UNPAID;
      const requestedDays = 3;
      const mockBalance = {
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(
        mockBalance,
      );

      const result = await service.checkLeaveBalanceAvailability(
        user_id,
        leaveType,
        requestedDays,
      );

      expect(result.available).toBe(true);
      expect(result.current_balance).toBe(5);
      expect(result.balance_type).toBe('phép không lương');
    });
  });

  describe('approveRequest', () => {
    it('nên approve remote work request thành công', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
        work_date: new Date(),
        remote_work_request: {
          remote_type: RemoteType.REMOTE,
        },
        timesheet_id: 1,
      };

      mockAttendanceRequestService.findOne
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: ApprovalStatus.APPROVED });
      mockAttendanceRequestService.approve.mockResolvedValue({});
      mockPrismaService.time_sheets.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.time_sheets.update.mockResolvedValue({});

      const result = await service.approveRequest(
        RequestType.REMOTE_WORK,
        1,
        mockAuthContext,
      );

      expect(result.success).toBe(true);
      expect(mockAttendanceRequestService.approve).toHaveBeenCalled();
    });

    it('nên approve day off request thành công', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        work_date: new Date(),
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.PAID,
        },
        timesheet_id: 1,
      };

      mockAttendanceRequestService.findOne
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: ApprovalStatus.APPROVED });
      mockAttendanceRequestService.approve.mockResolvedValue({});
      mockLeaveBalanceService.deductLeaveBalance.mockResolvedValue({});
      mockPrismaService.time_sheets.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.time_sheets.create.mockResolvedValue({ id: 1 });
      mockPrismaService.time_sheets.update.mockResolvedValue({});
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'START_MORNING_WORK_TIME') return '8:30';
        if (key === 'END_MORNING_WORK_TIME') return '12:00';
        if (key === 'START_AFTERNOON_WORK_TIME') return '13:00';
        if (key === 'END_AFTERNOON_WORK_TIME') return '17:30';
        return null;
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const result = await service.approveRequest(
        RequestType.DAY_OFF,
        1,
        mockAuthContext,
      );

      expect(result.success).toBe(true);
    });

    it('nên approve overtime request thành công', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'OVERTIME',
        status: ApprovalStatus.PENDING,
        work_date: new Date(),
        overtime: {
          start_time: new Date(),
          end_time: new Date(),
        },
      };

      mockAttendanceRequestService.findOne
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: ApprovalStatus.APPROVED });
      mockAttendanceRequestService.approve.mockResolvedValue({});

      const result = await service.approveRequest(
        RequestType.OVERTIME,
        1,
        mockAuthContext,
      );

      expect(result.success).toBe(true);
    });

    it('nên throw NotFoundException khi request không tồn tại', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn(),
      };

      mockAttendanceRequestService.findOne.mockResolvedValue(null);

      await expect(
        service.approveRequest(RequestType.REMOTE_WORK, 999, mockAuthContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi request không phải PENDING', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.APPROVED,
        work_date: new Date(),
        remote_work_request: {
          remote_type: RemoteType.REMOTE,
        },
      };

      mockAttendanceRequestService.findOne.mockResolvedValue(mockRequest);

      await expect(
        service.approveRequest(RequestType.REMOTE_WORK, 1, mockAuthContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên throw ForbiddenException khi không có quyền approve', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(false),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
        work_date: new Date(),
        remote_work_request: {
          remote_type: RemoteType.REMOTE,
        },
      };

      mockAttendanceRequestService.findOne.mockResolvedValue(mockRequest);

      await expect(
        service.approveRequest(RequestType.REMOTE_WORK, 1, mockAuthContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rejectRequest', () => {
    it('nên reject remote work request thành công', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
        work_date: new Date(),
        remote_work_request: {
          remote_type: RemoteType.REMOTE,
        },
      };

      mockAttendanceRequestService.findOne
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: ApprovalStatus.REJECTED });
      mockAttendanceRequestService.reject.mockResolvedValue({});

      const result = await service.rejectRequest(
        RequestType.REMOTE_WORK,
        1,
        mockAuthContext,
        'Lý do từ chối',
      );

      expect(result.success).toBe(true);
      expect(mockAttendanceRequestService.reject).toHaveBeenCalled();
    });

    it('nên reject day off request thành công', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.PENDING,
        work_date: new Date(),
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.PAID,
        },
        timesheet_id: 1,
      };

      mockAttendanceRequestService.findOne
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: ApprovalStatus.REJECTED });
      mockAttendanceRequestService.reject.mockResolvedValue({});
      mockPrismaService.time_sheets.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const result = await service.rejectRequest(
        RequestType.DAY_OFF,
        1,
        mockAuthContext,
        'Lý do từ chối',
      );

      expect(result.success).toBe(true);
    });

    it('nên reject day off request đã approved và refund balance', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.APPROVED,
        work_date: new Date(),
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.PAID,
        },
        timesheet_id: 1,
      };

      mockAttendanceRequestService.findOne
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: ApprovalStatus.REJECTED });
      mockAttendanceRequestService.reject.mockResolvedValue({});
      mockLeaveBalanceService.refundLeaveBalance.mockResolvedValue({});
      mockPrismaService.time_sheets.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const result = await service.rejectRequest(
        RequestType.DAY_OFF,
        1,
        mockAuthContext,
        'Lý do từ chối',
      );

      expect(result.success).toBe(true);
      expect(mockLeaveBalanceService.refundLeaveBalance).toHaveBeenCalled();
    });

    it('nên throw BadRequestException khi request không phải PENDING hoặc APPROVED', async () => {
      const mockAuthContext: AuthorizationContext = {
        userId: 2,
        email: 'approver@test.com',
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
        hasRole: jest.fn(),
        hasAnyRole: jest.fn(),
        getHighestRole: jest.fn(),
        canAccessResource: jest.fn(),
        canApproveRequest: jest.fn().mockResolvedValue(true),
      };

      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'DAY_OFF',
        status: ApprovalStatus.REJECTED,
        work_date: new Date(),
        day_off: {
          duration: DayOffDuration.FULL_DAY,
          type: DayOffType.PAID,
        },
      };

      mockAttendanceRequestService.findOne.mockResolvedValue(mockRequest);

      await expect(
        service.rejectRequest(RequestType.DAY_OFF, 1, mockAuthContext, 'Lý do'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllRequestQuotasAndBalances', () => {
    it('nên lấy quotas và balances thành công', async () => {
      const user_id = 1;
      const mockLeaveBalance = {
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
        annual_paid_leave_quota: 12,
        carry_over_days: 2,
        monthly_forgot_checkin_quota: 3,
        monthly_late_early_quota: 120,
        monthly_late_early_count_quota: 3,
        last_reset_date: new Date(),
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.user_leave_balances.findUnique.mockResolvedValue(
        mockLeaveBalance,
      );
      mockAttendanceRequestService.findMany.mockResolvedValue([]);

      const result = await service.getAllRequestQuotasAndBalances(user_id);

      expect(result.leave_balance).toBeDefined();
      expect(result.forgot_checkin_quota).toBeDefined();
      expect(result.late_early_quota).toBeDefined();
    });
  });
});
