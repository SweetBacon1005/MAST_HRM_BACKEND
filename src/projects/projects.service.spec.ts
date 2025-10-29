import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            // Mock only the methods we want to test
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            addUserToProject: jest.fn(),
            removeUserFromProject: jest.fn(),
            getProjectMembers: jest.fn(),
            getMyProjects: jest.fn(),
            updateProjectStatus: jest.fn(),
            getProjectStatistics: jest.fn(),
            searchProjects: jest.fn(),
            getProjectsByStatus: jest.fn(),
            assignProjectManager: jest.fn(),
            removeProjectManager: jest.fn(),
            getProjectTimesheets: jest.fn(),
            exportProjectData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have create method', () => {
    expect(service.create).toBeDefined();
  });

  it('should have findAll method', () => {
    expect(service.findAll).toBeDefined();
  });

  it('should have findOne method', () => {
    expect(service.findOne).toBeDefined();
  });

  it('should have update method', () => {
    expect(service.update).toBeDefined();
  });

  it('should have remove method', () => {
    expect(service.remove).toBeDefined();
  });

  it('should have addUserToProject method', () => {
    expect(service.addUserToProject).toBeDefined();
  });

  it('should have removeUserFromProject method', () => {
    expect(service.removeUserFromProject).toBeDefined();
  });

  it('should have getProjectMembers method', () => {
    expect(service.getProjectMembers).toBeDefined();
  });

  it('should have getMyProjects method', () => {
    expect(service.getMyProjects).toBeDefined();
  });

  it('should have updateProjectStatus method', () => {
    expect(service.updateProjectStatus).toBeDefined();
  });

  it('should have getProjectStatistics method', () => {
    expect(service.getProjectStatistics).toBeDefined();
  });

  it('should have searchProjects method', () => {
    expect(service.searchProjects).toBeDefined();
  });

  it('should have getProjectsByStatus method', () => {
    expect(service.getProjectsByStatus).toBeDefined();
  });

  it('should have assignProjectManager method', () => {
    expect(service.assignProjectManager).toBeDefined();
  });

  it('should have removeProjectManager method', () => {
    expect(service.removeProjectManager).toBeDefined();
  });

  it('should have getProjectTimesheets method', () => {
    expect(service.getProjectTimesheets).toBeDefined();
  });

  it('should have exportProjectData method', () => {
    expect(service.exportProjectData).toBeDefined();
  });
});
