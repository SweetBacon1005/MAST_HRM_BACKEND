import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { UpdateAvatarDto } from './dto/upload-avatar.dto';
import { CreateLanguageDto } from './languages/dto/create-language.dto';
import { UpdateLanguageDto } from './languages/dto/update-language.dto';
import { CreatePositionDto } from './positions/dto/create-position.dto';
import { UpdatePositionDto } from './positions/dto/update-position.dto';
import { CreateSkillDto } from './skills/dto/create-skill.dto';
import { UpdateSkillDto } from './skills/dto/update-skill.dto';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';

describe('UserProfileController', () => {
  let controller: UserProfileController;
  let service: UserProfileService;

  const mockUserProfileService = {
    getUserProfile: jest.fn(),
    updateUserInformation: jest.fn(),
    createEducation: jest.fn(),
    getEducationsPaginated: jest.fn(),
    updateEducation: jest.fn(),
    deleteEducation: jest.fn(),
    createExperience: jest.fn(),
    getExperiencesPaginated: jest.fn(),
    updateExperience: jest.fn(),
    deleteExperience: jest.fn(),
    createUserSkill: jest.fn(),
    getSkillsByPosition: jest.fn(),
    getUserSkillsPaginated: jest.fn(),
    updateUserSkill: jest.fn(),
    deleteUserSkill: jest.fn(),
    getPositionsPaginated: jest.fn(),
    getLanguagesPaginated: jest.fn(),
    updateAvatar: jest.fn(),
    createPosition: jest.fn(),
    findAllPositions: jest.fn(),
    findOnePosition: jest.fn(),
    updatePosition: jest.fn(),
    removePosition: jest.fn(),
    createLanguage: jest.fn(),
    findAllLanguages: jest.fn(),
    findOneLanguage: jest.fn(),
    updateLanguage: jest.fn(),
    removeLanguage: jest.fn(),
    createSkill: jest.fn(),
    findAllSkills: jest.fn(),
    findOneSkill: jest.fn(),
    updateSkill: jest.fn(),
    removeSkill: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [
        {
          provide: UserProfileService,
          useValue: mockUserProfileService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserProfileController>(UserProfileController);
    service = module.get<UserProfileService>(UserProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('nên được định nghĩa', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserProfile', () => {
    it('nên lấy thông tin profile thành công', async () => {
      const user_id = 1;
      const mockProfile = {
        id: user_id,
        email: 'test@example.com',
        user_information: {
          name: 'Test User',
        },
      };

      mockUserProfileService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await controller.getUserProfile(user_id);

      expect(service.getUserProfile).toHaveBeenCalledWith(user_id);
      expect(result).toEqual(mockProfile);
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
      const mockUpdatedInfo = {
        id: 1,
        ...updateDto,
      };

      mockUserProfileService.updateUserInformation.mockResolvedValue(
        mockUpdatedInfo,
      );

      const result = await controller.updateUserInformation(user_id, updateDto);

      expect(service.updateUserInformation).toHaveBeenCalledWith(
        user_id,
        updateDto,
      );
      expect(result).toEqual(mockUpdatedInfo);
    });
  });

  describe('createEducation', () => {
    it('nên tạo thông tin học vấn thành công', async () => {
      const user_id = 1;
      const createDto: CreateEducationDto = {
        name: 'Đại học',
        major: 'Công nghệ thông tin',
        start_date: '2020-01-01',
        end_date: '2024-01-01',
        description: 'Description',
        user_id,
      };
      const mockEducation = {
        id: 1,
        ...createDto,
      };

      mockUserProfileService.createEducation.mockResolvedValue(mockEducation);

      const result = await controller.createEducation(user_id, createDto);

      expect(service.createEducation).toHaveBeenCalledWith({
        ...createDto,
        user_id,
      });
      expect(result).toEqual(mockEducation);
    });
  });

  describe('getEducations', () => {
    it('nên lấy danh sách học vấn có phân trang', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, name: 'Đại học' }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.getEducationsPaginated.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getEducations(user_id, paginationDto);

      expect(service.getEducationsPaginated).toHaveBeenCalledWith(
        user_id,
        paginationDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateEducation', () => {
    it('nên cập nhật thông tin học vấn thành công', async () => {
      const educationId = 1;
      const user_id = 1;
      const updateDto: UpdateEducationDto = {
        name: 'Đại học (cập nhật)',
        major: 'Công nghệ thông tin',
      };
      const mockUpdatedEducation = {
        id: educationId,
        ...updateDto,
      };

      mockUserProfileService.updateEducation.mockResolvedValue(
        mockUpdatedEducation,
      );

      const result = await controller.updateEducation(
        educationId,
        updateDto,
        user_id,
      );

      expect(service.updateEducation).toHaveBeenCalledWith(educationId, {
        ...updateDto,
        user_id,
      });
      expect(result).toEqual(mockUpdatedEducation);
    });
  });

  describe('deleteEducation', () => {
    it('nên xóa thông tin học vấn thành công', async () => {
      const educationId = 1;
      const user_id = 1;
      const mockResponse = {
        message: 'Xóa thông tin học vấn thành công',
      };

      mockUserProfileService.deleteEducation.mockResolvedValue(mockResponse);

      const result = await controller.deleteEducation(educationId, user_id);

      expect(service.deleteEducation).toHaveBeenCalledWith(
        educationId,
        user_id,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createExperience', () => {
    it('nên tạo thông tin kinh nghiệm thành công', async () => {
      const user_id = 1;
      const createDto: CreateExperienceDto = {
        job_title: 'Developer',
        company: 'Company A',
        start_date: '2020-01-01',
        end_date: '2024-01-01',
        user_id,
      };
      const mockExperience = {
        id: 1,
        ...createDto,
      };

      mockUserProfileService.createExperience.mockResolvedValue(mockExperience);

      const result = await controller.createExperience(user_id, createDto);

      expect(service.createExperience).toHaveBeenCalledWith({
        ...createDto,
        user_id,
      });
      expect(result).toEqual(mockExperience);
    });
  });

  describe('getExperiences', () => {
    it('nên lấy danh sách kinh nghiệm có phân trang', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, job_title: 'Developer' }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.getExperiencesPaginated.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getExperiences(user_id, paginationDto);

      expect(service.getExperiencesPaginated).toHaveBeenCalledWith(
        user_id,
        paginationDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateExperience', () => {
    it('nên cập nhật thông tin kinh nghiệm thành công', async () => {
      const experienceId = 1;
      const user_id = 1;
      const updateDto: UpdateExperienceDto = {
        job_title: 'Senior Developer',
        company: 'Company B',
      };
      const mockUpdatedExperience = {
        id: experienceId,
        ...updateDto,
      };

      mockUserProfileService.updateExperience.mockResolvedValue(
        mockUpdatedExperience,
      );

      const result = await controller.updateExperience(
        experienceId,
        updateDto,
        user_id,
      );

      expect(service.updateExperience).toHaveBeenCalledWith(experienceId, {
        ...updateDto,
        user_id,
      });
      expect(result).toEqual(mockUpdatedExperience);
    });
  });

  describe('deleteExperience', () => {
    it('nên xóa thông tin kinh nghiệm thành công', async () => {
      const experienceId = 1;
      const user_id = 1;
      const mockResponse = {
        message: 'Xóa thông tin kinh nghiệm thành công',
      };

      mockUserProfileService.deleteExperience.mockResolvedValue(mockResponse);

      const result = await controller.deleteExperience(experienceId, user_id);

      expect(service.deleteExperience).toHaveBeenCalledWith(
        experienceId,
        user_id,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createUserSkill', () => {
    it('nên tạo user skill thành công', async () => {
      const user_id = 1;
      const createDto: CreateUserSkillDto = {
        skill_id: 1,
        experience: 3,
        months_experience: 36,
        user_id,
      };
      const mockUserSkill = {
        id: 1,
        ...createDto,
      };

      mockUserProfileService.createUserSkill.mockResolvedValue(mockUserSkill);

      const result = await controller.createUserSkill(user_id, createDto);

      expect(service.createUserSkill).toHaveBeenCalledWith({
        ...createDto,
        user_id,
      });
      expect(result).toEqual(mockUserSkill);
    });
  });

  describe('getSkillsByPosition', () => {
    it('nên lấy danh sách kỹ năng theo vị trí', async () => {
      const position_id = 1;
      const mockSkills = [
        { id: 1, name: 'JavaScript', position_id },
        { id: 2, name: 'TypeScript', position_id },
      ];

      mockUserProfileService.getSkillsByPosition.mockResolvedValue(mockSkills);

      const result = await controller.getSkillsByPosition(position_id);

      expect(service.getSkillsByPosition).toHaveBeenCalledWith(position_id);
      expect(result).toEqual(mockSkills);
    });
  });

  describe('getUserSkills', () => {
    it('nên lấy danh sách kỹ năng có phân trang', async () => {
      const user_id = 1;
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, skill_id: 1 }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.getUserSkillsPaginated.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getUserSkills(user_id, paginationDto);

      expect(service.getUserSkillsPaginated).toHaveBeenCalledWith(
        user_id,
        paginationDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateUserSkill', () => {
    it('nên cập nhật user skill thành công', async () => {
      const userskill_id = 1;
      const user_id = 1;
      const updateDto: UpdateUserSkillDto = {
        skill_id: 1,
        experience: 5,
      };
      const mockUpdatedUserSkill = {
        id: userskill_id,
        ...updateDto,
      };

      mockUserProfileService.updateUserSkill.mockResolvedValue(
        mockUpdatedUserSkill,
      );

      const result = await controller.updateUserSkill(
        userskill_id,
        updateDto,
        user_id,
      );

      expect(service.updateUserSkill).toHaveBeenCalledWith(userskill_id, {
        ...updateDto,
        user_id,
      });
      expect(result).toEqual(mockUpdatedUserSkill);
    });
  });

  describe('deleteUserSkill', () => {
    it('nên xóa user skill thành công', async () => {
      const userskill_id = 1;
      const user_id = 1;
      const mockResponse = {
        message: 'Xóa thông tin kỹ năng thành công',
      };

      mockUserProfileService.deleteUserSkill.mockResolvedValue(mockResponse);

      const result = await controller.deleteUserSkill(userskill_id, user_id);

      expect(service.deleteUserSkill).toHaveBeenCalledWith(
        userskill_id,
        user_id,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPositions', () => {
    it('nên lấy danh sách vị trí có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, name: 'Developer' }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.getPositionsPaginated.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getPositions(paginationDto);

      expect(service.getPositionsPaginated).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLevels', () => {
    it('nên throw error vì levels endpoint không còn tồn tại', () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      expect(() => controller.getLevels(paginationDto)).toThrow(
        'Levels endpoint no longer exists - levels table removed',
      );
    });
  });

  describe('getLanguages', () => {
    it('nên lấy danh sách ngôn ngữ có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, name: 'Vietnamese' }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.getLanguagesPaginated.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getLanguages(paginationDto);

      expect(service.getLanguagesPaginated).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateAvatar', () => {
    it('nên cập nhật avatar thành công', async () => {
      const user_id = 1;
      const updateAvatarDto: UpdateAvatarDto = {
        avatar_url: 'https://example.com/avatar.jpg',
      };
      const mockResponse = {
        avatar_url: updateAvatarDto.avatar_url,
        message: 'Cập nhật avatar thành công',
      };

      mockUserProfileService.updateAvatar.mockResolvedValue(mockResponse);

      const result = await controller.updateAvatar(user_id, updateAvatarDto);

      expect(service.updateAvatar).toHaveBeenCalledWith(
        user_id,
        updateAvatarDto.avatar_url,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createLevel', () => {
    it('nên throw error vì levels endpoint không còn tồn tại', () => {
      const createLevelDto = {
        name: 'Senior',
        level: 3,
        description: 'Cấp độ cao cấp',
      };

      expect(() => controller.createLevel(createLevelDto)).toThrow(
        'Levels endpoint no longer exists - levels table removed',
      );
    });
  });

  describe('findAllLevels', () => {
    it('nên throw error vì levels endpoint không còn tồn tại', () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      expect(() => controller.findAllLevels(paginationDto)).toThrow(
        'Levels endpoint no longer exists - levels table removed',
      );
    });
  });

  describe('findOneLevel', () => {
    it('nên throw error vì levels endpoint không còn tồn tại', () => {
      expect(() => controller.findOneLevel(1)).toThrow(
        'Levels endpoint no longer exists - levels table removed',
      );
    });
  });

  describe('updateLevel', () => {
    it('nên throw error vì levels endpoint không còn tồn tại', () => {
      const updateLevelDto = {
        name: 'Senior',
      };

      expect(() => controller.updateLevel(1, updateLevelDto)).toThrow(
        'Levels endpoint no longer exists - levels table removed',
      );
    });
  });

  describe('removeLevel', () => {
    it('nên throw error vì levels endpoint không còn tồn tại', () => {
      expect(() => controller.removeLevel(1)).toThrow(
        'Levels endpoint no longer exists - levels table removed',
      );
    });
  });

  describe('createPosition', () => {
    it('nên tạo position thành công', async () => {
      const createPositionDto: CreatePositionDto = {
        name: 'Senior Developer',
      };
      const mockResponse = {
        message: 'Tạo vị trí thành công',
        data: {
          id: 1,
          ...createPositionDto,
        },
      };

      mockUserProfileService.createPosition.mockResolvedValue(mockResponse);

      const result = await controller.createPosition(createPositionDto);

      expect(service.createPosition).toHaveBeenCalledWith(createPositionDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAllPositions', () => {
    it('nên lấy danh sách positions có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, name: 'Developer' }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.findAllPositions.mockResolvedValue(mockResponse);

      const result = await controller.findAllPositions(paginationDto);

      expect(service.findAllPositions).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOnePosition', () => {
    it('nên lấy thông tin position theo id', async () => {
      const id = 1;
      const mockResponse = {
        data: {
          id,
          name: 'Developer',
          skills: [],
          _count: { user_information: 0 },
        },
      };

      mockUserProfileService.findOnePosition.mockResolvedValue(mockResponse);

      const result = await controller.findOnePosition(id);

      expect(service.findOnePosition).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updatePosition', () => {
    it('nên cập nhật position thành công', async () => {
      const id = 1;
      const updatePositionDto: UpdatePositionDto = {
        name: 'Senior Developer',
      };
      const mockResponse = {
        message: 'Cập nhật vị trí thành công',
        data: {
          id,
          ...updatePositionDto,
        },
      };

      mockUserProfileService.updatePosition.mockResolvedValue(mockResponse);

      const result = await controller.updatePosition(id, updatePositionDto);

      expect(service.updatePosition).toHaveBeenCalledWith(
        id,
        updatePositionDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removePosition', () => {
    it('nên xóa position thành công', async () => {
      const id = 1;
      const mockResponse = {
        message: 'Xóa vị trí thành công',
      };

      mockUserProfileService.removePosition.mockResolvedValue(mockResponse);

      const result = await controller.removePosition(id);

      expect(service.removePosition).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createLanguage', () => {
    it('nên tạo language thành công', async () => {
      const createLanguageDto: CreateLanguageDto = {
        name: 'English',
      };
      const mockResponse = {
        message: 'Tạo ngôn ngữ thành công',
        data: {
          id: 1,
          ...createLanguageDto,
        },
      };

      mockUserProfileService.createLanguage.mockResolvedValue(mockResponse);

      const result = await controller.createLanguage(createLanguageDto);

      expect(service.createLanguage).toHaveBeenCalledWith(createLanguageDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAllLanguages', () => {
    it('nên lấy danh sách languages có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, name: 'Vietnamese' }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.findAllLanguages.mockResolvedValue(mockResponse);

      const result = await controller.findAllLanguages(paginationDto);

      expect(service.findAllLanguages).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOneLanguage', () => {
    it('nên lấy thông tin language theo id', async () => {
      const id = 1;
      const mockResponse = {
        data: {
          id,
          name: 'Vietnamese',
          _count: { user_information: 0 },
        },
      };

      mockUserProfileService.findOneLanguage.mockResolvedValue(mockResponse);

      const result = await controller.findOneLanguage(id);

      expect(service.findOneLanguage).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateLanguage', () => {
    it('nên cập nhật language thành công', async () => {
      const id = 1;
      const updateLanguageDto: UpdateLanguageDto = {
        name: 'English',
      };
      const mockResponse = {
        message: 'Cập nhật ngôn ngữ thành công',
        data: {
          id,
          ...updateLanguageDto,
        },
      };

      mockUserProfileService.updateLanguage.mockResolvedValue(mockResponse);

      const result = await controller.updateLanguage(id, updateLanguageDto);

      expect(service.updateLanguage).toHaveBeenCalledWith(
        id,
        updateLanguageDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeLanguage', () => {
    it('nên xóa language thành công', async () => {
      const id = 1;
      const mockResponse = {
        message: 'Xóa ngôn ngữ thành công',
      };

      mockUserProfileService.removeLanguage.mockResolvedValue(mockResponse);

      const result = await controller.removeLanguage(id);

      expect(service.removeLanguage).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createSkill', () => {
    it('nên tạo skill thành công', async () => {
      const createSkillDto: CreateSkillDto = {
        name: 'JavaScript',
        position_id: 1,
      };
      const mockResponse = {
        message: 'Tạo kỹ năng thành công',
        data: {
          id: 1,
          ...createSkillDto,
          position: { id: 1, name: 'Developer' },
        },
      };

      mockUserProfileService.createSkill.mockResolvedValue(mockResponse);

      const result = await controller.createSkill(createSkillDto);

      expect(service.createSkill).toHaveBeenCalledWith(createSkillDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAllSkills', () => {
    it('nên lấy danh sách skills có phân trang', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        data: [{ id: 1, name: 'JavaScript' }],
        pagination: {
          total: 1,
          current_page: 1,
          per_page: 10,
          total_pages: 1,
        },
      };

      mockUserProfileService.findAllSkills.mockResolvedValue(mockResponse);

      const result = await controller.findAllSkills(paginationDto);

      expect(service.findAllSkills).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOneSkill', () => {
    it('nên lấy thông tin skill theo id', async () => {
      const id = 1;
      const mockResponse = {
        data: {
          id,
          name: 'JavaScript',
          position: { id: 1, name: 'Developer' },
          _count: { user_skills: 0 },
        },
      };

      mockUserProfileService.findOneSkill.mockResolvedValue(mockResponse);

      const result = await controller.findOneSkill(id);

      expect(service.findOneSkill).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateSkill', () => {
    it('nên cập nhật skill thành công', async () => {
      const id = 1;
      const updateSkillDto: UpdateSkillDto = {
        name: 'TypeScript',
      };
      const mockResponse = {
        message: 'Cập nhật kỹ năng thành công',
        data: {
          id,
          ...updateSkillDto,
        },
      };

      mockUserProfileService.updateSkill.mockResolvedValue(mockResponse);

      const result = await controller.updateSkill(id, updateSkillDto);

      expect(service.updateSkill).toHaveBeenCalledWith(id, updateSkillDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeSkill', () => {
    it('nên xóa skill thành công', async () => {
      const id = 1;
      const mockResponse = {
        message: 'Xóa kỹ năng thành công',
      };

      mockUserProfileService.removeSkill.mockResolvedValue(mockResponse);

      const result = await controller.removeSkill(id);

      expect(service.removeSkill).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResponse);
    });
  });
});
