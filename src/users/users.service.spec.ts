import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersPaginationDto } from './dto/pagination-queries.dto';
import { ROLE_IDS } from '../auth/constants/role.constants';
import { USER_ERRORS } from '../common/constants/error-messages.constants';
import { ScopeType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;
  let roleAssignmentService: any;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword',
    email_verified_at: new Date(),
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    register_face_url: null,
    register_face_at: null,
  };

  const mockUserInformation = {
    id: 1,
    user_id: 1,
    name: 'Test User',
    avatar: null,
    position_id: null,
    position: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      users: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user_information: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      user_role_assignment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      divisions: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      teams: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const mockRoleAssignmentService = {
      assignRole: jest.fn(),
      getUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RoleAssignmentService, useValue: mockRoleAssignmentService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
    roleAssignmentService = module.get(RoleAssignmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should create a user successfully with default role', async () => {
      const createdUser = {
        ...mockUser,
        user_information: { create: mockUserInformation },
      };

      prismaService.users.create.mockResolvedValue(mockUser as any);
      roleAssignmentService.assignRole.mockResolvedValue({} as any);

      const result = await service.create(createUserDto, 2);

      expect(prismaService.users.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email.toLowerCase(),
          password: expect.any(String),
          email_verified_at: expect.any(Date),
          user_information: {
            create: {
              name: createUserDto.name,
            },
          },
        },
      });

      expect(roleAssignmentService.assignRole).toHaveBeenCalledWith({
        user_id: mockUser.id,
        role_id: ROLE_IDS.EMPLOYEE,
        scope_type: ScopeType.COMPANY,
        assigned_by: 2,
      });

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(mockUser.email);
    });

    it('should create a user with custom role', async () => {
      const createDtoWithRole = {
        ...createUserDto,
        role_id: ROLE_IDS.ADMIN,
      };

      prismaService.users.create.mockResolvedValue(mockUser as any);
      roleAssignmentService.assignRole.mockResolvedValue({} as any);

      await service.create(createDtoWithRole, 2);

      expect(roleAssignmentService.assignRole).toHaveBeenCalledWith({
        user_id: mockUser.id,
        role_id: ROLE_IDS.ADMIN,
        scope_type: ScopeType.COMPANY,
        assigned_by: 2,
      });
    });

    it('should hash password before creating user', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      hashSpy.mockResolvedValue('hashedPassword123' as never);

      prismaService.users.create.mockResolvedValue(mockUser as any);
      roleAssignmentService.assignRole.mockResolvedValue({} as any);

      await service.create(createUserDto, 2);

      expect(hashSpy).toHaveBeenCalledWith(createUserDto.password, 12);
      expect(prismaService.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashedPassword123',
          }),
        }),
      );

      hashSpy.mockRestore();
    });

    it('should convert email to lowercase', async () => {
      const createDtoWithUpperCase = {
        ...createUserDto,
        email: 'TEST@EXAMPLE.COM',
      };

      prismaService.users.create.mockResolvedValue(mockUser as any);
      roleAssignmentService.assignRole.mockResolvedValue({} as any);

      await service.create(createDtoWithUpperCase, 2);

      expect(prismaService.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all users without deleted users', async () => {
      const mockUsers = [
        {
          ...mockUser,
          user_information: {
            avatar: null,
            position: { id: 1, name: 'Developer' },
          },
          user_role_assignments: [
            {
              role: { id: 1, name: 'employee' },
            },
          ],
        },
      ];

      prismaService.users.findMany.mockResolvedValue(mockUsers as any);

      const result = await service.findAll();

      expect(prismaService.users.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
        },
        select: expect.any(Object),
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('position');
    });

    it('should return empty array when no users found', async () => {
      prismaService.users.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findAllPaginated', () => {
    const paginationDto: UsersPaginationDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated users', async () => {
      const mockUsers = [
        {
          ...mockUser,
          user_information: mockUserInformation,
          user_role_assignments: [],
        },
      ];

      prismaService.users.findMany.mockResolvedValue(mockUsers as any);
      prismaService.users.count.mockResolvedValue(1);
      prismaService.user_role_assignment.findMany.mockResolvedValue([]);

      const result = await service.findAllPaginated(paginationDto);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.current_page).toBe(1);
      expect(result.pagination.per_page).toBe(10);
    });

    it('should filter by search term', async () => {
      const searchDto = {
        ...paginationDto,
        search: 'Test',
      };

      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.users.count.mockResolvedValue(0);
      prismaService.user_role_assignment.findMany.mockResolvedValue([]);

      await service.findAllPaginated(searchDto);

      expect(prismaService.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              {
                user_information: {
                  name: {
                    contains: 'Test',
                  },
                },
              },
            ],
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      const statusDto = {
        ...paginationDto,
        status: 'ACTIVE' as any,
      };

      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.users.count.mockResolvedValue(0);
      prismaService.user_role_assignment.findMany.mockResolvedValue([]);

      await service.findAllPaginated(statusDto);

      expect(prismaService.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by division_id', async () => {
      const divisionDto = {
        ...paginationDto,
        division_id: 1,
      };

      const mockDivisionAssignments = [
        { user_id: 1 },
        { user_id: 2 },
      ];

      prismaService.user_role_assignment.findMany.mockResolvedValueOnce(
        mockDivisionAssignments as any,
      );
      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.users.count.mockResolvedValue(0);
      prismaService.user_role_assignment.findMany.mockResolvedValueOnce([]);

      await service.findAllPaginated(divisionDto);

      expect(prismaService.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: [1, 2] },
          }),
        }),
      );
    });

    it('should return empty result when division has no users', async () => {
      const divisionDto = {
        ...paginationDto,
        division_id: 1,
      };

      prismaService.user_role_assignment.findMany.mockResolvedValueOnce([]);

      const result = await service.findAllPaginated(divisionDto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(prismaService.users.findMany).not.toHaveBeenCalled();
    });

    it('should filter by is_register_face=true', async () => {
      const faceDto = {
        ...paginationDto,
        is_register_face: true,
      };

      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.users.count.mockResolvedValue(0);
      prismaService.user_role_assignment.findMany.mockResolvedValue([]);

      await service.findAllPaginated(faceDto);

      expect(prismaService.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            register_face_url: { not: null },
            register_face_at: { not: null },
          }),
        }),
      );
    });

    it('should filter by is_register_face=false', async () => {
      const faceDto = {
        ...paginationDto,
        is_register_face: false,
      };

      prismaService.users.findMany.mockResolvedValue([]);
      prismaService.users.count.mockResolvedValue(0);
      prismaService.user_role_assignment.findMany.mockResolvedValue([]);

      await service.findAllPaginated(faceDto);

      expect(prismaService.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { register_face_url: null },
              { register_face_at: null },
            ],
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const userWithInfo = {
        ...mockUser,
        user_information: mockUserInformation,
      };

      prismaService.users.findFirst = jest.fn().mockResolvedValue(userWithInfo as any);
      prismaService.user_role_assignment.findFirst = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      roleAssignmentService.getUserRoles = jest.fn().mockResolvedValue({
        roles: [],
      } as any);

      const result = await service.findById(1);

      expect(prismaService.users.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          deleted_at: null,
        },
        include: {
          user_information: true,
        },
      });

      expect(result).toHaveProperty('user_information');
      expect(result).toHaveProperty('role_assignments');
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow(
        USER_ERRORS.USER_NOT_FOUND,
      );
    });

    it('should include division and team when user has assignments', async () => {
      const userWithInfo = {
        ...mockUser,
        user_information: mockUserInformation,
      };

      const mockDivision = {
        id: 1,
        name: 'IT Division',
        status: 'ACTIVE',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        address: null,
        type: 'DIVISION',
        founding_at: new Date(),
      };

      const mockTeam = {
        id: 1,
        name: 'Development Team',
        division_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        founding_date: null,
      };

      prismaService.users.findFirst = jest.fn().mockResolvedValue(userWithInfo as any);
      prismaService.user_role_assignment.findFirst = jest.fn()
        .mockResolvedValueOnce({ scope_id: 1 } as any)
        .mockResolvedValueOnce({ scope_id: 1 } as any);
      prismaService.divisions.findUnique = jest.fn().mockResolvedValue(mockDivision as any);
      prismaService.teams.findUnique = jest.fn().mockResolvedValue(mockTeam as any);
      roleAssignmentService.getUserRoles = jest.fn().mockResolvedValue({
        roles: [],
      } as any);

      const result = await service.findById(1);

      expect(result.user_division).toBeDefined();
      expect(result.user_division?.division).toEqual(mockDivision);
      expect(result.user_division?.team).toEqual(mockTeam);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const userWithRoles = {
        ...mockUser,
        user_role_assignments: [],
      };

      prismaService.users.findFirst.mockResolvedValue(userWithRoles as any);

      const result = await service.findByEmail('test@example.com');

      expect(prismaService.users.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          deleted_at: null,
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(userWithRoles);
    });

    it('should return null when user not found', async () => {
      prismaService.users.findFirst.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      const userWithInfo = {
        ...mockUser,
        user_information: mockUserInformation,
      };

      const updatedUser = {
        ...mockUser,
        email: 'updated@example.com',
      };

      prismaService.users.findFirst = jest.fn()
        .mockResolvedValueOnce(userWithInfo as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(userWithInfo as any);
      prismaService.users.update = jest.fn().mockResolvedValue(updatedUser as any);
      prismaService.user_information.update = jest.fn().mockResolvedValue({
        ...mockUserInformation,
        name: 'Updated Name',
      } as any);
      prismaService.user_role_assignment.findFirst = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      roleAssignmentService.getUserRoles = jest.fn().mockResolvedValue({
        roles: [],
      } as any);

      const result = await service.update(1, updateUserDto, 2);

      expect(prismaService.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          email: 'updated@example.com',
        }),
      });

      expect(prismaService.user_information.update).toHaveBeenCalledWith({
        where: { id: mockUserInformation.id },
        data: { name: 'Updated Name' },
      });

      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.update(999, updateUserDto, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when email already exists', async () => {
      const userWithInfo = {
        ...mockUser,
        user_information: mockUserInformation,
      };

      const existingUser = {
        ...mockUser,
        id: 2,
        email: 'updated@example.com',
      };

      prismaService.users.findFirst = jest.fn()
        .mockResolvedValueOnce(userWithInfo as any)
        .mockResolvedValueOnce(existingUser as any);

      await expect(service.update(1, updateUserDto, 2)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateUserDto, 2)).rejects.toThrow(
        'Email đã được sử dụng bởi user khác',
      );
    });

    it('should convert email to lowercase when updating', async () => {
      const userWithInfo = {
        ...mockUser,
        user_information: mockUserInformation,
      };

      const updateDtoWithUpperCase: UpdateUserDto = {
        email: 'UPDATED@EXAMPLE.COM',
      };

      prismaService.users.findFirst = jest.fn()
        .mockResolvedValueOnce(userWithInfo as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(userWithInfo as any);
      prismaService.users.update = jest.fn().mockResolvedValue({ ...mockUser, email: 'updated@example.com' } as any);
      prismaService.user_role_assignment.findFirst = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      roleAssignmentService.getUserRoles = jest.fn().mockResolvedValue({
        roles: [],
      } as any);

      await service.update(1, updateDtoWithUpperCase, 2);

      expect(prismaService.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          email: 'updated@example.com',
        }),
      });
    });

    it('should update only user_information when only name is provided', async () => {
      const userWithInfo = {
        ...mockUser,
        user_information: mockUserInformation,
      };

      const nameOnlyDto: UpdateUserDto = {
        name: 'New Name',
      };

      prismaService.users.findFirst = jest.fn()
        .mockResolvedValueOnce(userWithInfo as any)
        .mockResolvedValueOnce(userWithInfo as any);
      prismaService.user_information.update = jest.fn().mockResolvedValue({
        ...mockUserInformation,
        name: 'New Name',
      } as any);
      prismaService.user_role_assignment.findFirst = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      roleAssignmentService.getUserRoles = jest.fn().mockResolvedValue({
        roles: [],
      } as any);

      await service.update(1, nameOnlyDto, 2);

      expect(prismaService.users.update).not.toHaveBeenCalled();
      expect(prismaService.user_information.update).toHaveBeenCalledWith({
        where: { id: mockUserInformation.id },
        data: { name: 'New Name' },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete user successfully', async () => {
      const userWithInfo = {
        ...mockUser,
        user_information: mockUserInformation,
      };

      prismaService.users.findFirst.mockResolvedValue(userWithInfo as any);
      prismaService.users.update.mockResolvedValue({
        ...mockUser,
        deleted_at: new Date(),
      } as any);

      const result = await service.remove(1, 2);

      expect(prismaService.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted_at: expect.any(Date) },
      });

      expect(result).toHaveProperty('message');
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.remove(999, 2)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const hashedPassword = 'newHashedPassword';

      prismaService.users.update.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      } as any);

      await service.updatePassword(1, hashedPassword, 2);

      expect(prismaService.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          password: hashedPassword,
        },
      });
    });
  });

  describe('unregisterFace', () => {
    it('should unregister face successfully', async () => {
      const userWithInfo = {
        ...mockUser,
        register_face_url: 'https://example.com/face.jpg',
        register_face_at: new Date(),
        user_information: mockUserInformation,
      };

      const updatedUser = {
        ...mockUser,
        register_face_url: null,
        register_face_at: null,
      };

      prismaService.users.findFirst.mockResolvedValue(userWithInfo as any);
      prismaService.users.update.mockResolvedValue(updatedUser as any);

      const result = await service.unregisterFace(1);

      expect(prismaService.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          register_face_url: null,
          register_face_at: null,
        },
      });

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
      expect(result.data).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.unregisterFace(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
