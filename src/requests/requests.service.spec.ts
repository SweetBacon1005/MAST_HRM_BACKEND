import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from './requests.service';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { PermissionCheckerService } from '../auth/services/permission-checker.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { DayOffDuration, DayOffType, LateEarlyType, RemoteType } from '@prisma/client';

describe('RequestsService', () => {
  let service: RequestsService;

  beforeEach(async () => {
    const mockPrismaService = {
      users: { findFirst: jest.fn() },
      remote_work_requests: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      day_offs: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      over_times_history: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      late_early_requests: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      forgot_checkin_requests: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      time_sheets: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        update: jest.fn() 
      },
      projects: { findFirst: jest.fn() },
      user_information: { findFirst: jest.fn() },
      user_role_assignment: { findMany: jest.fn() },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const mockLeaveBalanceService = {
      getOrCreateLeaveBalance: jest.fn(),
      getLeaveBalanceStats: jest.fn(),
      getLeaveTransactionHistory: jest.fn(),
      deductLeaveBalance: jest.fn(),
      refundLeaveBalance: jest.fn(),
    };

    const mockPermissionChecker = {
      createUserContext: jest.fn(),
      canAccessRequest: jest.fn(),
    };

    const mockActivityLogService = {
      logRequestCreated: jest.fn(),
      logRequestUpdated: jest.fn(),
      logRequestDeleted: jest.fn(),
      logRequestView: jest.fn(),
    };

    const mockRoleAssignmentService = {
      getUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LeaveBalanceService, useValue: mockLeaveBalanceService },
        { provide: PermissionCheckerService, useValue: mockPermissionChecker },
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: RoleAssignmentService, useValue: mockRoleAssignmentService },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have getAllRequests method', () => {
    expect(service.getAllRequests).toBeDefined();
  });

  it('should have createRemoteWorkRequest method', () => {
    expect(service.createRemoteWorkRequest).toBeDefined();
  });

  it('should have createDayOffRequest method', () => {
    expect(service.createDayOffRequest).toBeDefined();
  });

  it('should have createOvertimeRequest method', () => {
    expect(service.createOvertimeRequest).toBeDefined();
  });

  it('should have createLateEarlyRequest method', () => {
    expect(service.createLateEarlyRequest).toBeDefined();
  });

  it('should have createForgotCheckinRequest method', () => {
    expect(service.createForgotCheckinRequest).toBeDefined();
  });

  it('should have approveRequest method', () => {
    expect(service.approveRequest).toBeDefined();
  });

  it('should have rejectRequest method', () => {
    expect(service.rejectRequest).toBeDefined();
  });

  it('should have getAllMyRequests method', () => {
    expect(service.getAllMyRequests).toBeDefined();
  });

  // Basic validation tests
  describe('Service Methods', () => {
    it('should have all required methods', () => {
      expect(service.createRemoteWorkRequest).toBeDefined();
      expect(service.createDayOffRequest).toBeDefined();
      expect(service.createOvertimeRequest).toBeDefined();
      expect(service.createLateEarlyRequest).toBeDefined();
      expect(service.createForgotCheckinRequest).toBeDefined();
      expect(service.approveRequest).toBeDefined();
      expect(service.rejectRequest).toBeDefined();
      expect(service.getAllRequests).toBeDefined();
      expect(service.getAllMyRequests).toBeDefined();
      expect(service.getMyLeaveBalance).toBeDefined();
      expect(service.findAllRemoteWorkRequests).toBeDefined();
      expect(service.findAllDayOffRequests).toBeDefined();
      expect(service.findAllOvertimeRequests).toBeDefined();
      expect(service.findAllLateEarlyRequests).toBeDefined();
      expect(service.findAllForgotCheckinRequests).toBeDefined();
      
      // Update methods
      expect(service.updateRemoteWorkRequest).toBeDefined();
      expect(service.updateDayOffRequest).toBeDefined();
      expect(service.updateOvertimeRequest).toBeDefined();
      expect(service.updateLateEarlyRequest).toBeDefined();
      expect(service.updateForgotCheckinRequest).toBeDefined();
      
      // Delete methods
      expect(service.deleteRemoteWorkRequest).toBeDefined();
      expect(service.deleteDayOffRequest).toBeDefined();
      expect(service.deleteOvertimeRequest).toBeDefined();
      expect(service.deleteLateEarlyRequest).toBeDefined();
      expect(service.deleteForgotCheckinRequest).toBeDefined();
    });
  });

  describe('Update Methods', () => {
    let mockPrismaService: any;
    let mockActivityLogService: any;

    beforeEach(() => {
      mockPrismaService = (service as any).prisma;
      mockActivityLogService = (service as any).activityLogService;
    });

    describe('updateRemoteWorkRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue(null);

        await expect(
          service.updateRemoteWorkRequest(1, { 
            user_id: 1, 
            work_date: '2024-01-15', 
            remote_type: RemoteType.OFFICE, 
            duration: 'FULL_DAY',
            title: 'Test',
            reason: 'Test'
          }, 1)
        ).rejects.toThrow('Không tìm thấy yêu cầu làm việc từ xa');
      });

      it('should throw ForbiddenException when user is not owner', async () => {
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue({
          id: 1,
          user_id: 2,
          status: 'REJECTED',
        });

        await expect(
          service.updateRemoteWorkRequest(1, { 
            user_id: 1, 
            work_date: '2024-01-15', 
            remote_type: RemoteType.OFFICE, 
            duration: DayOffDuration.FULL_DAY,
            title: 'Test',
            reason: 'Test'
          }, 1)
        ).rejects.toThrow('Không có quyền thực hiện hành động này');
      });

      it('should throw BadRequestException when status is not REJECTED', async () => {
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          status: 'PENDING',
        });

        await expect(
          service.updateRemoteWorkRequest(1, { 
            user_id: 1, 
            work_date: '2024-01-15', 
            remote_type: RemoteType.OFFICE, 
            duration: DayOffDuration.FULL_DAY,
            title: 'Test',
            reason: 'Test'
          }, 1)
        ).rejects.toThrow('Yêu cầu chỉ được cập nhật khi ở trạng thái BỊ TỪ CHỐI');
      });
    });

    describe('updateDayOffRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);

        await expect(
          service.updateDayOffRequest(1, { 
            user_id: 1, 
            work_date: '2024-01-15', 
            duration: DayOffDuration.FULL_DAY,
            type: DayOffType.PAID,
            title: 'Test',
            reason: 'Test'
          }, 1)
        ).rejects.toThrow('Không tìm thấy đơn nghỉ phép');
      });
    });

    describe('updateOvertimeRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.over_times_history.findFirst.mockResolvedValue(null);

        await expect(
          service.updateOvertimeRequest(1, { 
            user_id: 1, 
            work_date: '2024-01-15', 
            start_time: '18:00',
            end_time: '20:00',
            project_id: 1,
            title: 'Test',
            reason: 'Test'
          }, 1)
        ).rejects.toThrow('Không tìm thấy đơn làm thêm giờ');
      });
    });

    describe('updateLateEarlyRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.late_early_requests.findFirst.mockResolvedValue(null);

        await expect(
          service.updateLateEarlyRequest(1, { 
            user_id: 1, 
            work_date: '2024-01-15', 
            request_type: LateEarlyType.LATE,
            late_minutes: 30,
            title: 'Test',
            reason: 'Test'
          }, 1)
        ).rejects.toThrow('Không tìm thấy yêu cầu');
      });
    });

    describe('updateForgotCheckinRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.forgot_checkin_requests.findFirst.mockResolvedValue(null);

        await expect(
          service.updateForgotCheckinRequest(1, { 
            user_id: 1, 
            work_date: '2024-01-15', 
            checkin_time: '08:00',
            checkout_time: '17:00',
            title: 'Test',
            reason: 'Test'
          }, 1)
        ).rejects.toThrow('Không tìm thấy yêu cầu');
      });
    });
  });

  describe('Delete Methods', () => {
    let mockPrismaService: any;
    let mockActivityLogService: any;

    beforeEach(() => {
      mockPrismaService = (service as any).prisma;
      mockActivityLogService = (service as any).activityLogService;
    });

    describe('deleteRemoteWorkRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue(null);

        await expect(
          service.deleteRemoteWorkRequest(1, 1)
        ).rejects.toThrow('Không tìm thấy yêu cầu làm việc từ xa');
      });

      it('should throw ForbiddenException when user is not owner', async () => {
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue({
          id: 1,
          user_id: 2,
          status: 'PENDING',
        });

        await expect(
          service.deleteRemoteWorkRequest(1, 1)
        ).rejects.toThrow('Không có quyền thực hiện hành động này');
      });

      it('should throw BadRequestException when status is not PENDING', async () => {
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          status: 'APPROVED',
        });

        await expect(
          service.deleteRemoteWorkRequest(1, 1)
        ).rejects.toThrow('Chỉ có thể xóa yêu cầu ở trạng thái CHỜ DUYỆT');
      });

      it('should successfully delete request and log activity', async () => {
        const mockRequest = {
          id: 1,
          user_id: 1,
          status: 'PENDING',
        };

        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue(mockRequest);
        mockPrismaService.remote_work_requests.update.mockResolvedValue({
          ...mockRequest,
          deleted_at: new Date(),
        });

        const result = await service.deleteRemoteWorkRequest(1, 1);

        expect(result.deleted_at).toBeDefined();
        expect(mockActivityLogService.logRequestDeleted).toHaveBeenCalledWith(
          'remote_work',
          1,
          1,
        );
      });
    });

    describe('deleteDayOffRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);

        await expect(
          service.deleteDayOffRequest(1, 1)
        ).rejects.toThrow('Không tìm thấy đơn nghỉ phép');
      });

      it('should successfully delete request and log activity', async () => {
        const mockRequest = {
          id: 1,
          user_id: 1,
          status: 'PENDING',
        };

        mockPrismaService.day_offs.findFirst.mockResolvedValue(mockRequest);
        mockPrismaService.day_offs.update.mockResolvedValue({
          ...mockRequest,
          deleted_at: new Date(),
        });

        const result = await service.deleteDayOffRequest(1, 1);

        expect(result.deleted_at).toBeDefined();
        expect(mockActivityLogService.logRequestDeleted).toHaveBeenCalledWith(
          'day_off',
          1,
          1,
        );
      });
    });

    describe('deleteOvertimeRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.over_times_history.findFirst.mockResolvedValue(null);

        await expect(
          service.deleteOvertimeRequest(1, 1)
        ).rejects.toThrow('Không tìm thấy đơn làm thêm giờ');
      });

      it('should successfully delete request and log activity', async () => {
        const mockRequest = {
          id: 1,
          user_id: 1,
          status: 'PENDING',
        };

        mockPrismaService.over_times_history.findFirst.mockResolvedValue(mockRequest);
        mockPrismaService.over_times_history.update.mockResolvedValue({
          ...mockRequest,
          deleted_at: new Date(),
        });

        const result = await service.deleteOvertimeRequest(1, 1);

        expect(result.deleted_at).toBeDefined();
        expect(mockActivityLogService.logRequestDeleted).toHaveBeenCalledWith(
          'overtime',
          1,
          1,
        );
      });
    });

    describe('deleteLateEarlyRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.late_early_requests.findFirst.mockResolvedValue(null);

        await expect(
          service.deleteLateEarlyRequest(1, 1)
        ).rejects.toThrow('Không tìm thấy yêu cầu');
      });

      it('should successfully delete request and log activity', async () => {
        const mockRequest = {
          id: 1,
          user_id: 1,
          status: 'PENDING',
        };

        mockPrismaService.late_early_requests.findFirst.mockResolvedValue(mockRequest);
        mockPrismaService.late_early_requests.update.mockResolvedValue({
          ...mockRequest,
          deleted_at: new Date(),
        });

        const result = await service.deleteLateEarlyRequest(1, 1);

        expect(result.deleted_at).toBeDefined();
        expect(mockActivityLogService.logRequestDeleted).toHaveBeenCalledWith(
          'late_early',
          1,
          1,
        );
      });
    });

    describe('deleteForgotCheckinRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        mockPrismaService.forgot_checkin_requests.findFirst.mockResolvedValue(null);

        await expect(
          service.deleteForgotCheckinRequest(1, 1)
        ).rejects.toThrow('Không tìm thấy yêu cầu');
      });

      it('should successfully delete request and log activity', async () => {
        const mockRequest = {
          id: 1,
          user_id: 1,
          status: 'PENDING',
        };

        mockPrismaService.forgot_checkin_requests.findFirst.mockResolvedValue(mockRequest);
        mockPrismaService.forgot_checkin_requests.update.mockResolvedValue({
          ...mockRequest,
          deleted_at: new Date(),
        });

        const result = await service.deleteForgotCheckinRequest(1, 1);

        expect(result.deleted_at).toBeDefined();
        expect(mockActivityLogService.logRequestDeleted).toHaveBeenCalledWith(
          'forgot_checkin',
          1,
          1,
        );
      });
    });
  });
});