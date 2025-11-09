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
    getUserRolesByScope: jest.fn(),
    getUserPrimaryRole: jest.fn(),
    getUsersByRole: jest.fn(),
    hasRole: jest.fn(),
    hasAnyRole: jest.fn(),
    getRoleHierarchy: jest.fn(),
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

  describe('getUserRolesByScope', () => {
    it('should get user roles by scope successfully', async () => {
      // Arrange
      const userId = 1;
      const scopeType = ScopeType.COMPANY;
      const expectedResult = [
        { id: 2, name: 'Manager', assigned_at: new Date() },
      ];

      mockRoleAssignmentService.getUserRolesByScope.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getUserRolesByScope(userId, scopeType);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getUserRolesByScope).toHaveBeenCalledWith(userId, scopeType, undefined);
    });

    it('should get user roles by scope with scope_id', async () => {
      // Arrange
      const userId = 1;
      const scopeType = ScopeType.DIVISION;
      const scopeId = 1;
      const expectedResult = [
        { id: 3, name: 'Developer', assigned_at: new Date() },
      ];

      mockRoleAssignmentService.getUserRolesByScope.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getUserRolesByScope(userId, scopeType, scopeId);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getUserRolesByScope).toHaveBeenCalledWith(userId, scopeType, scopeId);
    });
  });

  describe('hasRole', () => {
    it('should check if user has role successfully', async () => {
      // Arrange
      const userId = 1;
      const roleName = 'Manager';
      const scopeType = ScopeType.COMPANY;

      mockRoleAssignmentService.hasRole.mockResolvedValue(true);

      // Act
      const result = await controller.hasRole(userId, roleName, scopeType);

      // Assert
      expect(result).toEqual({ hasRole: true });
      expect(service.hasRole).toHaveBeenCalledWith(userId, roleName, scopeType, undefined);
    });
  });

  describe('hasAnyRole', () => {
    it('should check if user has any role successfully', async () => {
      // Arrange
      const userId = 1;
      const roleNames = 'Manager,Developer';
      const scopeType = ScopeType.COMPANY;

      mockRoleAssignmentService.hasAnyRole.mockResolvedValue(true);

      // Act
      const result = await controller.hasAnyRole(userId, roleNames, scopeType);

      // Assert
      expect(result).toEqual({ hasAnyRole: true });
      expect(service.hasAnyRole).toHaveBeenCalledWith(
        userId,
        ['Manager', 'Developer'],
        scopeType,
        undefined,
      );
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role successfully', async () => {
      // Arrange
      const roleName = 'Manager';
        const scopeType = ScopeType.COMPANY;
      const expectedResult = [
        {
          user_id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role_name: 'Manager',
          assigned_at: new Date(),
        },
      ];

      mockRoleAssignmentService.getUsersByRole.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getUsersByRole(roleName, scopeType);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getUsersByRole).toHaveBeenCalledWith(roleName, scopeType, undefined);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should get role hierarchy successfully', async () => {
      // Arrange
      const userId = 1;
      const scopeType = ScopeType.COMPANY;
      const expectedResult = {
        user_id: userId,
        max_role_level: 80,
        roles: [{ id: 2, name: 'Manager', assigned_at: new Date() }],
        inherited_permissions: ['Manager', 'Developer'],
      };

      mockRoleAssignmentService.getRoleHierarchy.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getRoleHierarchy(userId, scopeType);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getRoleHierarchy).toHaveBeenCalledWith(userId, scopeType, undefined);
    });
  });
});
