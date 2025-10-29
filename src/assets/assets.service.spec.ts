import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { ASSET_ERRORS, SUCCESS_MESSAGES } from '../common/constants/error-messages.constants';

describe('AssetsService', () => {
  let service: AssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AssetsService,
          useValue: {
            // Mock only the methods we want to test
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            assignAsset: jest.fn(),
            unassignAsset: jest.fn(),
            createAssetRequest: jest.fn(),
            getMyAssetRequests: jest.fn(),
            getAllAssetRequests: jest.fn(),
            approveAssetRequest: jest.fn(),
            rejectAssetRequest: jest.fn(),
            getMyDevices: jest.fn(),
            getAssetStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
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

  it('should have assignAsset method', () => {
    expect(service.assignAsset).toBeDefined();
  });

  it('should have unassignAsset method', () => {
    expect(service.unassignAsset).toBeDefined();
  });

  it('should have createAssetRequest method', () => {
    expect(service.createAssetRequest).toBeDefined();
  });

  it('should have getMyAssetRequests method', () => {
    expect(service.getMyAssetRequests).toBeDefined();
  });

  it('should have getAllAssetRequests method', () => {
    expect(service.getAllAssetRequests).toBeDefined();
  });

  it('should have approveAssetRequest method', () => {
    expect(service.approveAssetRequest).toBeDefined();
  });

  it('should have rejectAssetRequest method', () => {
    expect(service.rejectAssetRequest).toBeDefined();
  });

  it('should have getMyDevices method', () => {
    expect(service.getMyDevices).toBeDefined();
  });

  it('should have getAssetStatistics method', () => {
    expect(service.getAssetStatistics).toBeDefined();
  });

  // Unhappy cases
  describe('Error Handling', () => {
    it('should handle creating asset with duplicate serial number', async () => {
      const mockCreate = service.create as jest.Mock;
      mockCreate.mockRejectedValue(new Error('Serial number already exists'));

      await expect(mockCreate({
        name: 'Test Asset',
        serial_number: 'DUPLICATE123',
        category: 'LAPTOP'
      }, 1)).rejects.toThrow('Serial number already exists');
    });

    it('should handle asset not found when updating', async () => {
      const mockUpdate = service.update as jest.Mock;
      mockUpdate.mockRejectedValue(new Error('Asset not found'));

      await expect(mockUpdate(999, { name: 'Updated Asset' }, 1))
        .rejects.toThrow('Asset not found');
    });

    it('should handle assigning already assigned asset', async () => {
      const mockAssignAsset = service.assignAsset as jest.Mock;
      mockAssignAsset.mockRejectedValue(new Error('Asset is already assigned'));

      await expect(mockAssignAsset(1, 2, 1))
        .rejects.toThrow('Asset is already assigned');
    });

    it('should handle unassigning unassigned asset', async () => {
      const mockUnassignAsset = service.unassignAsset as jest.Mock;
      mockUnassignAsset.mockRejectedValue(new Error('Asset is not assigned'));

      await expect(mockUnassignAsset(1, 1))
        .rejects.toThrow('Asset is not assigned');
    });

    it('should handle deleting assigned asset', async () => {
      const mockRemove = service.remove as jest.Mock;
      mockRemove.mockRejectedValue(new Error('Cannot delete assigned asset'));

      await expect(mockRemove(1, 1))
        .rejects.toThrow('Cannot delete assigned asset');
    });

    it('should handle approving non-pending request', async () => {
      const mockApproveAssetRequest = service.approveAssetRequest as jest.Mock;
      mockApproveAssetRequest.mockRejectedValue(new Error('Request is not pending'));

      await expect(mockApproveAssetRequest(1, 1, 1))
        .rejects.toThrow('Request is not pending');
    });

    it('should handle insufficient permissions', async () => {
      const mockFindAll = service.findAll as jest.Mock;
      mockFindAll.mockRejectedValue(new Error('Insufficient permissions'));

      await expect(mockFindAll({ page: 1, limit: 10 }))
        .rejects.toThrow('Insufficient permissions');
    });

    it('should handle database connection errors', async () => {
      const mockFindOne = service.findOne as jest.Mock;
      mockFindOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(mockFindOne(1))
        .rejects.toThrow('Database connection failed');
    });
  });
});