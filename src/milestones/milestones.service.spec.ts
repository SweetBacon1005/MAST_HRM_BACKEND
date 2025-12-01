import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { PrismaService } from '../database/prisma.service';
import { MilestoneStatus } from '@prisma/client';

describe('MilestonesService', () => {
  let service: MilestonesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    projects: {
      findUnique: jest.fn(),
    },
    project_milestones: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestonesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MilestonesService>(MilestonesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const projectId = 1;
    const mockProject = {
      id: 1,
      name: 'Test Project',
      code: 'TEST-001',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      deleted_at: null,
    };

    const createMilestoneDto = {
      name: 'Phase 1 - Planning',
      description: 'Planning phase',
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      status: MilestoneStatus.PENDING,
      progress: 0,
      order: 1,
    };

    it('should create a milestone successfully', async () => {
      const mockMilestone = {
        id: 1,
        project_id: projectId,
        name: createMilestoneDto.name,
        description: createMilestoneDto.description,
        start_date: new Date(createMilestoneDto.start_date),
        end_date: new Date(createMilestoneDto.end_date),
        status: createMilestoneDto.status,
        progress: createMilestoneDto.progress,
        order: createMilestoneDto.order,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        project: {
          id: mockProject.id,
          name: mockProject.name,
          code: mockProject.code,
        },
      };

      mockPrismaService.projects.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project_milestones.findFirst.mockResolvedValue(null);
      mockPrismaService.project_milestones.create.mockResolvedValue(mockMilestone);

      const result = await service.create(projectId, createMilestoneDto);

      expect(result).toEqual(mockMilestone);
      expect(mockPrismaService.projects.findUnique).toHaveBeenCalledWith({
        where: { id: projectId, deleted_at: null },
      });
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.projects.findUnique.mockResolvedValue(null);

      await expect(service.create(projectId, createMilestoneDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if start date is after end date', async () => {
      const invalidDto = {
        ...createMilestoneDto,
        start_date: '2024-05-01',
        end_date: '2024-03-31',
      };

      mockPrismaService.projects.findUnique.mockResolvedValue(mockProject);

      await expect(service.create(projectId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if milestone is out of project range', async () => {
      const invalidDto = {
        ...createMilestoneDto,
        start_date: '2023-11-01',
        end_date: '2023-12-31',
      };

      mockPrismaService.projects.findUnique.mockResolvedValue(mockProject);

      await expect(service.create(projectId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if milestone name already exists', async () => {
      const existingMilestone = {
        id: 1,
        name: createMilestoneDto.name,
        project_id: projectId,
      };

      mockPrismaService.projects.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project_milestones.findFirst.mockResolvedValue(
        existingMilestone,
      );

      await expect(service.create(projectId, createMilestoneDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a milestone by id', async () => {
      const mockMilestone = {
        id: 1,
        project_id: 1,
        name: 'Phase 1',
        description: 'Planning',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-03-31'),
        status: MilestoneStatus.PENDING,
        progress: 0,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        project: {
          id: 1,
          name: 'Test Project',
          code: 'TEST-001',
        },
      };

      mockPrismaService.project_milestones.findUnique.mockResolvedValue(
        mockMilestone,
      );

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.start_date).toBe('2024-01-01');
      expect(result.end_date).toBe('2024-03-31');
    });

    it('should throw NotFoundException if milestone does not exist', async () => {
      mockPrismaService.project_milestones.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const mockMilestone = {
      id: 1,
      project_id: 1,
      name: 'Phase 1',
      description: 'Planning',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-03-31'),
      status: MilestoneStatus.PENDING,
      progress: 0,
      order: 1,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: {
        id: 1,
        name: 'Test Project',
        code: 'TEST-001',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
      },
    };

    it('should update a milestone successfully', async () => {
      const updateDto = {
        name: 'Phase 1 - Updated',
        progress: 50,
      };

      const updatedMilestone = {
        ...mockMilestone,
        ...updateDto,
      };

      mockPrismaService.project_milestones.findUnique.mockResolvedValue(
        mockMilestone,
      );
      mockPrismaService.project_milestones.findFirst.mockResolvedValue(null);
      mockPrismaService.project_milestones.update.mockResolvedValue(
        updatedMilestone,
      );

      const result = await service.update(1, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.progress).toBe(updateDto.progress);
    });

    it('should throw NotFoundException if milestone does not exist', async () => {
      mockPrismaService.project_milestones.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProgress', () => {
    it('should update milestone progress', async () => {
      const mockMilestone = {
        id: 1,
        progress: 0,
        deleted_at: null,
      };

      const updatedMilestone = {
        ...mockMilestone,
        progress: 75,
      };

      mockPrismaService.project_milestones.findUnique.mockResolvedValue(
        mockMilestone,
      );
      mockPrismaService.project_milestones.update.mockResolvedValue(
        updatedMilestone,
      );

      const result = await service.updateProgress(1, 75);

      expect(result.progress).toBe(75);
    });

    it('should throw BadRequestException if progress is out of range', async () => {
      const mockMilestone = {
        id: 1,
        progress: 0,
        deleted_at: null,
      };

      mockPrismaService.project_milestones.findUnique.mockResolvedValue(
        mockMilestone,
      );

      await expect(service.updateProgress(1, 150)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.updateProgress(1, -10)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a milestone', async () => {
      const mockMilestone = {
        id: 1,
        deleted_at: null,
      };

      const deletedMilestone = {
        ...mockMilestone,
        deleted_at: new Date(),
      };

      mockPrismaService.project_milestones.findUnique.mockResolvedValue(
        mockMilestone,
      );
      mockPrismaService.project_milestones.update.mockResolvedValue(
        deletedMilestone,
      );

      const result = await service.remove(1);

      expect(result.deleted_at).toBeDefined();
    });

    it('should throw NotFoundException if milestone does not exist', async () => {
      mockPrismaService.project_milestones.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateProjectProgress', () => {
    it('should calculate average progress from milestones', async () => {
      const mockMilestones = [
        { progress: 100 },
        { progress: 60 },
        { progress: 0 },
      ];

      mockPrismaService.project_milestones.findMany.mockResolvedValue(
        mockMilestones,
      );

      const result = await service.calculateProjectProgress(1);

      expect(result).toBe(53); // (100 + 60 + 0) / 3 = 53.33 => 53
    });

    it('should return 0 if no milestones exist', async () => {
      mockPrismaService.project_milestones.findMany.mockResolvedValue([]);

      const result = await service.calculateProjectProgress(1);

      expect(result).toBe(0);
    });

    it('should return 100 if all milestones are completed', async () => {
      const mockMilestones = [
        { progress: 100 },
        { progress: 100 },
        { progress: 100 },
      ];

      mockPrismaService.project_milestones.findMany.mockResolvedValue(
        mockMilestones,
      );

      const result = await service.calculateProjectProgress(1);

      expect(result).toBe(100);
    });
  });

  describe('findAllByProject', () => {
    it('should return all milestones for a project', async () => {
      const mockProject = {
        id: 1,
        deleted_at: null,
      };

      const mockMilestones = [
        {
          id: 1,
          name: 'Phase 1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-03-31'),
          order: 1,
          deleted_at: null,
        },
        {
          id: 2,
          name: 'Phase 2',
          start_date: new Date('2024-04-01'),
          end_date: new Date('2024-06-30'),
          order: 2,
          deleted_at: null,
        },
      ];

      mockPrismaService.projects.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project_milestones.findMany.mockResolvedValue(
        mockMilestones,
      );

      const result = await service.findAllByProject(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Phase 1');
      expect(result[1].name).toBe('Phase 2');
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.projects.findUnique.mockResolvedValue(null);

      await expect(service.findAllByProject(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
