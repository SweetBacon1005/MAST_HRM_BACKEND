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
