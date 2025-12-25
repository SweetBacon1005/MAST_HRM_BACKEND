import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestsService } from './requests.service';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { TimesheetService } from '../timesheet/timesheet.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { AttendanceRequestService } from './services/attendance-request.service';
import { DayOffDetailService } from './services/day-off-detail.service';
import { RemoteWorkDetailService } from './services/remote-work-detail.service';
import { LateEarlyDetailService } from './services/late-early-detail.service';
import { ForgotCheckinDetailService } from './services/forgot-checkin-detail.service';
import { OvertimeDetailService } from './services/overtime-detail.service';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { CreateLateEarlyRequestDto } from './dto/create-late-early-request.dto';
import { CreateForgotCheckinRequestDto } from './dto/create-forgot-checkin-request.dto';
import { ApprovalStatus, DayOffDuration, DayOffType, RemoteType } from '@prisma/client';
import { REQUEST_ERRORS, USER_ERRORS } from '../common/constants/error-messages.constants';
import { AuthorizationContext } from '../auth/services/authorization-context.service';
import { RequestType } from './interfaces/request.interface';

describe('RequestsService', () => {
  let service: RequestsService;
  let prismaService: PrismaService;
  let attendanceRequestService: AttendanceRequestService;
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
    },
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
    attendanceRequestService = module.get<AttendanceRequestService>(AttendanceRequestService);
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
      const mockTimesheet = { id: 1, user_id: 1, work_date: new Date(createDto.work_date) };
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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(false);
      mockAttendanceRequestService.findMany.mockResolvedValue([]);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockRemoteWorkDetailService.createRemoteWorkDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(mockAttendanceRequest);

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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(true);

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
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(false);
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(mockLeaveBalance);
      mockPrismaService.time_sheets.findFirst.mockResolvedValue(mockTimesheet);
      mockAttendanceRequestService.createAttendanceRequest.mockResolvedValue({
        id: 1,
        timesheet_id: 1,
      });
      mockDayOffDetailService.createDayOffDetail.mockResolvedValue({});
      mockAttendanceRequestService.findOne.mockResolvedValue(mockAttendanceRequest);

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
      };
      const mockLeaveBalance = {
        paid_leave_balance: 0,
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockAttendanceRequestService.checkDuplicateRequest.mockResolvedValue(false);
      mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue(mockLeaveBalance);

      await expect(service.createDayOffRequest(createDto)).rejects.toThrow(BadRequestException);
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

      mockAttendanceRequestService.findMany.mockResolvedValue(mockRequests);

      const result = await service.getAllMyRequests(user_id, paginationDto);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
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

      await expect(service.deleteRequest(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không phải owner', async () => {
      const mockRequest = {
        id: 1,
        user_id: 2,
        status: ApprovalStatus.PENDING,
      };

      mockAttendanceRequestService.findOne.mockResolvedValue(mockRequest);

      await expect(service.deleteRequest(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
