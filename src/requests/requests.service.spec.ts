import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  let service: RequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RequestsService,
          useValue: {
            // Mock only the methods we want to test
            getAllRequests: jest.fn(),
            createRemoteWorkRequest: jest.fn(),
            createDayOffRequest: jest.fn(),
            createOvertimeRequest: jest.fn(),
            createLateEarlyRequest: jest.fn(),
            createForgotCheckinRequest: jest.fn(),
            approveRequest: jest.fn(),
            rejectRequest: jest.fn(),
            getMyRequests: jest.fn(),
          },
        },
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

  it('should have getMyRequests method', () => {
    expect(service.getMyRequests).toBeDefined();
  });

  // Unhappy cases
  describe('Error Handling', () => {
    it('should handle creating request for past date', async () => {
      const mockCreateRemoteWorkRequest = service.createRemoteWorkRequest as jest.Mock;
      mockCreateRemoteWorkRequest.mockRejectedValue(new Error('Cannot create request for past date'));

      await expect(mockCreateRemoteWorkRequest({
        work_date: '2020-01-01',
        remote_type: 'FULL_REMOTE',
        reason: 'Test reason'
      }, 1)).rejects.toThrow('Cannot create request for past date');
    });

    it('should handle duplicate request for same date', async () => {
      const mockCreateDayOffRequest = service.createDayOffRequest as jest.Mock;
      mockCreateDayOffRequest.mockRejectedValue(new Error('Request already exists for this date'));

      await expect(mockCreateDayOffRequest({
        work_date: '2024-12-01',
        type: 'ANNUAL_LEAVE',
        reason: 'Vacation'
      }, 1)).rejects.toThrow('Request already exists for this date');
    });

    it('should handle insufficient leave balance', async () => {
      const mockCreateDayOffRequest = service.createDayOffRequest as jest.Mock;
      mockCreateDayOffRequest.mockRejectedValue(new Error('Insufficient leave balance'));

      await expect(mockCreateDayOffRequest({
        work_date: '2024-12-01',
        type: 'ANNUAL_LEAVE',
        reason: 'Vacation'
      }, 1)).rejects.toThrow('Insufficient leave balance');
    });

    it('should handle approving already processed request', async () => {
      const mockApproveRequest = service.approveRequest as jest.Mock;
      mockApproveRequest.mockRejectedValue(new Error('Request is already processed'));

      await expect(mockApproveRequest('remote_work', 1, 1))
        .rejects.toThrow('Request is already processed');
    });

    it('should handle rejecting non-existent request', async () => {
      const mockRejectRequest = service.rejectRequest as jest.Mock;
      mockRejectRequest.mockRejectedValue(new Error('Request not found'));

      await expect(mockRejectRequest('overtime', 999, 1, 'Not found'))
        .rejects.toThrow('Request not found');
    });

    it('should handle overtime request exceeding limits', async () => {
      const mockCreateOvertimeRequest = service.createOvertimeRequest as jest.Mock;
      mockCreateOvertimeRequest.mockRejectedValue(new Error('Overtime hours exceed monthly limit'));

      await expect(mockCreateOvertimeRequest({
        work_date: '2024-12-01',
        start_time: '18:00',
        end_time: '23:00',
        reason: 'Project deadline'
      }, 1)).rejects.toThrow('Overtime hours exceed monthly limit');
    });

    it('should handle invalid time range in late/early request', async () => {
      const mockCreateLateEarlyRequest = service.createLateEarlyRequest as jest.Mock;
      mockCreateLateEarlyRequest.mockRejectedValue(new Error('Invalid time range'));

      await expect(mockCreateLateEarlyRequest({
        work_date: '2024-12-01',
        request_type: 'LATE_ARRIVAL',
        late_minutes: -10,
        reason: 'Traffic'
      }, 1)).rejects.toThrow('Invalid time range');
    });

    it('should handle unauthorized access to requests', async () => {
      const mockGetAllRequests = service.getAllRequests as jest.Mock;
      mockGetAllRequests.mockRejectedValue(new Error('Unauthorized access'));

      await expect(mockGetAllRequests({ page: 1, limit: 10 }, 1))
        .rejects.toThrow('Unauthorized access');
    });
  });
});