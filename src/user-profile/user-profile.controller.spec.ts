import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

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
    getUserSkillsPaginated: jest.fn(),
    updateUserSkill: jest.fn(),
    deleteUserSkill: jest.fn(),
    getPositionsPaginated: jest.fn(),
    getLanguagesPaginated: jest.fn(),
    updateAvatar: jest.fn(),
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

      mockUserProfileService.updateUserInformation.mockResolvedValue(mockUpdatedInfo);

      const result = await controller.updateUserInformation(user_id, updateDto);

      expect(service.updateUserInformation).toHaveBeenCalledWith(user_id, updateDto);
      expect(result).toEqual(mockUpdatedInfo);
    });
  });

  describe('createEducation', () => {
    it('nên tạo thông tin học vấn thành công', async () => {
      const user_id = 1;
      const createDto = {
        user_id,
        name: 'Đại học',
        major: 'Công nghệ thông tin',
        start_date: '2020-01-01',
        end_date: '2024-01-01',
      };
      const mockEducation = {
        id: 1,
        ...createDto,
      };

      mockUserProfileService.createEducation.mockResolvedValue(mockEducation);

      const result = await controller.createEducation(user_id, createDto);

      expect(service.createEducation).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockEducation);
    });
  });

  describe('createExperience', () => {
    it('nên tạo thông tin kinh nghiệm thành công', async () => {
      const user_id = 1;
      const createDto = {
        user_id,
        job_title: 'Developer',
        company: 'Company A',
        start_date: '2020-01-01',
        end_date: '2024-01-01',
      };
      const mockExperience = {
        id: 1,
        ...createDto,
      };

      mockUserProfileService.createExperience.mockResolvedValue(mockExperience);

      const result = await controller.createExperience(user_id, createDto);

      expect(service.createExperience).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockExperience);
    });
  });

  describe('createUserSkill', () => {
    it('nên tạo user skill thành công', async () => {
      const user_id = 1;
      const createDto = {
        user_id,
        skill_id: 1,
        experience: 3,
      };
      const mockUserSkill = {
        id: 1,
        ...createDto,
      };

      mockUserProfileService.createUserSkill.mockResolvedValue(mockUserSkill);

      const result = await controller.createUserSkill(user_id, createDto);

      expect(service.createUserSkill).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockUserSkill);
    });
  });
});

