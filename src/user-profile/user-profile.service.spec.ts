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
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    languages: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    skills: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    education: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    experience: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user_skills: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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

    it('nên throw NotFoundException khi không tìm thấy user', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);

      await expect(
        service.updateUserInformation(999, { name: 'Test', position_id: 1, language_id: 1 }),
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
        }),
      ).rejects.toThrow(NotFoundException);
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

      await expect(
        service.updateEducation(999, { user_id: 1, name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
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

      await expect(
        service.updateUserSkill(1, { user_id: 1, skill_id: 1 }),
      ).rejects.toThrow(ForbiddenException);
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
  });
});
