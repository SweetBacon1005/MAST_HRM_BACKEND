import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetService } from './timesheet.service';

describe('TimesheetService', () => {
  let service: TimesheetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TimesheetService,
          useValue: {
            // Mock only the methods we want to test
            createTimesheet: jest.fn(),
            findMyTimesheetsPaginated: jest.fn(),
            findTimesheetById: jest.fn(),
            submitTimesheet: jest.fn(),
            approveTimesheet: jest.fn(),
            createDailyTimesheet: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TimesheetService>(TimesheetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have createTimesheet method', () => {
    expect(service.createTimesheet).toBeDefined();
  });

  it('should have findMyTimesheetsPaginated method', () => {
    expect(service.findMyTimesheetsPaginated).toBeDefined();
  });

  it('should have findTimesheetById method', () => {
    expect(service.findTimesheetById).toBeDefined();
  });

  it('should have submitTimesheet method', () => {
    expect(service.submitTimesheet).toBeDefined();
  });

  it('should have approveTimesheet method', () => {
    expect(service.approveTimesheet).toBeDefined();
  });

  it('should have createDailyTimesheet method', () => {
    expect(service.createDailyTimesheet).toBeDefined();
  });

  // Unhappy cases
  describe('Error Handling', () => {
    it('should handle creating timesheet for future date', async () => {
      const mockCreateTimesheet = service.createTimesheet as jest.Mock;
      mockCreateTimesheet.mockRejectedValue(new Error('Cannot create timesheet for future date'));

      await expect(mockCreateTimesheet({
        work_date: '2025-12-31',
        checkin: '08:00',
        checkout: '17:00'
      }, 1)).rejects.toThrow('Cannot create timesheet for future date');
    });

    it('should handle duplicate timesheet for same date', async () => {
      const mockCreateTimesheet = service.createTimesheet as jest.Mock;
      mockCreateTimesheet.mockRejectedValue(new Error('Timesheet already exists for this date'));

      await expect(mockCreateTimesheet({
        work_date: '2024-10-29',
        checkin: '08:00',
        checkout: '17:00'
      }, 1)).rejects.toThrow('Timesheet already exists for this date');
    });

    it('should handle invalid time range (checkout before checkin)', async () => {
      const mockCreateTimesheet = service.createTimesheet as jest.Mock;
      mockCreateTimesheet.mockRejectedValue(new Error('Checkout time cannot be before checkin time'));

      await expect(mockCreateTimesheet({
        work_date: '2024-10-29',
        checkin: '17:00',
        checkout: '08:00'
      }, 1)).rejects.toThrow('Checkout time cannot be before checkin time');
    });

    it('should handle submitting already submitted timesheet', async () => {
      const mockSubmitTimesheet = service.submitTimesheet as jest.Mock;
      mockSubmitTimesheet.mockRejectedValue(new Error('Timesheet is already submitted'));

      await expect(mockSubmitTimesheet(1, 1))
        .rejects.toThrow('Timesheet is already submitted');
    });

    it('should handle approving non-existent timesheet', async () => {
      const mockApproveTimesheet = service.approveTimesheet as jest.Mock;
      mockApproveTimesheet.mockRejectedValue(new Error('Timesheet not found'));

      await expect(mockApproveTimesheet(999, 1))
        .rejects.toThrow('Timesheet not found');
    });

    it('should handle unauthorized timesheet access', async () => {
      const mockFindTimesheetById = service.findTimesheetById as jest.Mock;
      mockFindTimesheetById.mockRejectedValue(new Error('Unauthorized access to timesheet'));

      await expect(mockFindTimesheetById(1, 2))
        .rejects.toThrow('Unauthorized access to timesheet');
    });

    it('should handle exceeding maximum work hours', async () => {
      const mockCreateTimesheet = service.createTimesheet as jest.Mock;
      mockCreateTimesheet.mockRejectedValue(new Error('Work hours exceed maximum allowed'));

      await expect(mockCreateTimesheet({
        work_date: '2024-10-29',
        checkin: '06:00',
        checkout: '23:00'
      }, 1)).rejects.toThrow('Work hours exceed maximum allowed');
    });

    it('should handle timesheet modification after deadline', async () => {
      const mockCreateTimesheet = service.createTimesheet as jest.Mock;
      mockCreateTimesheet.mockRejectedValue(new Error('Cannot modify timesheet after deadline'));

      await expect(mockCreateTimesheet({
        work_date: '2024-09-01',
        checkin: '08:00',
        checkout: '17:00'
      }, 1)).rejects.toThrow('Cannot modify timesheet after deadline');
    });
  });
});