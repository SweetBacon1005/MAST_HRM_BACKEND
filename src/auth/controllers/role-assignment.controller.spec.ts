import { Test, TestingModule } from '@nestjs/testing';
import { RoleAssignmentController } from './role-assignment.controller';
import { RoleAssignmentService } from '../services/role-assignment.service';
import { AssignRoleDto, BulkAssignRoleDto } from '../dto/role-assignment.dto';
import { ScopeType } from '@prisma/client';

describe('RoleAssignmentController', () => {
  let controller: RoleAssignmentController;
  let service: RoleAssignmentService;

  const mockRoleAssignmentService = {
    assignRole: jest.fn(),
    bulkAssignRoles: jest.fn(),
    revokeRole: jest.fn(),
    getUserRoles: jest.fn(),
    getUserPrimaryRole: jest.fn(),
    getRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleAssignmentController],
      providers: [
        {
          provide: RoleAssignmentService,
          useValue: mockRoleAssignmentService,
        },
      ],
    }).compile();

    controller = module.get<RoleAssignmentController>(RoleAssignmentController);
    service = module.get<RoleAssignmentService>(RoleAssignmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignRole', () => {
    it('should assign role successfully', async () => {
      // Arrange
      const assignRoleDto: AssignRoleDto = {
        user_id: 1,
        role_id: 2,
        scope_type: ScopeType.COMPANY,  
      };
      const assignedBy = 1;
      const expectedResult = {
        id: 1,
        user_id: 1,
        role_id: 2,
        scope_type: ScopeType.COMPANY,
        scope_id: null,
        assigned_by: assignedBy,
        created_at: new Date(),
        updated_at: new Date(),
        role: { id: 2, name: 'Manager' },
        user: { id: 1, email: 'test@example.com' },
      };

      mockRoleAssignmentService.assignRole.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.assignRole(assignRoleDto, assignedBy);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.assignRole).toHaveBeenCalledWith({
        ...assignRoleDto,
        assigned_by: assignedBy,
      });
    });
  });

  describe('bulkAssignRoles', () => {
    it('should bulk assign roles successfully', async () => {
      // Arrange
      const bulkAssignDto: BulkAssignRoleDto = {
        assignments: [
          { user_id: 1, role_id: 2, scope_type: ScopeType.COMPANY },
          { user_id: 2, role_id: 3, scope_type: ScopeType.DIVISION, scope_id: 1 },
        ],
      };
      const assignedBy = 1;
      const expectedResult = [
        { success: true, data: { id: 1, user_id: 1, role_id: 2 } },
        { success: true, data: { id: 2, user_id: 2, role_id: 3 } },
      ];

      mockRoleAssignmentService.bulkAssignRoles.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.bulkAssignRoles(bulkAssignDto, assignedBy);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.bulkAssignRoles).toHaveBeenCalledWith([
        { ...bulkAssignDto.assignments[0], assigned_by: assignedBy },
        { ...bulkAssignDto.assignments[1], assigned_by: assignedBy },
      ]);
    });
  });

  describe('getUserRoles', () => {
    it('should get user roles successfully', async () => {
      // Arrange
      const userId = 1;
      const expectedResult = {
        user_id: userId,
        roles: [
          { id: 2, name: 'Manager', scope_type: ScopeType.COMPANY, scope_id: null },
        ],
      };

      mockRoleAssignmentService.getUserRoles.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getUserRoles(userId);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getUserRoles).toHaveBeenCalledWith(userId);
    });
  });

});
