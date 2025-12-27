import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import { CreatePositionDto } from './positions/dto/create-position.dto';
import { CreateLanguageDto } from './languages/dto/create-language.dto';
import { CreateSkillDto } from './skills/dto/create-skill.dto';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user_information: {
      update: jest.fn(),
      create: jest.fn(),
    },
    positions: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    languages: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    skills: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    education: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    experience: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user_skills: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user_role_assignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    divisions: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('nên lấy thông tin profile thành công', async () => {
      const user_id = 1;
      const mockUser = {
        id: user_id,
        email: 'test@example.com',
        user_information: {
          id: 1,
          name: 'Test User',
          education: [],
          experience: [],
          user_skills: [],
        },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user_role_assignment.findFirst.mockResolvedValue(null);

      const result = await service.getUserProfile(user_id);

      expect(result).toBeDefined();
      expect(result.id).toBe(user_id);
    });

    it('nên throw NotFoundException khi không tìm thấy user', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);
      await expect(service.getUserProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserInformation', () => {
    it('nên cập nhật thông tin user thành công', async () => {
      const user_id = 1;
      const updateDto: UpdateUserInformationDto = {
        name: 'Updated Name',
        position_id: 1,
        language_id: 1,
      };
      const mockUser = {
        id: user_id,
        user_information: { id: 1 },
      };
      const mockPosition = { id: 1, name: 'Developer' };
      const mockLanguage = { id: 1, name: 'Vietnamese' };
      const mockUpdatedInfo = {
        id: 1,
        ...updateDto,
        position: mockPosition,
        language: mockLanguage,
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.positions.findFirst.mockResolvedValue(mockPosition);
      mockPrismaService.languages.findFirst.mockResolvedValue(mockLanguage);
      mockPrismaService.user_information.update.mockResolvedValue(mockUpdatedInfo);

      const result = await service.updateUserInformation(user_id, updateDto);
      expect(result).toEqual(mockUpdatedInfo);
    });

    it('nên throw NotFoundException khi không tìm thấy user/position/language', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);
      await expect(
        service.updateUserInformation(999, { name: 'Test', position_id: 1, language_id: 1 }),
      ).rejects.toThrow(NotFoundException);

      mockPrismaService.users.findFirst.mockResolvedValue({ id: 1, user_information: { id: 1 } });
      mockPrismaService.positions.findFirst.mockResolvedValue(null);
      await expect(
        service.updateUserInformation(1, { name: 'Test', position_id: 999, language_id: 1 }),
      ).rejects.toThrow(NotFoundException);

      mockPrismaService.positions.findFirst.mockResolvedValue({ id: 1, name: 'Developer' });
      mockPrismaService.languages.findFirst.mockResolvedValue(null);
      await expect(
        service.updateUserInformation(1, { name: 'Test', position_id: 1, language_id: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createEducation', () => {
    it('nên tạo thông tin học vấn thành công', async () => {
      const createDto: CreateEducationDto = {
        user_id: 1,
        name: 'Đại học',
        major: 'Công nghệ thông tin',
        start_date: '2020-01-01',
        end_date: '2024-01-01',
        description: 'Description',
      };
      const mockUser = {
        id: 1,
        user_information: { id: 1 },
      };
      const mockEducation = {
        id: 1,
        ...createDto,
        user_info_id: 1,
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.education.create.mockResolvedValue(mockEducation);

      const result = await service.createEducation(createDto);
      expect(result).toEqual(mockEducation);
    });

    it('nên throw NotFoundException khi không tìm thấy user', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      await expect(
        service.createEducation({
          user_id: 999,
          name: 'Test',
          major: 'Test',
          start_date: '2020-01-01',
          end_date: '2024-01-01',
          description: 'Description',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createExperience', () => {
    it('nên tạo thông tin kinh nghiệm thành công', async () => {
      const createDto: CreateExperienceDto = {
        user_id: 1,
        job_title: 'Developer',
        company: 'Company A',
        start_date: '2020-01-01',
        end_date: '2024-01-01',
      };
      const mockUser = {
        id: 1,
        user_information: { id: 1 },
      };
      const mockExperience = {
        id: 1,
        ...createDto,
        user_info_id: 1,
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.experience.create.mockResolvedValue(mockExperience);

      const result = await service.createExperience(createDto);
      expect(result).toEqual(mockExperience);
    });
  });

  describe('createUserSkill', () => {
    it('nên tạo user skill thành công', async () => {
      const createDto: CreateUserSkillDto = {
        user_id: 1,
        skill_id: 1,
        experience: 3,
        is_main: true,
        months_experience: 3,
      };
      const mockSkill = { id: 1, name: 'JavaScript' };
      const mockUser = {
        id: 1,
        user_information: { id: 1 },
      };
      const mockUserSkill = {
        id: 1,
        ...createDto,
        user_info_id: 1,
        skill: mockSkill,
      };

      mockPrismaService.skills.findFirst.mockResolvedValue(mockSkill);
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user_skills.create.mockResolvedValue(mockUserSkill);

      const result = await service.createUserSkill(createDto);
      expect(result).toEqual(mockUserSkill);
    });

    it('nên throw NotFoundException khi không tìm thấy skill', async () => {
      mockPrismaService.skills.findFirst.mockResolvedValue(null);
      await expect(
        service.createUserSkill({
          user_id: 1,
          skill_id: 999,
          experience: 3,
          months_experience: 3,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEducation', () => {
    it('nên cập nhật thông tin học vấn thành công', async () => {
      const educationId = 1;
      const updateDto = {
        user_id: 1,
        name: 'Đại học (cập nhật)',
        major: 'Công nghệ thông tin',
      };
      const existingEducation = {
        id: educationId,
        user_info_id: 1,
      };
      const updatedEducation = {
        ...existingEducation,
        ...updateDto,
      };

      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.education.findFirst.mockResolvedValue(existingEducation);
      mockPrismaService.education.update.mockResolvedValue(updatedEducation);

      const result = await service.updateEducation(educationId, updateDto);
      expect(result).toEqual(updatedEducation);
    });

    it('nên throw NotFoundException khi không tìm thấy education', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.education.findFirst.mockResolvedValue(null);
      await expect(service.updateEducation(999, { user_id: 1, name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteEducation', () => {
    it('nên xóa thông tin học vấn thành công', async () => {
      const educationId = 1;
      const user_id = 1;
      const existingEducation = {
        id: educationId,
        user_info_id: 1,
      };

      mockPrismaService.users.findUnique.mockResolvedValue({
        id: user_id,
        user_information: { id: 1 },
      });
      mockPrismaService.education.findFirst.mockResolvedValue(existingEducation);
      mockPrismaService.education.update.mockResolvedValue({
        ...existingEducation,
        deleted_at: new Date(),
      });

      const result = await service.deleteEducation(educationId, user_id);
      expect(result.message).toBe('Xóa thông tin học vấn thành công');
    });

    it('nên throw NotFoundException khi không tìm thấy education', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.education.findFirst.mockResolvedValue(null);
      await expect(service.deleteEducation(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateExperience', () => {
    it('nên cập nhật thông tin kinh nghiệm thành công', async () => {
      const experienceId = 1;
      const updateDto = {
        user_id: 1,
        job_title: 'Senior Developer',
        company: 'Company B',
      };
      const existingExperience = {
        id: experienceId,
        user_info_id: 1,
      };
      const updatedExperience = {
        ...existingExperience,
        ...updateDto,
      };

      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.experience.findFirst.mockResolvedValue(existingExperience);
      mockPrismaService.experience.update.mockResolvedValue(updatedExperience);

      const result = await service.updateExperience(experienceId, updateDto);
      expect(result).toEqual(updatedExperience);
    });
  });

  describe('deleteExperience', () => {
    it('nên xóa thông tin kinh nghiệm thành công', async () => {
      const experienceId = 1;
      const user_id = 1;
      const existingExperience = {
        id: experienceId,
        user_info_id: 1,
      };

      mockPrismaService.users.findUnique.mockResolvedValue({
        id: user_id,
        user_information: { id: 1 },
      });
      mockPrismaService.experience.findFirst.mockResolvedValue(existingExperience);
      mockPrismaService.experience.update.mockResolvedValue({
        ...existingExperience,
        deleted_at: new Date(),
      });

      const result = await service.deleteExperience(experienceId, user_id);
      expect(result.message).toBe('Xóa thông tin kinh nghiệm thành công');
    });

    it('nên throw NotFoundException khi không tìm thấy experience', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.experience.findFirst.mockResolvedValue(null);
      await expect(service.deleteExperience(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserSkill', () => {
    it('nên cập nhật user skill thành công', async () => {
      const userskill_id = 1;
      const updateDto = {
        user_id: 1,
        skill_id: 1,
        experience: 5,
      };
      const existingUserSkill = {
        id: userskill_id,
        user_info_id: 1,
      };
      const mockSkill = { id: 1, name: 'JavaScript' };
      const updatedUserSkill = {
        ...existingUserSkill,
        ...updateDto,
        skill: mockSkill,
      };

      mockPrismaService.user_skills.findFirst.mockResolvedValue(existingUserSkill);
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.skills.findFirst.mockResolvedValue(mockSkill);
      mockPrismaService.user_skills.update.mockResolvedValue(updatedUserSkill);

      const result = await service.updateUserSkill(userskill_id, updateDto);
      expect(result).toEqual(updatedUserSkill);
    });

    it('nên throw ForbiddenException khi không phải owner', async () => {
      const existingUserSkill = {
        id: 1,
        user_info_id: 2,
      };

      mockPrismaService.user_skills.findFirst.mockResolvedValue(existingUserSkill);
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });

      await expect(service.updateUserSkill(1, { user_id: 1, skill_id: 1 })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteUserSkill', () => {
    it('nên xóa user skill thành công', async () => {
      const userskill_id = 1;
      const user_id = 1;
      const existingUserSkill = {
        id: userskill_id,
        user_info_id: 1,
      };

      mockPrismaService.user_skills.findFirst.mockResolvedValue(existingUserSkill);
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: user_id,
        user_information: { id: 1 },
      });
      mockPrismaService.user_skills.update.mockResolvedValue({
        ...existingUserSkill,
        deleted_at: new Date(),
      });

      const result = await service.deleteUserSkill(userskill_id, user_id);
      expect(result.message).toBe('Xóa thông tin kỹ năng thành công');
    });

    it('nên throw NotFoundException/ForbiddenException khi không tìm thấy hoặc không phải owner', async () => {
      mockPrismaService.user_skills.findFirst.mockResolvedValue(null);
      await expect(service.deleteUserSkill(999, 1)).rejects.toThrow(NotFoundException);

      const existingUserSkill = {
        id: 1,
        user_info_id: 2,
      };
      mockPrismaService.user_skills.findFirst.mockResolvedValue(existingUserSkill);
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      await expect(service.deleteUserSkill(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEducationsPaginated', () => {
    it('nên trả về danh sách học vấn có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        name: 'Đại học',
      };
      const mockEducations = [
        {
          id: 1,
          name: 'Đại học',
          major: 'Công nghệ thông tin',
        },
      ];

      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.education.findMany.mockResolvedValue(mockEducations);
      mockPrismaService.education.count.mockResolvedValue(1);

      const result = await service.getEducationsPaginated(1, paginationDto);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockPrismaService.education.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'Đại học',
            }),
          }),
        }),
      );
    });

    it('nên trả về empty khi không có user_information', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      const result = await service.getEducationsPaginated(999, { page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getExperiencesPaginated', () => {
    it('nên trả về danh sách kinh nghiệm có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        company_name: 'Company A',
      };
      const mockExperiences = [
        {
          id: 1,
          job_title: 'Developer',
          company: 'Company A',
        },
      ];

      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.experience.findMany.mockResolvedValue(mockExperiences);
      mockPrismaService.experience.count.mockResolvedValue(1);

      const result = await service.getExperiencesPaginated(1, paginationDto);
      expect(result).toBeDefined();
      if ('data' in result && 'pagination' in result) {
        expect((result as any).data).toHaveLength(1);
        expect((result as any).pagination.total).toBe(1);
      }
      expect(mockPrismaService.experience.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company: expect.objectContaining({
              contains: 'Company A',
            }),
          }),
        }),
      );
    });

    it('nên trả về empty object khi không có user_information', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      const result = await service.getExperiencesPaginated(999, { page: 1, limit: 10 });
      expect(result).toEqual({});
    });
  });

  describe('getUserSkillsPaginated', () => {
    it('nên trả về danh sách kỹ năng có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        skill_id: 1,
      };
      const mockUserSkills = [
        {
          id: 1,
          skill_id: 1,
          experience: 3,
          skill: { id: 1, name: 'JavaScript' },
        },
      ];

      mockPrismaService.users.findUnique.mockResolvedValue({
        id: 1,
        user_information: { id: 1 },
      });
      mockPrismaService.user_skills.findMany.mockResolvedValue(mockUserSkills);
      mockPrismaService.user_skills.count.mockResolvedValue(1);

      const result = await service.getUserSkillsPaginated(1, paginationDto);
      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.user_skills.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            skill_id: { equals: 1 },
          }),
        }),
      );
    });

    it('nên trả về empty khi không có user_information', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      const result = await service.getUserSkillsPaginated(999, { page: 1, limit: 10 });
      expect(result.data).toEqual([]);
    });
  });

  describe('getUserCertificatesPaginated', () => {
    it('nên trả về danh sách chứng chỉ rỗng', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const result = await service.getUserCertificatesPaginated(1, paginationDto);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getSkillsByPosition', () => {
    it('nên lấy danh sách skills theo position', async () => {
      const position_id = 1;
      const mockSkills = [
        { id: 1, name: 'JavaScript', position_id },
        { id: 2, name: 'TypeScript', position_id },
      ];

      mockPrismaService.skills.findMany.mockResolvedValue(mockSkills);
      const result = await service.getSkillsByPosition(position_id);
      expect(result).toEqual(mockSkills);
    });
  });

  describe('updateAvatar', () => {
    it('nên cập nhật avatar thành công', async () => {
      const user_id = 1;
      const avatarUrl = 'https://example.com/avatar.jpg';
      const mockUser = {
        id: user_id,
        user_information: { id: 1 },
      };
      const updatedUser = {
        ...mockUser,
        user_information: { ...mockUser.user_information, avatar: avatarUrl },
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar(user_id, avatarUrl);
      expect(result.avatar_url).toBe(avatarUrl);
      expect(result.message).toBe('Cập nhật avatar thành công');
    });

    it('nên throw NotFoundException khi không tìm thấy user', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);
      await expect(service.updateAvatar(999, 'https://example.com/avatar.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPosition', () => {
    it('nên tạo position thành công', async () => {
      const createDto: CreatePositionDto = {
        name: 'Senior Developer',
      };
      const mockPosition = {
        id: 1,
        ...createDto,
      };

      mockPrismaService.positions.findFirst.mockResolvedValue(null);
      mockPrismaService.positions.create.mockResolvedValue(mockPosition);

      const result = await service.createPosition(createDto);
      expect(result.data).toEqual(mockPosition);
    });

    it('nên throw BadRequestException khi tên position đã tồn tại', async () => {
      const createDto: CreatePositionDto = {
        name: 'Developer',
      };

      mockPrismaService.positions.findFirst.mockResolvedValue({ id: 1, name: 'Developer' });
      await expect(service.createPosition(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createLanguage', () => {
    it('nên tạo language thành công', async () => {
      const createDto: CreateLanguageDto = {
        name: 'English',
      };
      const mockLanguage = {
        id: 1,
        ...createDto,
      };

      mockPrismaService.languages.findFirst.mockResolvedValue(null);
      mockPrismaService.languages.create.mockResolvedValue(mockLanguage);

      const result = await service.createLanguage(createDto);
      expect(result.data).toEqual(mockLanguage);
    });

    it('nên throw BadRequestException khi tên language đã tồn tại', async () => {
      const createDto: CreateLanguageDto = {
        name: 'English',
      };

      mockPrismaService.languages.findFirst.mockResolvedValue({ id: 1, name: 'English' });
      await expect(service.createLanguage(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createSkill', () => {
    it('nên tạo skill thành công', async () => {
      const createDto: CreateSkillDto = {
        name: 'JavaScript',
        position_id: 1,
      };
      const mockPosition = { id: 1, name: 'Developer' };
      const mockSkill = {
        id: 1,
        ...createDto,
        position: mockPosition,
      };

      mockPrismaService.positions.findFirst.mockResolvedValue(mockPosition);
      mockPrismaService.skills.findFirst.mockResolvedValue(null);
      mockPrismaService.skills.create.mockResolvedValue(mockSkill);

      const result = await service.createSkill(createDto);
      expect(result.data).toEqual(mockSkill);
    });

    it('nên throw BadRequestException khi position không tồn tại', async () => {
      mockPrismaService.positions.findFirst.mockResolvedValue(null);
      await expect(
        service.createSkill({
          name: 'JavaScript',
          position_id: 999,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllPositions', () => {
    it('nên lấy danh sách positions có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        search: 'Developer',
      };
      const mockPositions = [{ id: 1, name: 'Developer' }];
      const total = 1;

      mockPrismaService.positions.findMany.mockResolvedValue(mockPositions);
      mockPrismaService.positions.count.mockResolvedValue(total);

      const result = await service.findAllPositions(paginationDto);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(total);
      expect(mockPrismaService.positions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'Developer',
            }),
          }),
        }),
      );
    });
  });

  describe('getPositionsPaginated', () => {
    it('nên lấy danh sách positions có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        search: 'Developer',
      };
      const mockPositions = [{ id: 1, name: 'Developer' }];

      mockPrismaService.positions.findMany.mockResolvedValue(mockPositions);
      mockPrismaService.positions.count.mockResolvedValue(1);

      const result = await service.getPositionsPaginated(paginationDto);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockPrismaService.positions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'Developer',
            }),
          }),
        }),
      );
    });
  });

  describe('getLanguagesPaginated', () => {
    it('nên lấy danh sách languages có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        search: 'Vietnamese',
      };
      const mockLanguages = [{ id: 1, name: 'Vietnamese' }];

      mockPrismaService.languages.findMany.mockResolvedValue(mockLanguages);
      mockPrismaService.languages.count.mockResolvedValue(1);

      const result = await service.getLanguagesPaginated(paginationDto);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockPrismaService.languages.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'Vietnamese',
            }),
          }),
        }),
      );
    });
  });

  describe('findAllLanguages', () => {
    it('nên lấy danh sách languages có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        search: 'Vietnamese',
      };
      const mockLanguages = [{ id: 1, name: 'Vietnamese' }];
      const total = 1;

      mockPrismaService.languages.findMany.mockResolvedValue(mockLanguages);
      mockPrismaService.languages.count.mockResolvedValue(total);

      const result = await service.findAllLanguages(paginationDto);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(total);
      expect(mockPrismaService.languages.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'Vietnamese',
            }),
          }),
        }),
      );
    });
  });

  describe('findOnePosition', () => {
    it('nên tìm thấy position theo id', async () => {
      const id = 1;
      const mockPosition = {
        id,
        name: 'Developer',
        skills: [],
        _count: { user_information: 0 },
      };

      mockPrismaService.positions.findFirst.mockResolvedValue(mockPosition);
      const result = await service.findOnePosition(id);
      expect(result.data).toEqual(mockPosition);
    });

    it('nên throw NotFoundException khi không tìm thấy position', async () => {
      mockPrismaService.positions.findFirst.mockResolvedValue(null);
      await expect(service.findOnePosition(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePosition', () => {
    it('nên cập nhật position thành công', async () => {
      const id = 1;
      const updateDto = { name: 'Senior Developer' };
      const existingPosition = {
        id,
        name: 'Developer',
      };
      const updatedPosition = {
        ...existingPosition,
        ...updateDto,
      };

      mockPrismaService.positions.findFirst
        .mockResolvedValueOnce(existingPosition)
        .mockResolvedValueOnce(null);
      mockPrismaService.positions.update.mockResolvedValue(updatedPosition);

      const result = await service.updatePosition(id, updateDto);
      expect(result.data).toEqual(updatedPosition);
    });

    it('nên throw NotFoundException/BadRequestException khi không tìm thấy hoặc tên đã tồn tại', async () => {
      mockPrismaService.positions.findFirst.mockResolvedValue(null);
      await expect(service.updatePosition(999, { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );

      const id = 1;
      const updateDto = { name: 'Senior Developer' };
      const existingPosition = {
        id,
        name: 'Developer',
      };
      const duplicatePosition = {
        id: 2,
        name: 'Senior Developer',
      };

      mockPrismaService.positions.findFirst
        .mockResolvedValueOnce(existingPosition)
        .mockResolvedValueOnce(duplicatePosition);
      await expect(service.updatePosition(id, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removePosition', () => {
    it('nên xóa position thành công', async () => {
      const id = 1;
      const existingPosition = {
        id,
        name: 'Developer',
        _count: { user_information: 0 },
      };

      mockPrismaService.positions.findFirst.mockResolvedValue(existingPosition);
      mockPrismaService.positions.update.mockResolvedValue({
        ...existingPosition,
        deleted_at: new Date(),
      });

      const result = await service.removePosition(id);
      expect(result.message).toBe('Xóa vị trí thành công');
    });

    it('nên throw NotFoundException/BadRequestException khi không tìm thấy hoặc có user đang sử dụng', async () => {
      mockPrismaService.positions.findFirst.mockResolvedValue(null);
      await expect(service.removePosition(999)).rejects.toThrow(NotFoundException);

      const id = 1;
      const existingPosition = {
        id,
        name: 'Developer',
        _count: { user_information: 5 },
      };

      mockPrismaService.positions.findFirst.mockResolvedValue(existingPosition);
      await expect(service.removePosition(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneLanguage', () => {
    it('nên tìm thấy language theo id', async () => {
      const id = 1;
      const mockLanguage = {
        id,
        name: 'Vietnamese',
        _count: { user_information: 0 },
      };

      mockPrismaService.languages.findFirst.mockResolvedValue(mockLanguage);
      const result = await service.findOneLanguage(id);
      expect(result.data).toEqual(mockLanguage);
    });

    it('nên throw NotFoundException khi không tìm thấy language', async () => {
      mockPrismaService.languages.findFirst.mockResolvedValue(null);
      await expect(service.findOneLanguage(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLanguage', () => {
    it('nên cập nhật language thành công', async () => {
      const id = 1;
      const updateDto = { name: 'English' };
      const existingLanguage = {
        id,
        name: 'Vietnamese',
      };
      const updatedLanguage = {
        ...existingLanguage,
        ...updateDto,
      };

      mockPrismaService.languages.findFirst
        .mockResolvedValueOnce(existingLanguage)
        .mockResolvedValueOnce(null);
      mockPrismaService.languages.update.mockResolvedValue(updatedLanguage);

      const result = await service.updateLanguage(id, updateDto);
      expect(result.data).toEqual(updatedLanguage);
    });

    it('nên throw NotFoundException/BadRequestException khi không tìm thấy hoặc tên đã tồn tại', async () => {
      mockPrismaService.languages.findFirst.mockResolvedValue(null);
      await expect(service.updateLanguage(999, { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );

      const id = 1;
      const updateDto = { name: 'English' };
      const existingLanguage = {
        id,
        name: 'Vietnamese',
      };
      const duplicateLanguage = {
        id: 2,
        name: 'English',
      };

      mockPrismaService.languages.findFirst
        .mockResolvedValueOnce(existingLanguage)
        .mockResolvedValueOnce(duplicateLanguage);
      await expect(service.updateLanguage(id, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeLanguage', () => {
    it('nên xóa language thành công', async () => {
      const id = 1;
      const existingLanguage = {
        id,
        name: 'Vietnamese',
        _count: { user_information: 0 },
      };

      mockPrismaService.languages.findFirst.mockResolvedValue(existingLanguage);
      mockPrismaService.languages.update.mockResolvedValue({
        ...existingLanguage,
        deleted_at: new Date(),
      });

      const result = await service.removeLanguage(id);
      expect(result.message).toBe('Xóa ngôn ngữ thành công');
    });

    it('nên throw NotFoundException/BadRequestException khi không tìm thấy hoặc có user đang sử dụng', async () => {
      mockPrismaService.languages.findFirst.mockResolvedValue(null);
      await expect(service.removeLanguage(999)).rejects.toThrow(NotFoundException);

      const id = 1;
      const existingLanguage = {
        id,
        name: 'Vietnamese',
        _count: { user_information: 3 },
      };

      mockPrismaService.languages.findFirst.mockResolvedValue(existingLanguage);
      await expect(service.removeLanguage(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneSkill', () => {
    it('nên tìm thấy skill theo id', async () => {
      const id = 1;
      const mockSkill = {
        id,
        name: 'JavaScript',
        position: { id: 1, name: 'Developer' },
        _count: { user_skills: 0 },
      };

      mockPrismaService.skills.findFirst.mockResolvedValue(mockSkill);
      const result = await service.findOneSkill(id);
      expect(result.data).toEqual(mockSkill);
    });

    it('nên throw NotFoundException khi không tìm thấy skill', async () => {
      mockPrismaService.skills.findFirst.mockResolvedValue(null);
      await expect(service.findOneSkill(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSkill', () => {
    it('nên cập nhật skill thành công', async () => {
      const id = 1;
      const updateDto = { name: 'TypeScript' };
      const existingSkill = {
        id,
        name: 'JavaScript',
        position_id: 1,
      };
      const updatedSkill = {
        ...existingSkill,
        ...updateDto,
        position: { id: 1, name: 'Developer' },
      };

      mockPrismaService.skills.findFirst
        .mockResolvedValueOnce(existingSkill)
        .mockResolvedValueOnce(null);
      mockPrismaService.skills.update.mockResolvedValue(updatedSkill);

      const result = await service.updateSkill(id, updateDto);
      expect(result.data).toEqual(updatedSkill);
    });

    it('nên throw NotFoundException khi không tìm thấy skill', async () => {
      mockPrismaService.skills.findFirst.mockResolvedValue(null);
      await expect(service.updateSkill(999, { name: 'New' })).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi position không tồn tại', async () => {
      const id = 1;
      const updateDto = { position_id: 999 };
      const existingSkill = {
        id,
        name: 'JavaScript',
        position_id: 1,
      };

      mockPrismaService.skills.findFirst.mockResolvedValue(existingSkill);
      mockPrismaService.positions.findFirst.mockResolvedValue(null);
      await expect(service.updateSkill(id, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('nên throw BadRequestException khi tên skill đã tồn tại trong position', async () => {
      const id = 1;
      const updateDto = { name: 'TypeScript' };
      const existingSkill = {
        id,
        name: 'JavaScript',
        position_id: 1,
      };
      const duplicateSkill = {
        id: 2,
        name: 'TypeScript',
        position_id: 1,
      };

      mockPrismaService.skills.findFirst
        .mockResolvedValueOnce(existingSkill)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(duplicateSkill);
      await expect(service.updateSkill(id, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeSkill', () => {
    it('nên xóa skill thành công', async () => {
      const id = 1;
      const existingSkill = {
        id,
        name: 'JavaScript',
        _count: { user_skills: 0 },
      };

      mockPrismaService.skills.findFirst.mockResolvedValue(existingSkill);
      mockPrismaService.skills.update.mockResolvedValue({
        ...existingSkill,
        deleted_at: new Date(),
      });

      const result = await service.removeSkill(id);
      expect(result.message).toBe('Xóa kỹ năng thành công');
    });

    it('nên throw NotFoundException khi không tìm thấy skill', async () => {
      mockPrismaService.skills.findFirst.mockResolvedValue(null);
      await expect(service.removeSkill(999)).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi có user đang sử dụng skill', async () => {
      const id = 1;
      const existingSkill = {
        id,
        name: 'JavaScript',
        _count: { user_skills: 5 },
      };

      mockPrismaService.skills.findFirst.mockResolvedValue(existingSkill);
      await expect(service.removeSkill(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllSkills', () => {
    it('nên lấy danh sách skills có phân trang và hỗ trợ filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        search: 'JavaScript',
      };
      const mockSkills = [
        {
          id: 1,
          name: 'JavaScript',
          position: { id: 1, name: 'Developer' },
          _count: { user_skills: 0 },
        },
      ];
      const total = 1;

      mockPrismaService.skills.findMany.mockResolvedValue(mockSkills);
      mockPrismaService.skills.count.mockResolvedValue(total);

      const result = await service.findAllSkills(paginationDto);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(total);
      expect(mockPrismaService.skills.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'JavaScript',
            }),
          }),
        }),
      );
    });
  });
});
