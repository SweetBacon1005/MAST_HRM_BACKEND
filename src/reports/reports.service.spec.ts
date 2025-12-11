import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ReportsService,
          useValue: {
            // Mock only the methods we want to test
            generateTimesheetReport: jest.fn(),
            generateAttendanceReport: jest.fn(),
            generateUserReport: jest.fn(),
            generateProjectReport: jest.fn(),
            generateDivisionReport: jest.fn(),
            generateLeaveReport: jest.fn(),
            generateOvertimeReport: jest.fn(),
            generateAssetReport: jest.fn(),
            getReportsList: jest.fn(),
            downloadReport: jest.fn(),
            scheduleReport: jest.fn(),
            cancelScheduledReport: jest.fn(),
            getScheduledReports: jest.fn(),
            exportReportToPDF: jest.fn(),
            exportReportToExcel: jest.fn(),
            exportReportToCSV: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have generateTimesheetReport method', () => {
    expect(service.generateTimesheetReport).toBeDefined();
  });

  it('should have generateAttendanceReport method', () => {
    expect(service.generateAttendanceReport).toBeDefined();
  });

  it('should have generateUserReport method', () => {
    expect(service.generateUserReport).toBeDefined();
  });

  it('should have generateProjectReport method', () => {
    expect(service.generateProjectReport).toBeDefined();
  });

  it('should have generateDivisionReport method', () => {
    expect(service.generateDivisionReport).toBeDefined();
  });

  it('should have generateLeaveReport method', () => {
    expect(service.generateLeaveReport).toBeDefined();
  });

  it('should have generateOvertimeReport method', () => {
    expect(service.generateOvertimeReport).toBeDefined();
  });

  it('should have generateAssetReport method', () => {
    expect(service.generateAssetReport).toBeDefined();
  });

  it('should have getReportsList method', () => {
    expect(service.getReportsList).toBeDefined();
  });

  it('should have downloadReport method', () => {
    expect(service.downloadReport).toBeDefined();
  });

  it('should have scheduleReport method', () => {
    expect(service.scheduleReport).toBeDefined();
  });

  it('should have cancelScheduledReport method', () => {
    expect(service.cancelScheduledReport).toBeDefined();
  });

  it('should have getScheduledReports method', () => {
    expect(service.getScheduledReports).toBeDefined();
  });

  it('should have exportReportToPDF method', () => {
    expect(service.exportReportToPDF).toBeDefined();
  });

  it('should have exportReportToExcel method', () => {
    expect(service.exportReportToExcel).toBeDefined();
  });

  it('should have exportReportToCSV method', () => {
    expect(service.exportReportToCSV).toBeDefined();
  });
});
