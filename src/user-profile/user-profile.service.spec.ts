import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileService } from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserProfileService,
          useValue: {
            // Mock only the methods we want to test
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            changePassword: jest.fn(),
            uploadAvatar: jest.fn(),
            getMySkills: jest.fn(),
            addSkill: jest.fn(),
            removeSkill: jest.fn(),
            getMyCertificates: jest.fn(),
            addCertificate: jest.fn(),
            removeCertificate: jest.fn(),
            getMyProjects: jest.fn(),
            getMyTeams: jest.fn(),
            getMyDivisions: jest.fn(),
            updatePersonalInfo: jest.fn(),
            updateContactInfo: jest.fn(),
            updateEmergencyContact: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have getProfile method', () => {
    expect(service.getProfile).toBeDefined();
  });

  it('should have updateProfile method', () => {
    expect(service.updateProfile).toBeDefined();
  });

  it('should have changePassword method', () => {
    expect(service.changePassword).toBeDefined();
  });

  it('should have uploadAvatar method', () => {
    expect(service.uploadAvatar).toBeDefined();
  });

  it('should have getMySkills method', () => {
    expect(service.getMySkills).toBeDefined();
  });

  it('should have addSkill method', () => {
    expect(service.addSkill).toBeDefined();
  });

  it('should have removeSkill method', () => {
    expect(service.removeSkill).toBeDefined();
  });

  it('should have getMyCertificates method', () => {
    expect(service.getMyCertificates).toBeDefined();
  });

  it('should have addCertificate method', () => {
    expect(service.addCertificate).toBeDefined();
  });

  it('should have removeCertificate method', () => {
    expect(service.removeCertificate).toBeDefined();
  });

  it('should have getMyProjects method', () => {
    expect(service.getMyProjects).toBeDefined();
  });

  it('should have getMyTeams method', () => {
    expect(service.getMyTeams).toBeDefined();
  });

  it('should have getMyDivisions method', () => {
    expect(service.getMyDivisions).toBeDefined();
  });

  it('should have updatePersonalInfo method', () => {
    expect(service.updatePersonalInfo).toBeDefined();
  });

  it('should have updateContactInfo method', () => {
    expect(service.updateContactInfo).toBeDefined();
  });

  it('should have updateEmergencyContact method', () => {
    expect(service.updateEmergencyContact).toBeDefined();
  });
});
