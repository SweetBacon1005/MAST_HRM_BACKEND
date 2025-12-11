import { Test, TestingModule } from '@nestjs/testing';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { MilestoneStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

describe('MilestonesController', () => {
  let controller: MilestonesController;
  let service: MilestonesService;

  const mockMilestonesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllByProject: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateProgress: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MilestonesController],
      providers: [
        {
          provide: MilestonesService,
          useValue: mockMilestonesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MilestonesController>(MilestonesController);
    service = module.get<MilestonesService>(MilestonesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a milestone', async () => {
      const projectId = 1;
      const createDto = {
        name: 'Phase 1',
        description: 'Planning phase',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        status: MilestoneStatus.PENDING,
        progress: 0,
        order: 1,
      };

      const mockResult = {
        id: 1,
        project_id: projectId,
        ...createDto,
        start_date: new Date(createDto.start_date),
        end_date: new Date(createDto.end_date),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      mockMilestonesService.create.mockResolvedValue(mockResult);

      const result = await controller.create(projectId, createDto);

      expect(result).toEqual(mockResult);
      expect(mockMilestonesService.create).toHaveBeenCalledWith(
        projectId,
        createDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated milestones', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const mockResult = {
        data: [
          {
            id: 1,
            name: 'Phase 1',
            start_date: '2024-01-01',
            end_date: '2024-03-31',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockMilestonesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(paginationDto);

      expect(result).toEqual(mockResult);
      expect(mockMilestonesService.findAll).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('findAllByProject', () => {
    it('should return all milestones for a project', async () => {
      const projectId = 1;
      const mockResult = [
        {
          id: 1,
          name: 'Phase 1',
          start_date: '2024-01-01',
          end_date: '2024-03-31',
        },
        {
          id: 2,
          name: 'Phase 2',
          start_date: '2024-04-01',
          end_date: '2024-06-30',
        },
      ];

      mockMilestonesService.findAllByProject.mockResolvedValue(mockResult);

      const result = await controller.findAllByProject(projectId);

      expect(result).toEqual(mockResult);
      expect(mockMilestonesService.findAllByProject).toHaveBeenCalledWith(
        projectId,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single milestone', async () => {
      const id = 1;
      const mockResult = {
        id,
        name: 'Phase 1',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        status: MilestoneStatus.PENDING,
        progress: 0,
      };

      mockMilestonesService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(id);

      expect(result).toEqual(mockResult);
      expect(mockMilestonesService.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a milestone', async () => {
      const id = 1;
      const updateDto = {
        name: 'Phase 1 - Updated',
        progress: 50,
      };

      const mockResult = {
        id,
        ...updateDto,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
      };

      mockMilestonesService.update.mockResolvedValue(mockResult);

      const result = await controller.update(id, updateDto);

      expect(result).toEqual(mockResult);
      expect(mockMilestonesService.update).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('updateProgress', () => {
    it('should update milestone progress', async () => {
      const id = 1;
      const progressDto = { progress: 75 };

      const mockResult = {
        id,
        progress: 75,
        name: 'Phase 1',
      };

      mockMilestonesService.updateProgress.mockResolvedValue(mockResult);

      const result = await controller.updateProgress(id, progressDto);

      expect(result).toEqual(mockResult);
      expect(mockMilestonesService.updateProgress).toHaveBeenCalledWith(id, 75);
    });
  });

  describe('remove', () => {
    it('should remove a milestone', async () => {
      const id = 1;
      const mockResult = {
        id,
        deleted_at: new Date(),
      };

      mockMilestonesService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(id);

      expect(result).toEqual(mockResult);
      expect(mockMilestonesService.remove).toHaveBeenCalledWith(id);
    });
  });
});
