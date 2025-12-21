import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from './requests.service';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { PermissionCheckerService } from '../auth/services/permission-checker.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, DayOffDuration, DayOffType, RemoteType } from '@prisma/client';

describe('RequestsService - Comprehensive Tests', () => {
  let service: RequestsService;
  let mockPrismaService: any;
  let mockLeaveBalanceService: any;
  let mockActivityLogService: any;
  let mockPermissionChecker: any;
  let mockRoleAssignmentService: any;

  beforeEach(async () => {
    mockPrismaService = {
      users: { findFirst: jest.fn() },
      remote_work_requests: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      day_offs: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      over_times_history: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      late_early_requests: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      forgot_checkin_requests: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      time_sheets: { 
        findFirst: jest.fn(), 
        create: jest.fn(), 
        update: jest.fn() 
      },
      projects: { 
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      user_information: { findFirst: jest.fn() },
      user_role_assignment: { findMany: jest.fn() },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrismaService);
        }
        return Promise.resolve();
      }),
    };

    mockLeaveBalanceService = {
      getOrCreateLeaveBalance: jest.fn(),
      getLeaveBalanceStats: jest.fn(),
      getLeaveTransactionHistory: jest.fn(),
      deductLeaveBalance: jest.fn(),
      refundLeaveBalance: jest.fn(),
    };

    mockPermissionChecker = {
      createUserContext: jest.fn(),
      canAccessRequest: jest.fn(),
    };

    mockActivityLogService = {
      logRequestCreated: jest.fn(),
      logRequestUpdated: jest.fn(),
      logRequestDeleted: jest.fn(),
      logRequestView: jest.fn(),
      logRequestApproval: jest.fn(),
    };

    mockRoleAssignmentService = {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CREATE REMOTE WORK REQUEST
  // ============================================================================
  describe('createRemoteWorkRequest', () => {
    const getFutureDate = (daysFromNow: number = 5) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    const validDto = {
      user_id: 1,
      work_date: getFutureDate(),
      remote_type: RemoteType.OFFICE,
      duration: DayOffDuration.FULL_DAY,
      title: 'Work from home',
      reason: 'Personal reasons',
    };

    describe('Validation Tests', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue(null);

        await expect(service.createRemoteWorkRequest(validDto))
          .rejects
          .toThrow(NotFoundException);
      });

      it('should throw BadRequestException when remote_type is OFFICE', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });

        await expect(service.createRemoteWorkRequest({
          ...validDto,
          remote_type: RemoteType.OFFICE,
        })).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when work_date is in the past', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        
        await expect(service.createRemoteWorkRequest({
          ...validDto,
          work_date: pastDate.toISOString().split('T')[0],
        })).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when request already exists for date', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          work_date: new Date(validDto.work_date),
        });

        await expect(service.createRemoteWorkRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });

      it('should throw BadRequestException when approved day off exists for same date', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue(null);
        mockPrismaService.day_offs.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          work_date: new Date(validDto.work_date),
          status: ApprovalStatus.APPROVED,
        });

        await expect(service.createRemoteWorkRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });
    });

    describe('Success Cases', () => {
      it('should successfully create remote work request with new timesheet', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue(null);
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);
        mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);
        
        const futureDate = new Date(validDto.work_date);
        
        const mockTimesheet = {
          id: 1,
          user_id: 1,
          work_date: futureDate,
          status: ApprovalStatus.PENDING,
          type: 'NORMAL',
        };
        
        const mockRequest = {
          id: 1,
          ...validDto,
          work_date: futureDate,
          status: ApprovalStatus.PENDING,
          timesheet_id: 1,
        };

        mockPrismaService.time_sheets.create.mockResolvedValue(mockTimesheet);
        mockPrismaService.time_sheets.update.mockResolvedValue(mockTimesheet);
        mockPrismaService.remote_work_requests.create.mockResolvedValue(mockRequest);

        const result = await service.createRemoteWorkRequest(validDto);

        expect(result).toEqual(mockRequest);
        expect(mockPrismaService.time_sheets.create).toHaveBeenCalled();
        expect(mockPrismaService.time_sheets.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { has_remote_work_request: true },
        });
        expect(mockActivityLogService.logRequestCreated).toHaveBeenCalledWith(
          'remote_work',
          1,
          1,
          expect.any(Object),
        );
      });

      it('should successfully create remote work request with existing timesheet', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.remote_work_requests.findFirst.mockResolvedValue(null);
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);
        
        const futureDate = new Date(validDto.work_date);
        
        const existingTimesheet = {
          id: 2,
          user_id: 1,
          work_date: futureDate,
        };
        
        mockPrismaService.time_sheets.findFirst.mockResolvedValue(existingTimesheet);
        mockPrismaService.time_sheets.update.mockResolvedValue(existingTimesheet);
        
        const mockRequest = {
          id: 1,
          ...validDto,
          work_date: futureDate,
          status: ApprovalStatus.PENDING,
          timesheet_id: 2,
        };

        mockPrismaService.remote_work_requests.create.mockResolvedValue(mockRequest);

        const result = await service.createRemoteWorkRequest(validDto);

        expect(result).toEqual(mockRequest);
        expect(mockPrismaService.time_sheets.create).not.toHaveBeenCalled();
        expect(mockPrismaService.time_sheets.update).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // CREATE DAY OFF REQUEST
  // ============================================================================
  describe('createDayOffRequest', () => {
    const getFutureDate = (daysFromNow: number = 5) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    const validDto = {
      user_id: 1,
      work_date: getFutureDate(),
      duration: 'FULL_DAY' as const,
      type: DayOffType.PAID,
      title: 'Annual leave',
      reason: 'Family vacation',
    };

    describe('Leave Balance Validation', () => {
      it('should throw BadRequestException when insufficient paid leave balance', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);
        mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue({
          paid_leave_balance: 0.5,
          unpaid_leave_balance: 10,
        });

        await expect(service.createDayOffRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });

      it('should allow unpaid leave without balance check', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);
        
        const mockRequest = {
          id: 1,
          ...validDto,
          type: DayOffType.UNPAID,
          work_date: new Date(validDto.work_date),
          status: ApprovalStatus.PENDING,
        };

        mockPrismaService.day_offs.create.mockResolvedValue(mockRequest);

        const result = await service.createDayOffRequest({
          ...validDto,
          type: DayOffType.UNPAID,
        });

        expect(result).toEqual(mockRequest);
        expect(mockLeaveBalanceService.getOrCreateLeaveBalance).not.toHaveBeenCalled();
      });

      it('should allow half day request with 0.5 balance', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);
        mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue({
          paid_leave_balance: 0.5,
          unpaid_leave_balance: 10,
        });

        const mockRequest = {
          id: 1,
          ...validDto,
          duration: 'MORNING',
          work_date: new Date(validDto.work_date),
          status: ApprovalStatus.PENDING,
        };

        mockPrismaService.day_offs.create.mockResolvedValue(mockRequest);

        const result = await service.createDayOffRequest({
          ...validDto,
          duration: 'MORNING',
        });

        expect(result).toBeDefined();
      });
    });

    describe('Conflict Detection', () => {
      it('should throw BadRequestException when day off already exists', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.day_offs.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          work_date: new Date(validDto.work_date),
          status: ApprovalStatus.PENDING,
        });

        await expect(service.createDayOffRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });
    });

    describe('Success Cases', () => {
      it('should successfully create paid day off request', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.day_offs.findFirst.mockResolvedValue(null);
        mockLeaveBalanceService.getOrCreateLeaveBalance.mockResolvedValue({
          paid_leave_balance: 10,
          unpaid_leave_balance: 5,
        });

        const mockRequest = {
          id: 1,
          ...validDto,
          work_date: new Date(validDto.work_date),
          status: ApprovalStatus.PENDING,
        };

        mockPrismaService.day_offs.create.mockResolvedValue(mockRequest);

        const result = await service.createDayOffRequest(validDto);

        expect(result).toEqual(mockRequest);
        expect(mockLeaveBalanceService.getOrCreateLeaveBalance).toHaveBeenCalledWith(1);
      });
    });
  });

  // ============================================================================
  // CREATE OVERTIME REQUEST
  // ============================================================================
  describe('createOvertimeRequest', () => {
    const getFutureDate = (daysFromNow: number = 5) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    const validDto = {
      user_id: 1,
      work_date: getFutureDate(),
      start_time: '18:00',
      end_time: '20:00',
      project_id: 1,
      title: 'Urgent bug fix',
      reason: 'Production issue',
    };

    describe('Project Validation', () => {
      it('should throw BadRequestException when project does not exist', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.projects.findFirst.mockResolvedValue(null);

        await expect(service.createOvertimeRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });
    });

    describe('Time Validation', () => {
      it('should throw BadRequestException when overtime overlaps work hours', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.projects.findFirst.mockResolvedValue({ id: 1, name: 'Project A' });
        mockPrismaService.over_times_history.findFirst.mockResolvedValue(null);

        await expect(service.createOvertimeRequest({
          ...validDto,
          start_time: '08:00',
          end_time: '10:00',
        })).rejects.toThrow(BadRequestException);
      });

      it('should allow overtime before work hours', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.projects.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.over_times_history.findFirst.mockResolvedValue(null);

        const mockRequest = {
          id: 1,
          ...validDto,
          start_time: new Date('2025-01-15T06:00:00'),
          end_time: new Date('2025-01-15T08:00:00'),
          total_hours: 2,
          work_date: new Date('2025-01-15'),
          status: ApprovalStatus.PENDING,
        };

        mockPrismaService.over_times_history.create.mockResolvedValue(mockRequest);

        const result = await service.createOvertimeRequest({
          ...validDto,
          start_time: '06:00',
          end_time: '08:00',
        });

        expect(result).toBeDefined();
      });

      it('should allow overtime after work hours', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.projects.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.over_times_history.findFirst.mockResolvedValue(null);

        const futureDate = new Date(validDto.work_date);
        const mockRequest = {
          id: 1,
          ...validDto,
          start_time: new Date(`${validDto.work_date}T18:00:00`),
          end_time: new Date(`${validDto.work_date}T20:00:00`),
          total_hours: 2,
          work_date: futureDate,
          status: ApprovalStatus.PENDING,
        };

        mockPrismaService.over_times_history.create.mockResolvedValue(mockRequest);

        const result = await service.createOvertimeRequest(validDto);

        expect(result).toBeDefined();
      });
    });

    describe('Conflict Detection', () => {
      it('should throw BadRequestException when overtime already exists', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.projects.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.over_times_history.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          work_date: new Date(validDto.work_date),
          status: ApprovalStatus.PENDING,
        });

        await expect(service.createOvertimeRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });
    });

    describe('Time Calculation', () => {
      it('should correctly calculate total hours', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.projects.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.over_times_history.findFirst.mockResolvedValue(null);

        const futureDate = new Date(validDto.work_date);
        const mockRequest = {
          id: 1,
          user_id: 1,
          work_date: futureDate,
          start_time: new Date(`${validDto.work_date}T18:00:00`),
          end_time: new Date(`${validDto.work_date}T21:30:00`),
          total_hours: 3.5,
          project_id: 1,
          status: ApprovalStatus.PENDING,
        };

        mockPrismaService.over_times_history.create.mockResolvedValue(mockRequest);

        const result = await service.createOvertimeRequest({
          ...validDto,
          start_time: '18:00',
          end_time: '21:30',
        });

        expect(result).toBeDefined();
      });
    });
  });

  // ============================================================================
  // CREATE LATE EARLY REQUEST
  // ============================================================================
  describe('createLateEarlyRequest', () => {
    const getFutureDate = (daysFromNow: number = 5) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    const validDto = {
      user_id: 1,
      work_date: getFutureDate(),
      request_type: 'LATE' as const,
      late_minutes: 30,
      title: 'Late arrival',
      reason: 'Traffic jam',
    };

    describe('Minutes Validation', () => {
      it('should throw BadRequestException when LATE type without late_minutes', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.late_early_requests.findFirst.mockResolvedValue(null);

        await expect(service.createLateEarlyRequest({
          ...validDto,
          late_minutes: undefined,
        })).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when EARLY type without early_minutes', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.late_early_requests.findFirst.mockResolvedValue(null);

        await expect(service.createLateEarlyRequest({
          ...validDto,
          request_type: 'EARLY',
          late_minutes: undefined,
          early_minutes: undefined,
        })).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when BOTH type missing either minutes', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.late_early_requests.findFirst.mockResolvedValue(null);

        await expect(service.createLateEarlyRequest({
          ...validDto,
          request_type: 'BOTH',
          early_minutes: undefined,
        })).rejects.toThrow(BadRequestException);
      });

      it('should accept valid BOTH request with both minutes', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.late_early_requests.findFirst.mockResolvedValue(null);
        mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);

        const futureDate = new Date(validDto.work_date);
        const mockRequest = {
          id: 1,
          user_id: 1,
          work_date: futureDate,
          request_type: 'BOTH',
          late_minutes: 30,
          early_minutes: 20,
          status: ApprovalStatus.PENDING,
        };

        mockPrismaService.late_early_requests.create.mockResolvedValue(mockRequest);

        const result = await service.createLateEarlyRequest({
          ...validDto,
          request_type: 'BOTH',
          early_minutes: 20,
        });

        expect(result).toBeDefined();
        expect(result.late_minutes).toBe(30);
        expect(result.early_minutes).toBe(20);
      });
    });

    describe('Conflict Detection', () => {
      it('should throw BadRequestException when request exists for date', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.late_early_requests.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          work_date: new Date(validDto.work_date),
        });

        await expect(service.createLateEarlyRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });
    });
  });

  // ============================================================================
  // CREATE FORGOT CHECKIN REQUEST
  // ============================================================================
  describe('createForgotCheckinRequest', () => {
    const getPastDate = (daysAgo: number = 1) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString().split('T')[0];
    };

    const validDto = {
      user_id: 1,
      work_date: getPastDate(),
      checkin_time: '08:00',
      checkout_time: '17:00',
      title: 'Forgot to check in',
      reason: 'System issue',
    };

    describe('Date Validation', () => {
      it('should throw BadRequestException for future date', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        await expect(service.createForgotCheckinRequest({
          ...validDto,
          work_date: futureDate.toISOString().split('T')[0],
        })).rejects.toThrow(BadRequestException);
      });
    });

    describe('Time Range Validation', () => {
      it('should throw BadRequestException when checkout before checkin', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.forgot_checkin_requests.findFirst.mockResolvedValue(null);

        await expect(service.createForgotCheckinRequest({
          ...validDto,
          checkin_time: '17:00',
          checkout_time: '08:00',
        })).rejects.toThrow(BadRequestException);
      });

      it('should accept valid time range', async () => {
        const pastDate = new Date(validDto.work_date);

        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.forgot_checkin_requests.findFirst.mockResolvedValue(null);
        mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);

        const mockRequest = {
          id: 1,
          user_id: 1,
          user: {
            id: 1,
            email: 'test@test.com',
            user_information: { name: 'Test User' },
          },
          approved_by_user: null,
          work_date: pastDate,
          checkin_time: new Date(`${validDto.work_date}T08:00:00`),
          checkout_time: new Date(`${validDto.work_date}T17:00:00`),
          status: ApprovalStatus.PENDING,
          created_at: new Date(),
          updated_at: new Date(),
          approved_at: null,
          title: validDto.title,
          reason: validDto.reason,
        };

        mockPrismaService.forgot_checkin_requests.create.mockResolvedValue(mockRequest);

        const result = await service.createForgotCheckinRequest(validDto);

        expect(result).toBeDefined();
      });
    });

    describe('Conflict Detection', () => {
      it('should throw BadRequestException when request exists', async () => {
        mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.forgot_checkin_requests.findFirst.mockResolvedValue({
          id: 1,
          user_id: 1,
          work_date: new Date(validDto.work_date),
        });

        await expect(service.createForgotCheckinRequest(validDto))
          .rejects
          .toThrow(BadRequestException);
      });
    });
  });

  // ============================================================================
  // UPDATE REMOTE WORK REQUEST - COMPREHENSIVE
  // ============================================================================
  describe('updateRemoteWorkRequest - Comprehensive', () => {
    const getFutureDate = (daysFromNow: number = 10) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    const updateDto = {
      user_id: 1,
      work_date: getFutureDate(),
      remote_type: RemoteType.OFFICE,
      duration: DayOffDuration.FULL_DAY,
      title: 'Updated',
      reason: 'Updated reason',
    };

    it('should successfully update rejected request', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const existingRequest = {
        id: 1,
        user_id: 1,
        status: ApprovalStatus.REJECTED,
        work_date: pastDate,
      };

      mockPrismaService.remote_work_requests.findFirst
        .mockResolvedValueOnce(existingRequest) // First call for existing check
        .mockResolvedValueOnce(null); // Second call for conflict check

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.day_offs.findFirst.mockResolvedValue(null);

      const updatedRequest = {
        ...existingRequest,
        ...updateDto,
        work_date: new Date(updateDto.work_date),
        status: ApprovalStatus.PENDING,
        approved_by: null,
        approved_at: null,
        rejected_reason: null,
      };

      mockPrismaService.remote_work_requests.update.mockResolvedValue(updatedRequest);

      const result = await service.updateRemoteWorkRequest(1, updateDto, 1);

      expect(result.status).toBe(ApprovalStatus.PENDING);
      expect(mockActivityLogService.logRequestUpdated).toHaveBeenCalledWith(
        'remote_work',
        1,
        1,
        expect.any(Object),
      );
    });

    it('should validate no conflicting requests on new date', async () => {
      const existingRequest = {
        id: 1,
        user_id: 1,
        status: ApprovalStatus.REJECTED,
      };

      mockPrismaService.remote_work_requests.findFirst
        .mockResolvedValueOnce(existingRequest)
        .mockResolvedValueOnce({ id: 2, user_id: 1 }); // Conflict on new date

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.updateRemoteWorkRequest(1, updateDto, 1))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // APPROVE DAY OFF REQUEST
  // ============================================================================
  describe('Approve Day Off Request', () => {
    it('should successfully approve paid day off and deduct leave balance', async () => {
      const request = {
        id: 1,
        user_id: 1,
        type: DayOffType.PAID,
        duration: 'FULL_DAY',
        work_date: new Date('2025-01-15'),
        status: ApprovalStatus.PENDING,
        reason: 'Vacation',
      };

      mockPrismaService.day_offs.findFirst.mockResolvedValue(request);
      mockPrismaService.day_offs.update.mockResolvedValue({
        ...request,
        status: ApprovalStatus.APPROVED,
        approved_by: 2,
        approved_at: new Date(),
      });

      mockRoleAssignmentService.getUserRoles
        .mockResolvedValueOnce({
          roles: [{ name: 'DIVISION_HEAD', scope_type: 'DIVISION', scope_id: 1 }],
        })
        .mockResolvedValueOnce({
          roles: [{ name: 'EMPLOYEE', scope_type: 'DIVISION', scope_id: 1 }],
        });

      mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.create.mockResolvedValue({
        id: 1,
        user_id: 1,
        work_date: new Date('2025-01-15'),
      });

      const result = await (service as any).approveDayOffRequest(1, 2, 'DIVISION_HEAD');

      expect(result.success).toBe(true);
      expect(mockLeaveBalanceService.deductLeaveBalance).toHaveBeenCalledWith(
        1,
        1,
        DayOffType.PAID,
        1,
        expect.any(String),
      );
    });

    it('should create timesheet with correct work hours for morning leave', async () => {
      const request = {
        id: 1,
        user_id: 1,
        type: DayOffType.PAID,
        duration: 'MORNING',
        work_date: new Date('2025-01-15'),
        status: ApprovalStatus.PENDING,
      };

      mockPrismaService.day_offs.findFirst.mockResolvedValue(request);
      mockPrismaService.day_offs.update.mockResolvedValue({
        ...request,
        status: ApprovalStatus.APPROVED,
      });

      mockRoleAssignmentService.getUserRoles
        .mockResolvedValueOnce({
          roles: [{ name: 'DIVISION_HEAD', scope_type: 'DIVISION', scope_id: 1 }],
        })
        .mockResolvedValueOnce({
          roles: [{ name: 'EMPLOYEE', scope_type: 'DIVISION', scope_id: 1 }],
        });

      mockPrismaService.time_sheets.findFirst.mockResolvedValue(null);
      mockPrismaService.time_sheets.create.mockResolvedValue({
        id: 1,
        work_time_morning: 0,
        work_time_afternoon: 240,
        total_work_time: 240,
      });

      await (service as any).approveDayOffRequest(1, 2, 'DIVISION_HEAD');

      expect(mockPrismaService.time_sheets.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          work_time_morning: 0,
          work_time_afternoon: 240,
          total_work_time: 240,
        }),
      });
    });
  });

  // ============================================================================
  // REJECT DAY OFF REQUEST
  // ============================================================================
  describe('Reject Day Off Request', () => {
    it('should refund leave balance when rejecting approved paid leave', async () => {
      const request = {
        id: 1,
        user_id: 1,
        type: DayOffType.PAID,
        duration: 'FULL_DAY',
        status: ApprovalStatus.APPROVED,
      };

      mockPrismaService.day_offs.findFirst.mockResolvedValue(request);
      mockPrismaService.day_offs.update.mockResolvedValue({
        ...request,
        status: ApprovalStatus.REJECTED,
      });

      mockRoleAssignmentService.getUserRoles
        .mockResolvedValueOnce({
          roles: [{ name: 'DIVISION_HEAD', scope_type: 'DIVISION', scope_id: 1 }],
        })
        .mockResolvedValueOnce({
          roles: [{ name: 'EMPLOYEE', scope_type: 'DIVISION', scope_id: 1 }],
        });

      const result = await (service as any).rejectDayOffRequest(
        1,
        2,
        'DIVISION_HEAD',
        'Change of plans',
      );

      expect(result.success).toBe(true);
      expect(mockLeaveBalanceService.refundLeaveBalance).toHaveBeenCalledWith(
        1,
        1,
        DayOffType.PAID,
        1,
        expect.stringContaining('Change of plans'),
      );
    });
  });

  // ============================================================================
  // GET MY REQUESTS STATS
  // ============================================================================
  describe('getMyRequestsStats', () => {
    it('should return aggregated stats from all request types', async () => {
      mockPrismaService.remote_work_requests.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { status: 2 } },
        { status: 'APPROVED', _count: { status: 3 } },
      ]);

      mockPrismaService.day_offs.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { status: 1 } },
        { status: 'REJECTED', _count: { status: 1 } },
      ]);

      mockPrismaService.over_times_history.groupBy.mockResolvedValue([
        { status: 'APPROVED', _count: { status: 2 } },
      ]);

      mockPrismaService.late_early_requests.groupBy.mockResolvedValue([]);
      mockPrismaService.forgot_checkin_requests.groupBy.mockResolvedValue([]);

      const result = await service.getMyRequestsStats(1);

      expect(result.total).toBe(9);
      expect(result.pending).toBe(3);
      expect(result.approved).toBe(5);
      expect(result.rejected).toBe(1);
      expect(result.by_type).toBeDefined();
    });
  });

  // ============================================================================
  // PERMISSION CHECKING
  // ============================================================================
  describe('Permission Checking', () => {
    it('should allow division head to approve requests in their division', async () => {
      mockRoleAssignmentService.getUserRoles
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'DIVISION_HEAD', 
              scope_type: 'DIVISION', 
              scope_id: 1 
            },
          ],
        })
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'EMPLOYEE', 
              scope_type: 'DIVISION', 
              scope_id: 1 
            },
          ],
        });

      const canApprove = await (service as any).canApproveRequest(2, 'DIVISION_HEAD', 1);

      expect(canApprove).toBe(true);
    });

    it('should deny division head from approving requests outside their division', async () => {
      mockRoleAssignmentService.getUserRoles
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'DIVISION_HEAD', 
              scope_type: 'DIVISION', 
              scope_id: 1 
            },
          ],
        })
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'EMPLOYEE', 
              scope_type: 'DIVISION', 
              scope_id: 2 
            },
          ],
        });

      const canApprove = await (service as any).canApproveRequest(2, 'DIVISION_HEAD', 1);

      expect(canApprove).toBe(false);
    });

    it('should allow team leader to approve team member requests', async () => {
      mockRoleAssignmentService.getUserRoles
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'TEAM_LEADER', 
              scope_type: 'TEAM', 
              scope_id: 5 
            },
          ],
        })
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'EMPLOYEE', 
              scope_type: 'TEAM', 
              scope_id: 5 
            },
          ],
        });

      const canApprove = await (service as any).canApproveRequest(2, 'TEAM_LEADER', 1);

      expect(canApprove).toBe(true);
    });

    it('should allow project manager to approve team requests', async () => {
      mockRoleAssignmentService.getUserRoles
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'PROJECT_MANAGER', 
              scope_type: 'PROJECT', 
              scope_id: 10 
            },
          ],
        })
        .mockResolvedValueOnce({
          roles: [
            { 
              name: 'EMPLOYEE', 
              scope_type: 'TEAM', 
              scope_id: 5 
            },
          ],
        });

      mockPrismaService.projects.findMany.mockResolvedValue([
        { id: 10, team_id: 5 },
      ]);

      const canApprove = await (service as any).canApproveRequest(2, 'PROJECT_MANAGER', 1);

      expect(canApprove).toBe(true);
    });
  });
});
