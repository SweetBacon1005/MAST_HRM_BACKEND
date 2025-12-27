import { Test, TestingModule } from '@nestjs/testing';
import {
  ApprovalStatus,
  AttendanceRequestType,
  DayOffDuration,
  DayOffType,
  RemoteType,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  AuthorizationContext,
  AuthorizationContextService,
} from '../auth/services/authorization-context.service';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { CreateForgotCheckinRequestDto } from './dto/create-forgot-checkin-request.dto';
import { CreateLateEarlyRequestDto } from './dto/create-late-early-request.dto';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { RequestPaginationDto } from './dto/request-pagination.dto';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

describe('RequestsController', () => {
  let controller: RequestsController;
  let service: RequestsService;
  let authorizationContextService: AuthorizationContextService;

  const mockRequestsService = {
    createRemoteWorkRequest: jest.fn(),
    createDayOffRequest: jest.fn(),
    createOvertimeRequest: jest.fn(),
    createLateEarlyRequest: jest.fn(),
    createForgotCheckinRequest: jest.fn(),
    getAllMyRequests: jest.fn(),
    getMyRequestsStats: jest.fn(),
    getMyLeaveBalance: jest.fn(),
    checkLeaveBalanceAvailability: jest.fn(),
    getAllRequestQuotasAndBalances: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    getRequestById: jest.fn(),
    getAllRequests: jest.fn(),
    updateRemoteWorkRequest: jest.fn(),
    updateDayOffRequest: jest.fn(),
    updateOvertimeRequest: jest.fn(),
    updateLateEarlyRequest: jest.fn(),
    updateForgotCheckinRequest: jest.fn(),
    deleteRequest: jest.fn(),
  };

  const mockAuthorizationContextService = {
    createContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        {
          provide: RequestsService,
          useValue: mockRequestsService,
        },
        {
          provide: AuthorizationContextService,
          useValue: mockAuthorizationContextService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RequestsController>(RequestsController);
    service = module.get<RequestsService>(RequestsService);
    authorizationContextService = module.get<AuthorizationContextService>(
      AuthorizationContextService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRemoteWorkRequest', () => {
    it('nên tạo đơn làm việc từ xa thành công', async () => {
      const user_id = 1;
      const createDto: CreateRemoteWorkRequestDto = {
        user_id,
        work_date: '2024-12-20',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Làm việc từ xa',
      };
      const mockRequest = {
        id: 1,
        ...createDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.createRemoteWorkRequest.mockResolvedValue(
        mockRequest,
      );

      const result = await controller.createRemoteWorkRequest(
        createDto,
        user_id,
      );

      expect(service.createRemoteWorkRequest).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('createDayOffRequest', () => {
    it('nên tạo đơn nghỉ phép thành công', async () => {
      const user_id = 1;
      const createDto: CreateDayOffRequestDto = {
        user_id,
        work_date: '2024-12-20',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.PAID,
        title: 'Nghỉ phép',
        reason: 'Lý do nghỉ phép',
      };
      const mockRequest = {
        id: 1,
        ...createDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.createDayOffRequest.mockResolvedValue(mockRequest);

      const result = await controller.createDayOffRequest(createDto, user_id);

      expect(service.createDayOffRequest).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('getAllMyRequests', () => {
    it('nên lấy danh sách requests của tôi thành công', async () => {
      const user_id = 1;
      const paginationDto: RequestPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResult = {
        data: [
          {
            id: 1,
            user_id: 1,
            request_type: 'REMOTE_WORK',
            status: ApprovalStatus.PENDING,
          },
        ],
        pagination: {
          current_page: 1,
          per_page: 10,
          total: 1,
          total_pages: 1,
        },
      };

      mockRequestsService.getAllMyRequests.mockResolvedValue(mockResult);

      const result = await controller.getAllMyRequests(user_id, paginationDto);

      expect(service.getAllMyRequests).toHaveBeenCalledWith(
        user_id,
        paginationDto,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('approveRequest', () => {
    it('nên duyệt request thành công', async () => {
      const type = AttendanceRequestType.DAY_OFF;
      const id = 1;
      const user = { id: 2 };
      const mockAuthContext = {
        userId: 2,
        canApproveRequest: jest.fn().mockResolvedValue(true),
      } as unknown as AuthorizationContext;
      const mockResult = {
        success: true,
        message: 'Đã duyệt đơn nghỉ phép thành công',
        data: {
          id: 1,
          status: ApprovalStatus.APPROVED,
        },
      };

      mockAuthorizationContextService.createContext.mockResolvedValue(
        mockAuthContext,
      );
      mockRequestsService.approveRequest.mockResolvedValue(mockResult);

      const result = await controller.approveRequest(type, id, user);

      expect(service.approveRequest).toHaveBeenCalledWith(
        type,
        id,
        mockAuthContext,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('rejectRequest', () => {
    it('nên từ chối request thành công', async () => {
      const type = 'day-off';
      const id = 1;
      const user = { id: 2 };
      const rejectedReason = 'Không có lý do chính đáng';
      const mockAuthContext = {
        userId: 2,
        canApproveRequest: jest.fn().mockResolvedValue(true),
      } as unknown as AuthorizationContext;
      const mockResult = {
        success: true,
        message: 'Đã từ chối đơn nghỉ phép',
        data: {
          id: 1,
          status: ApprovalStatus.REJECTED,
        },
      };

      mockAuthorizationContextService.createContext.mockResolvedValue(
        mockAuthContext,
      );
      mockRequestsService.rejectRequest.mockResolvedValue(mockResult);

      const result = await controller.rejectRequest(
        type,
        id,
        user,
        rejectedReason,
      );

      expect(service.rejectRequest).toHaveBeenCalledWith(
        type,
        id,
        mockAuthContext,
        rejectedReason,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('createOvertimeRequest', () => {
    it('nên tạo đơn làm thêm giờ thành công', async () => {
      const user_id = 1;
      const createDto: CreateOvertimeRequestDto = {
        user_id,
        work_date: '2024-12-20',
        start_time: '18:00',
        end_time: '20:00',
        title: 'Làm thêm giờ',
        reason: 'Hoàn thành dự án',
      };
      const mockRequest = {
        id: 1,
        ...createDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.createOvertimeRequest.mockResolvedValue(mockRequest);

      const result = await controller.createOvertimeRequest(createDto, user_id);

      expect(service.createOvertimeRequest).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('createLateEarlyRequest', () => {
    it('nên tạo đơn đi muộn/về sớm thành công', async () => {
      const user_id = 1;
      const createDto: CreateLateEarlyRequestDto = {
        user_id,
        work_date: '2024-12-20',
        request_type: 'LATE',
        late_minutes: 30,
        title: 'Đi muộn',
        reason: 'Kẹt xe',
      };
      const mockRequest = {
        id: 1,
        ...createDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.createLateEarlyRequest.mockResolvedValue(mockRequest);

      const result = await controller.createLateEarlyRequest(createDto, user_id);

      expect(service.createLateEarlyRequest).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('createForgotCheckinRequest', () => {
    it('nên tạo đơn bổ sung chấm công thành công', async () => {
      const user_id = 1;
      const createDto: CreateForgotCheckinRequestDto = {
        user_id,
        work_date: '2024-12-20',
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Bổ sung chấm công',
        reason: 'Quên chấm công',
      };
      const mockRequest = {
        id: 1,
        ...createDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.createForgotCheckinRequest.mockResolvedValue(
        mockRequest,
      );

      const result = await controller.createForgotCheckinRequest(
        createDto,
        user_id,
      );

      expect(service.createForgotCheckinRequest).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('getMyRequestsStats', () => {
    it('nên lấy thống kê requests thành công', async () => {
      const user_id = 1;
      const mockResult = {
        total: 10,
        pending: 3,
        approved: 5,
        rejected: 2,
      };

      mockRequestsService.getMyRequestsStats.mockResolvedValue(mockResult);

      const result = await controller.getMyRequestsStats(user_id);

      expect(service.getMyRequestsStats).toHaveBeenCalledWith(user_id);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getMyLeaveBalance', () => {
    it('nên lấy số dư phép thành công', async () => {
      const user_id = 1;
      const mockResult = {
        paid_leave_balance: 10,
        unpaid_leave_balance: 5,
      };

      mockRequestsService.getMyLeaveBalance.mockResolvedValue(mockResult);

      const result = await controller.getMyLeaveBalance(user_id);

      expect(service.getMyLeaveBalance).toHaveBeenCalledWith(user_id);
      expect(result).toEqual(mockResult);
    });
  });

  describe('checkLeaveBalanceAvailability', () => {
    it('nên kiểm tra số dư phép thành công', async () => {
      const user_id = 1;
      const leaveType = DayOffType.PAID;
      const requestedDays = 5;
      const mockResult = {
        available: true,
        current_balance: 10,
      };

      mockRequestsService.checkLeaveBalanceAvailability.mockResolvedValue(
        mockResult,
      );

      const result = await controller.checkLeaveBalanceAvailability(
        user_id,
        leaveType,
        requestedDays,
      );

      expect(service.checkLeaveBalanceAvailability).toHaveBeenCalledWith(
        user_id,
        leaveType,
        requestedDays,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getAllRequestQuotasAndBalances', () => {
    it('nên lấy quota và balance thành công', async () => {
      const user_id = 1;
      const mockResult = {
        forgot_checkin: { quota: 3, used: 1, remaining: 2 },
        late_early: { count_quota: 3, used_count: 1, remaining_count: 2 },
        leave_balance: { paid_leave_balance: 10, unpaid_leave_balance: 5 },
      };

      mockRequestsService.getAllRequestQuotasAndBalances.mockResolvedValue(
        mockResult,
      );

      const result = await controller.getAllRequestQuotasAndBalances(user_id);

      expect(service.getAllRequestQuotasAndBalances).toHaveBeenCalledWith(
        user_id,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getRequestById', () => {
    it('nên lấy request theo id thành công', async () => {
      const type = 'remote-work';
      const id = 1;
      const user = { id: 1 };
      const mockAuthContext = {
        userId: 1,
      } as unknown as AuthorizationContext;
      const mockRequest = {
        id: 1,
        user_id: 1,
        request_type: 'REMOTE_WORK',
        status: ApprovalStatus.PENDING,
      };

      mockAuthorizationContextService.createContext.mockResolvedValue(
        mockAuthContext,
      );
      mockRequestsService.getRequestById.mockResolvedValue(mockRequest);

      const result = await controller.getRequestById(type, id, user);

      expect(service.getRequestById).toHaveBeenCalledWith(
        id,
        type,
        mockAuthContext,
      );
      expect(result).toEqual(mockRequest);
    });
  });

  describe('getAllRequests', () => {
    it('nên lấy tất cả requests thành công', async () => {
      const user_id = 1;
      const paginationDto: RequestPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResult = {
        data: [
          {
            id: 1,
            user_id: 1,
            request_type: 'REMOTE_WORK',
            status: ApprovalStatus.PENDING,
          },
        ],
        pagination: {
          current_page: 1,
          per_page: 10,
          total: 1,
          total_pages: 1,
        },
      };

      mockRequestsService.getAllRequests.mockResolvedValue(mockResult);

      const result = await controller.getAllRequests(user_id, paginationDto);

      expect(service.getAllRequests).toHaveBeenCalledWith(
        paginationDto,
        user_id,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateRemoteWork', () => {
    it('nên cập nhật remote work request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateRemoteWorkRequestDto = {
        user_id,
        work_date: '2024-12-20',
        remote_type: RemoteType.REMOTE,
        duration: DayOffDuration.FULL_DAY,
        title: 'Cập nhật làm việc từ xa',
      };
      const mockResult = {
        id: 1,
        ...updateDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.updateRemoteWorkRequest.mockResolvedValue(mockResult);

      const result = await controller.updateRemoteWork(id, updateDto, user_id);

      expect(service.updateRemoteWorkRequest).toHaveBeenCalledWith(
        id,
        updateDto,
        user_id,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateDayOff', () => {
    it('nên cập nhật day off request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateDayOffRequestDto = {
        user_id,
        work_date: '2024-12-20',
        duration: DayOffDuration.FULL_DAY,
        type: DayOffType.PAID,
        title: 'Cập nhật nghỉ phép',
        reason: 'Lý do cập nhật',
      };
      const mockResult = {
        id: 1,
        ...updateDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.updateDayOffRequest.mockResolvedValue(mockResult);

      const result = await controller.updateDayOff(id, updateDto, user_id);

      expect(service.updateDayOffRequest).toHaveBeenCalledWith(
        id,
        updateDto,
        user_id,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateOvertime', () => {
    it('nên cập nhật overtime request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateOvertimeRequestDto = {
        user_id,
        work_date: '2024-12-20',
        start_time: '18:00',
        end_time: '20:00',
        title: 'Cập nhật làm thêm giờ',
      };
      const mockResult = {
        id: 1,
        ...updateDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.updateOvertimeRequest.mockResolvedValue(mockResult);

      const result = await controller.updateOvertime(id, updateDto, user_id);

      expect(service.updateOvertimeRequest).toHaveBeenCalledWith(
        id,
        updateDto,
        user_id,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateLateEarly', () => {
    it('nên cập nhật late early request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateLateEarlyRequestDto = {
        user_id,
        work_date: '2024-12-20',
        request_type: 'LATE',
        late_minutes: 30,
        title: 'Cập nhật đi muộn',
        reason: 'Lý do cập nhật',
      };
      const mockResult = {
        id: 1,
        ...updateDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.updateLateEarlyRequest.mockResolvedValue(mockResult);

      const result = await controller.updateLateEarly(id, updateDto, user_id);

      expect(service.updateLateEarlyRequest).toHaveBeenCalledWith(
        id,
        updateDto,
        user_id,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateForgotCheckin', () => {
    it('nên cập nhật forgot checkin request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateDto: CreateForgotCheckinRequestDto = {
        user_id,
        work_date: '2024-12-20',
        checkin_time: '08:30',
        checkout_time: '17:30',
        title: 'Cập nhật bổ sung chấm công',
        reason: 'Lý do cập nhật',
      };
      const mockResult = {
        id: 1,
        ...updateDto,
        status: ApprovalStatus.PENDING,
      };

      mockRequestsService.updateForgotCheckinRequest.mockResolvedValue(
        mockResult,
      );

      const result = await controller.updateForgotCheckin(
        id,
        updateDto,
        user_id,
      );

      expect(service.updateForgotCheckinRequest).toHaveBeenCalledWith(
        id,
        updateDto,
        user_id,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteRequest', () => {
    it('nên xóa request thành công', async () => {
      const id = 1;
      const user_id = 1;
      const mockResult = {
        success: true,
        message: 'Xóa thành công',
      };

      mockRequestsService.deleteRequest.mockResolvedValue(mockResult);

      const result = await controller.deleteRequest(id, user_id);

      expect(service.deleteRequest).toHaveBeenCalledWith(id, user_id);
      expect(result).toEqual(mockResult);
    });
  });
});
