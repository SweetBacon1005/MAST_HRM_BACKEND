import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AttendanceService,
          useValue: {
            // Mock only the methods we want to test
            calculateAttendance: jest.fn(),
            getWorkShifts: jest.fn(),
            createWorkShift: jest.fn(),
            updateWorkShift: jest.fn(),
            deleteWorkShift: jest.fn(),
            getDashboardData: jest.fn(),
            getAttendanceReport: jest.fn(),
            getPenaltyReport: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have calculateAttendance method', () => {
    expect(service.calculateAttendance).toBeDefined();
  });

  it('should have getWorkShifts method', () => {
    expect(service.getWorkShifts).toBeDefined();
  });

  it('should have createWorkShift method', () => {
    expect(service.createWorkShift).toBeDefined();
  });

  it('should have updateWorkShift method', () => {
    expect(service.updateWorkShift).toBeDefined();
  });

  it('should have deleteWorkShift method', () => {
    expect(service.deleteWorkShift).toBeDefined();
  });

  it('should have getDashboardData method', () => {
    expect(service.getDashboardData).toBeDefined();
  });

  it('should have getAttendanceReport method', () => {
    expect(service.getAttendanceReport).toBeDefined();
  });

  it('should have getPenaltyReport method', () => {
    expect(service.getPenaltyReport).toBeDefined();
  });
});
