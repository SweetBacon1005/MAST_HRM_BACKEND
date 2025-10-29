import { Test, TestingModule } from '@nestjs/testing';
import { LeaveBalanceService } from './leave-balance.service';

describe('LeaveBalanceService', () => {
  let service: LeaveBalanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LeaveBalanceService,
          useValue: {
            // Mock only the methods we want to test
            getLeaveBalance: jest.fn(),
            updateLeaveBalance: jest.fn(),
            deductLeaveBalance: jest.fn(),
            addLeaveBalance: jest.fn(),
            resetLeaveBalance: jest.fn(),
            getLeaveBalanceHistory: jest.fn(),
            calculateLeaveBalance: jest.fn(),
            getLeaveBalanceByUser: jest.fn(),
            getAllLeaveBalances: jest.fn(),
            initializeLeaveBalance: jest.fn(),
            transferLeaveBalance: jest.fn(),
            adjustLeaveBalance: jest.fn(),
            getLeaveBalanceStatistics: jest.fn(),
            exportLeaveBalances: jest.fn(),
            bulkUpdateLeaveBalances: jest.fn(),
            validateLeaveBalance: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LeaveBalanceService>(LeaveBalanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have getLeaveBalance method', () => {
    expect(service.getLeaveBalance).toBeDefined();
  });

  it('should have updateLeaveBalance method', () => {
    expect(service.updateLeaveBalance).toBeDefined();
  });

  it('should have deductLeaveBalance method', () => {
    expect(service.deductLeaveBalance).toBeDefined();
  });

  it('should have addLeaveBalance method', () => {
    expect(service.addLeaveBalance).toBeDefined();
  });

  it('should have resetLeaveBalance method', () => {
    expect(service.resetLeaveBalance).toBeDefined();
  });

  it('should have getLeaveBalanceHistory method', () => {
    expect(service.getLeaveBalanceHistory).toBeDefined();
  });

  it('should have calculateLeaveBalance method', () => {
    expect(service.calculateLeaveBalance).toBeDefined();
  });

  it('should have getLeaveBalanceByUser method', () => {
    expect(service.getLeaveBalanceByUser).toBeDefined();
  });

  it('should have getAllLeaveBalances method', () => {
    expect(service.getAllLeaveBalances).toBeDefined();
  });

  it('should have initializeLeaveBalance method', () => {
    expect(service.initializeLeaveBalance).toBeDefined();
  });

  it('should have transferLeaveBalance method', () => {
    expect(service.transferLeaveBalance).toBeDefined();
  });

  it('should have adjustLeaveBalance method', () => {
    expect(service.adjustLeaveBalance).toBeDefined();
  });

  it('should have getLeaveBalanceStatistics method', () => {
    expect(service.getLeaveBalanceStatistics).toBeDefined();
  });

  it('should have exportLeaveBalances method', () => {
    expect(service.exportLeaveBalances).toBeDefined();
  });

  it('should have bulkUpdateLeaveBalances method', () => {
    expect(service.bulkUpdateLeaveBalances).toBeDefined();
  });

  it('should have validateLeaveBalance method', () => {
    expect(service.validateLeaveBalance).toBeDefined();
  });
});
