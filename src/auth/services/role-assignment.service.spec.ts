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
    activity_log: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      const mockTx = {
        user_role_assignment: mockPrismaService.user_role_assignment,
        activity_log: mockPrismaService.activity_log,
      };
      return callback(mockTx);
    }),
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
        ConflictException,
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
      const user_id = 1;
      const mockAssignments = [
        {
          id: 1,
          user_id: user_id,
          role_id: 2,
          scope_type: ScopeType.COMPANY,
          scope_id: null,
          role: { id: 2, name: 'Manager' },
        },
        {
          id: 2,
          user_id: user_id,
          role_id: 3,
          scope_type: ScopeType.DIVISION,
          scope_id: 1,
          role: { id: 3, name: 'Developer' },
        },
      ];

      mockPrismaService.user_role_assignment.findMany.mockResolvedValue(mockAssignments);

      // Act
      const result = await service.getUserRoles(user_id);

      // Assert
      expect(result).toEqual({
        user_id: user_id,
        roles: [
          {
            id: 2,
            name: 'Manager',
            scope_type: ScopeType.COMPANY,
            scope_id: undefined,
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
      const user_id = 1;
      mockPrismaService.user_role_assignment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getUserRoles(user_id);

      // Assert
      expect(result).toEqual({
        user_id: user_id,
        roles: [],
      });
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', async () => {
      // Arrange
      const user_id = 1;
      const role_name = 'Manager';
      const scope_type = ScopeType.COMPANY;

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue({
        id: 1,
        user_id: user_id,
        role: { name: role_name },
      });

      // Act
      const result = await service.hasRole(user_id, role_name, scope_type);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.user_role_assignment.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: user_id,
          scope_type: scope_type,
          scope_id: undefined,
          deleted_at: null,
          role: {
            name: role_name,
            deleted_at: null,
          },
        },
      });
    });

    it('should return false when user does not have the role', async () => {
      // Arrange
      const user_id = 1;
      const role_name = 'Manager';
      const scope_type = ScopeType.COMPANY;

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.hasRole(user_id, role_name, scope_type);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('revokeRole', () => {
    it('should successfully revoke role assignment', async () => {
      // Arrange
      const user_id = 1;
      const role_id = 2;
      const scope_type = ScopeType.COMPANY;
      const mockAssignment = {
        id: 1,
        user_id: user_id,
        role_id: role_id,
        scope_type: scope_type,
        deleted_at: null,
      };

      const revokedAssignment = {
        ...mockAssignment,
        deleted_at: new Date(),
      };

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(mockAssignment);
      mockPrismaService.user_role_assignment.update.mockResolvedValue(revokedAssignment);

      // Act
      const result = await service.revokeRole(user_id, role_id, scope_type);

      // Assert
      expect(result.deleted_at).toBeDefined();
      expect(mockPrismaService.user_role_assignment.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      // Arrange
      const user_id = 1;
      const role_id = 2;
      const scope_type = ScopeType.COMPANY;

      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revokeRole(user_id, role_id, scope_type)).rejects.toThrow(
        new NotFoundException('Role assignment không tồn tại'),
      );
    });
  });

  describe('validateScope', () => {
    it('should accept company scope with undefined scope_id', async () => {
      // Arrange
      const assignmentData = {
        user_id: 1,
        role_id: 2,
        scope_type: ScopeType.COMPANY,
        scope_id: undefined,
        assigned_by: 1,
      };

      const mockRole = { id: 2, name: 'Manager', deleted_at: null };
      const mockUser = { id: 1, email: 'test@example.com', deleted_at: null };
      const mockCreatedAssignment = {
        id: 1,
        ...assignmentData,
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

      mockPrismaService.roles.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(null);
      mockPrismaService.user_role_assignment.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.user_role_assignment.create.mockResolvedValue(mockCreatedAssignment);

      // Act
      const result = await service.assignRole(assignmentData);

      // Assert
      expect(result).toEqual(mockCreatedAssignment);
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
        BadRequestException,
      );
    });
  });
});