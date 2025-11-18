import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from './requests.service';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { PermissionCheckerService } from '../auth/services/permission-checker.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';

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
    });
  });
});