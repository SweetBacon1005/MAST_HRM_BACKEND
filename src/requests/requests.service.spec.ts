import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
      expect(service.getAllRequests).toBeDefined();
      expect(service.getAllMyRequests).toBeDefined();
      
      // Update methods
      expect(service.updateRemoteWorkRequest).toBeDefined();
      expect(service.updateDayOffRequest).toBeDefined();
      expect(service.updateOvertimeRequest).toBeDefined();
      expect(service.updateLateEarlyRequest).toBeDefined();
      expect(service.updateForgotCheckinRequest).toBeDefined();
      
      // Delete method
      expect(service.deleteRequest).toBeDefined();
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

    describe('deleteRequest', () => {
      it('should throw NotFoundException when request not found', async () => {
        (service as any).attendanceRequestService.findOne.mockResolvedValue(null);

        await expect(
          service.deleteRequest(1, 1)
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user is not owner', async () => {
        (service as any).attendanceRequestService.findOne.mockResolvedValue({
          id: 1,
          user_id: 2,
          status: 'PENDING',
        });

        await expect(
          service.deleteRequest(1, 1)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw BadRequestException when status is not PENDING', async () => {
        (service as any).attendanceRequestService.findOne.mockResolvedValue({
          id: 1,
          user_id: 1,
          status: 'APPROVED',
        });

        await expect(
          service.deleteRequest(1, 1)
        ).rejects.toThrow(BadRequestException);
      });

      it('should successfully delete request', async () => {
        const mockRequest = {
          id: 1,
          user_id: 1,
          status: 'PENDING',
        };

        (service as any).attendanceRequestService.findOne.mockResolvedValue(mockRequest);
        (service as any).attendanceRequestService.softDelete.mockResolvedValue({
          ...mockRequest,
          deleted_at: new Date(),
        });

        const result = await service.deleteRequest(1, 1);

        expect(result.success).toBe(true);
        expect((service as any).attendanceRequestService.softDelete).toHaveBeenCalledWith(1);
      });
    });
  });
});