import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../database/prisma.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { MilestonesService } from '../milestones/milestones.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      projects: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      divisions: {
        findUnique: jest.fn(),
      },
      teams: {
        findUnique: jest.fn(),
      },
      user_role_assignment: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const mockRoleAssignmentService = {
      getUserRoles: jest.fn(),
      assignRole: jest.fn(),
      revokeRole: jest.fn(),
    };

    const mockMilestonesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RoleAssignmentService, useValue: mockRoleAssignmentService },
        { provide: MilestonesService, useValue: mockMilestonesService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prismaService = module.get<PrismaService>(PrismaService);
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

  it('should have getProjectMembers method', () => {
    expect(service.getProjectMembers).toBeDefined();
  });

  it('should have findMyProjects method', () => {
    expect(service.findMyProjects).toBeDefined();
  });

  it('should have findManagedProjects method', () => {
    expect(service.findManagedProjects).toBeDefined();
  });

  it('should have updateProgress method', () => {
    expect(service.updateProgress).toBeDefined();
  });

  describe('Service Methods', () => {
    it('should have all required methods', () => {
      expect(service.create).toBeDefined();
      expect(service.findAll).toBeDefined();
      expect(service.findOne).toBeDefined();
      expect(service.update).toBeDefined();
      expect(service.remove).toBeDefined();
      expect(service.getProjectMembers).toBeDefined();
      expect(service.findMyProjects).toBeDefined();
      expect(service.findManagedProjects).toBeDefined();
      expect(service.updateProgress).toBeDefined();
    });
  });
});
