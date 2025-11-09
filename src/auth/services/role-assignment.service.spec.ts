import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RoleAssignmentService } from './role-assignment.service';
import { PrismaService } from '../../database/prisma.service';
import { ScopeType } from '@prisma/client';

describe('RoleAssignmentService', () => {
  let service: RoleAssignmentService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    roles: {
      findFirst: jest.fn(),
    },
    users: {
      findFirst: jest.fn(),
    },
    divisions: {
      findFirst: jest.fn(),
    },
    teams: {
      findFirst: jest.fn(),
    },
    projects: {
      findFirst: jest.fn(),
    },
    user_role_assignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleAssignmentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RoleAssignmentService>(RoleAssignmentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignRole', () => {
    const mockAssignmentData = {
      user_id: 1,
      role_id: 2,
      scope_type: ScopeType.COMPANY,
      assigned_by: 1,
    };

    const mockRole = { id: 2, name: 'Manager', deleted_at: null };
    const mockUser = { id: 1, email: 'test@example.com', deleted_at: null };

    it('should successfully assign role to user', async () => {
      // Arrange
      mockPrismaService.roles.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(null);
      mockPrismaService.user_role_assignment.updateMany.mockResolvedValue({ count: 0 });
      
      const mockCreatedAssignment = {
        id: 1,
        ...mockAssignmentData,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        role: mockRole,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          user_information: { name: 'Test User' },
        },
      };
      mockPrismaService.user_role_assignment.create.mockResolvedValue(mockCreatedAssignment);

      // Act
      const result = await service.assignRole(mockAssignmentData);

      // Assert
      expect(result).toEqual(mockCreatedAssignment);
      expect(mockPrismaService.roles.findFirst).toHaveBeenCalledWith({
        where: { id: mockAssignmentData.role_id, deleted_at: null },
      });
      expect(mockPrismaService.users.findFirst).toHaveBeenCalledWith({
        where: { id: mockAssignmentData.user_id, deleted_at: null },
      });
      expect(mockPrismaService.user_role_assignment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when role does not exist', async () => {
      // Arrange
      mockPrismaService.roles.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignRole(mockAssignmentData)).rejects.toThrow(
        new NotFoundException('Role không tồn tại'),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      mockPrismaService.roles.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.users.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignRole(mockAssignmentData)).rejects.toThrow(
        new NotFoundException('User không tồn tại'),
      );
    });

    it('should throw ConflictException when assignment already exists', async () => {
      // Arrange
      mockPrismaService.roles.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue({
        id: 1,
        ...mockAssignmentData,
      });

      // Act & Assert
      await expect(service.assignRole(mockAssignmentData)).rejects.toThrow(
        new ConflictException('User đã có role này trong context này'),
      );
    });

    it('should validate division scope correctly', async () => {
      // Arrange
      const divisionAssignmentData = {
        ...mockAssignmentData,
        scope_type: ScopeType.DIVISION,
        scope_id: 1,
      };

      mockPrismaService.roles.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.divisions.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignRole(divisionAssignmentData)).rejects.toThrow(
        new NotFoundException('Division không tồn tại'),
      );
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles successfully', async () => {
      // Arrange
      const userId = 1;
      const mockAssignments = [
        {
          id: 1,
          user_id: userId,
          role_id: 2,
          scope_type: ScopeType.COMPANY,
          scope_id: null,
          role: { id: 2, name: 'Manager' },
        },
        {
          id: 2,
          user_id: userId,
          role_id: 3,
          scope_type: ScopeType.DIVISION,
          scope_id: 1,
          role: { id: 3, name: 'Developer' },
        },
      ];

      mockPrismaService.user_role_assignment.findMany.mockResolvedValue(mockAssignments);

      // Act
      const result = await service.getUserRoles(userId);

      // Assert
      expect(result).toEqual({
        user_id: userId,
        roles: [
          {
            id: 2,
            name: 'Manager',
            scope_type: ScopeType.COMPANY,
            scope_id: null,
          },
          {
            id: 3,
            name: 'Developer',
            scope_type: ScopeType.DIVISION,
            scope_id: 1,
          },
        ],
      });
    });

    it('should return empty roles when user has no assignments', async () => {
      // Arrange
      const userId = 1;
      mockPrismaService.user_role_assignment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getUserRoles(userId);

      // Assert
      expect(result).toEqual({
        user_id: userId,
        roles: [],
      });
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', async () => {
      // Arrange
      const userId = 1;
      const roleName = 'Manager';
      const scopeType = ScopeType.COMPANY;

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue({
        id: 1,
        user_id: userId,
        role: { name: roleName },
      });

      // Act
      const result = await service.hasRole(userId, roleName, scopeType);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.user_role_assignment.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          scope_type: scopeType,
          scope_id: undefined,
          deleted_at: null,
          role: {
            name: roleName,
            deleted_at: null,
          },
        },
      });
    });

    it('should return false when user does not have the role', async () => {
      // Arrange
      const userId = 1;
      const roleName = 'Manager';
      const scopeType = ScopeType.COMPANY;

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.hasRole(userId, roleName, scopeType);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('revokeRole', () => {
    it('should successfully revoke role assignment', async () => {
      // Arrange
      const userId = 1;
      const roleId = 2;
      const scopeType = ScopeType.COMPANY;
      const mockAssignment = {
        id: 1,
        user_id: userId,
        role_id: roleId,
        scope_type: scopeType,
        deleted_at: null,
      };

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(mockAssignment);
      mockPrismaService.user_role_assignment.update.mockResolvedValue({
        ...mockAssignment,
        deleted_at: new Date(),
      });

      // Act
      const result = await service.revokeRole(userId, roleId, scopeType);

      // Assert
      expect(result.deleted_at).toBeDefined();
      expect(mockPrismaService.user_role_assignment.update).toHaveBeenCalledWith({
        where: { id: mockAssignment.id },
        data: { deleted_at: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      // Arrange
      const userId = 1;
      const roleId = 2;
      const scopeType = ScopeType.COMPANY;

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revokeRole(userId, roleId, scopeType)).rejects.toThrow(
        new NotFoundException('Role assignment không tồn tại'),
      );
    });
  });

  describe('validateScope', () => {
    it('should validate company scope correctly', async () => {
      // Arrange
      const assignmentData = {
        user_id: 1,
        role_id: 2,
        scope_type: ScopeType.COMPANY,
        scope_id: 1,
        assigned_by: 1,
      };

      mockPrismaService.roles.findFirst.mockResolvedValue({ id: 2, name: 'Manager' });
      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1, email: 'test@example.com' });

      // Act & Assert
      await expect(service.assignRole(assignmentData)).rejects.toThrow(
        new BadRequestException('Company scope không cần scope_id'),
      );
    });

    it('should require scope_id for division scope', async () => {
      // Arrange
      const assignmentData = {
        user_id: 1,
        role_id: 2,
        scope_type: ScopeType.DIVISION,
        assigned_by: 1,
      };

      mockPrismaService.roles.findFirst.mockResolvedValue({ id: 2, name: 'Manager' });
      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1, email: 'test@example.com' });

      // Act & Assert
      await expect(service.assignRole(assignmentData)).rejects.toThrow(
        new BadRequestException('Division scope cần scope_id'),
      );
    });
  });
});