import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateUserCertificateDto } from './dto/create-user-certificate.dto';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import {
  CertificatePaginationDto,
  EducationPaginationDto,
  ExperiencePaginationDto,
  ReferencePaginationDto,
  UserSkillPaginationDto,
} from './dto/pagination-queries.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { UpdateUserCertificateDto } from './dto/update-user-certificate.dto';
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';

@Injectable()
export class UserProfileService {
  constructor(private prisma: PrismaService) {}

  // Xem thông tin cá nhân
  async getUserProfile(userId: number) {
    const userProfile = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      include: {
        user_information: {
          include: {
            position: true,
            role: true,
            level: true,
            language: true,
          },
        },
        education: {
          where: { deleted_at: null },
        },
        experience: {
          where: { deleted_at: null },
        },
        user_certificates: {
          where: { deleted_at: null },
        },
        user_skills: {
          where: { deleted_at: null },
          include: {
            skill: {
              include: {
                position: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    return userProfile;
  }

  // Cập nhật thông tin cá nhân
  async updateUserInformation(
    userId: number,
    updateDto: UpdateUserInformationDto,
  ) {
    // Kiểm tra user có tồn tại không
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const position = await this.prisma.positions.findFirst({
      where: { id: updateDto.position_id, deleted_at: null },
    });
    if (!position) {
      throw new NotFoundException('Không tìm thấy vị trí');
    }

    const role = await this.prisma.roles.findFirst({
      where: { id: updateDto.role_id, deleted_at: null },
    });
    if (!role) {
      throw new NotFoundException('Không tìm thấy vai trò');
    }

    const level = await this.prisma.levels.findFirst({
      where: { id: updateDto.level_id, ...{ deleted_at: null } },
    });
    if (!level) {
      throw new NotFoundException('Không tìm thấy trình độ');
    }

    const language = await this.prisma.languages.findFirst({
      where: { id: updateDto.language_id, ...{ deleted_at: null } },
    });
    if (!language) {
      throw new NotFoundException('Không tìm thấy ngôn ngữ');
    }

    const { position_id, role_id, level_id, language_id, ...rest } = updateDto;

    // Kiểm tra xem user_information đã tồn tại chưa
    const existingInfo = await this.prisma.user_information.findFirst({
      where: { user_id: userId, ...{ deleted_at: null } },
    });

    if (existingInfo) {
      // Cập nhật thông tin hiện có
      return await this.prisma.user_information.update({
        where: { id: existingInfo.id },
        data: {
          marital: updateDto.marital || '',
          nationality: updateDto.nationality || '',
          name: updateDto.name || '',
          code: updateDto.code || '',
          avatar: updateDto.avatar || '',
          gender: updateDto.gender || '',
          status: 'ACTIVE',
          birthday: updateDto.birthday
            ? new Date(updateDto.birthday).toISOString()
            : new Date().toISOString(),
          address: updateDto.address || '',
          temp_address: updateDto.temp_address || '',
          phone: updateDto.phone || '',
          tax_code: updateDto.tax_code || '',
          description: updateDto.description || '',
          note: updateDto.note || '',
          overview: updateDto.overview || '',
          expertise: updateDto.expertise || '',
          technique: updateDto.technique || '',
          main_task: updateDto.main_task || '',
          position: { connect: { id: position.id } },
          role: { connect: { id: role.id } },
          level: { connect: { id: level.id } },
          language: { connect: { id: language.id } },
        },
        include: {
          position: true,
          role: true,
          level: true,
          language: true,
        },
      });
    } else {
      // Tạo mới thông tin
      return await this.prisma.user_information.create({
        data: {
          status: 'ACTIVE',
          user_id: userId,
          email: updateDto.email || '',
          personal_email: updateDto.personal_email || '',
          nationality: updateDto.nationality || '',
          name: updateDto.name || '',
          code: updateDto.code || '',
          avatar: updateDto.avatar || '',
          gender: updateDto.gender || '',
          marital: updateDto.marital || '',
          birthday: updateDto.birthday
            ? new Date(updateDto.birthday).toISOString()
            : new Date().toISOString(),
          position_id: updateDto.position_id || 1,
          address: updateDto.address || '',
          temp_address: updateDto.temp_address || '',
          phone: updateDto.phone || '',
          tax_code: updateDto.tax_code || '',
          role_id: updateDto.role_id || 1,
          description: updateDto.description || '',
          level_id: updateDto.level_id || 1,
          note: updateDto.note || '',
          overview: updateDto.overview || '',
          expertise: updateDto.expertise || '',
          technique: updateDto.technique || '',
          main_task: updateDto.main_task || '',
          language_id: updateDto.language_id || 1,
        },
        include: {
          position: true,
          role: true,
          level: true,
          language: true,
        },
      });
    }
  }

  // Quản lý học vấn
  async createEducation(createDto: CreateEducationDto) {
    return await this.prisma.education.create({
      data: {
        ...createDto,
        start_date: new Date(createDto.start_date),
        end_date: new Date(createDto.end_date),
      },
    });
  }

  async getEducations(userId: number) {
    return await this.prisma.education.findMany({
      where: {
        user_id: userId,
        ...{ deleted_at: null },
      },
      orderBy: { start_date: 'desc' },
    });
  }

  async getEducationsPaginated(
    userId: number,
    paginationDto: EducationPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.educationWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo tên trường
    if (paginationDto.name) {
      where.name = {
        contains: paginationDto.name,
      };
    }

    // Thêm filter theo bằng cấp
    if (paginationDto.major) {
      where.major = {
        contains: paginationDto.major,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.education.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { start_date: 'desc' },
      }),
      this.prisma.education.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async updateEducation(educationId: number, updateDto: UpdateEducationDto) {
    const education = await this.prisma.education.findFirst({
      where: {
        id: educationId,
        ...{ deleted_at: null },
        user_id: updateDto.user_id,
      },
    });

    if (!education) {
      throw new NotFoundException('Không tìm thấy thông tin học vấn');
    }

    const user = await this.prisma.users.findFirst({
      where: { id: updateDto.user_id, ...{ deleted_at: null } },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return await this.prisma.education.update({
      where: { id: educationId },
      data: {
        ...updateDto,
        start_date: updateDto.start_date
          ? new Date(updateDto.start_date).toISOString()
          : undefined,
        end_date: updateDto.end_date
          ? new Date(updateDto.end_date).toISOString()
          : undefined,
      },
    });
  }

  async deleteEducation(educationId: number, userId: number) {
    const education = await this.prisma.education.findFirst({
      where: { id: educationId, user_id: userId, deleted_at: null },
    });

    if (!education) {
      throw new NotFoundException('Không tìm thấy thông tin học vấn');
    }

    await this.prisma.education.update({
      where: { id: educationId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Xóa thông tin học vấn thành công' };
  }

  // Quản lý kinh nghiệm
  async createExperience(createDto: CreateExperienceDto) {
    return await this.prisma.experience.create({
      data: {
        ...createDto,
        start_date: new Date(createDto.start_date),
        end_date: new Date(createDto.end_date),
      },
    });
  }

  async getExperiences(userId: number) {
    return await this.prisma.experience.findMany({
      where: {
        user_id: userId,
        ...{ deleted_at: null },
      },
      orderBy: { start_date: 'desc' },
    });
  }

  async updateExperience(experienceId: number, updateDto: UpdateExperienceDto) {
    const experience = await this.prisma.experience.findFirst({
      where: {
        id: experienceId,
        ...{ deleted_at: null },
        user_id: updateDto.user_id,
      },
    });

    if (!experience) {
      throw new NotFoundException('Không tìm thấy thông tin kinh nghiệm');
    }

    return await this.prisma.experience.update({
      where: { id: experienceId },
      data: {
        ...updateDto,
        start_date: updateDto.start_date
          ? new Date(updateDto.start_date).toISOString()
          : undefined,
        end_date: updateDto.end_date
          ? new Date(updateDto.end_date).toISOString()
          : undefined,
      },
    });
  }

  async deleteExperience(experienceId: number, userId: number) {
    const experience = await this.prisma.experience.findFirst({
      where: { id: experienceId, user_id: userId, deleted_at: null },
    });

    if (!experience) {
      throw new NotFoundException('Không tìm thấy thông tin kinh nghiệm');
    }

    await this.prisma.experience.update({
      where: { id: experienceId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Xóa thông tin kinh nghiệm thành công' };
  }

  // Quản lý chứng chỉ
  async createUserCertificate(createDto: CreateUserCertificateDto) {
    return await this.prisma.user_certificates.create({
      data: {
        ...createDto,
        issued_at: new Date(createDto.issued_at),
        start_date: new Date(createDto.start_date),
        certificate_id: createDto.certificate_id,
        type: createDto.type,
      },
    });
  }

  async getUserCertificates(userId: number) {
    return await this.prisma.user_certificates.findMany({
      where: {
        user_id: userId,
        ...{ deleted_at: null },
      },
      orderBy: { issued_at: 'desc' },
    });
  }

  async updateUserCertificate(
    certificateId: number,
    updateDto: UpdateUserCertificateDto,
  ) {
    const certificate = await this.prisma.user_certificates.findFirst({
      where: {
        id: certificateId,
        ...{ deleted_at: null },
        user_id: updateDto.user_id,
      },
    });

    if (!certificate) {
      throw new NotFoundException('Không tìm thấy thông tin chứng chỉ');
    }

    if (certificate.user_id !== updateDto.user_id) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật thông tin chứng chỉ',
      );
    }

    return await this.prisma.user_certificates.update({
      where: { id: certificateId },
      data: {
        ...updateDto,
        certificate_id: updateDto.certificate_id,
        type: updateDto.type,
        start_date: updateDto.start_date
          ? new Date(updateDto.start_date).toISOString()
          : undefined,
        issued_at: updateDto.issued_at
          ? new Date(updateDto.issued_at).toISOString()
          : undefined,
      },
    });
  }

  async deleteUserCertificate(certificateId: number, userId: number) {
    const certificate = await this.prisma.user_certificates.findFirst({
      where: { id: certificateId, deleted_at: null },
    });

    if (!certificate) {
      throw new NotFoundException('Không tìm thấy thông tin chứng chỉ');
    }

    if (certificate.user_id !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thông tin chứng chỉ',
      );
    }

    await this.prisma.user_certificates.update({
      where: { id: certificateId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Xóa thông tin chứng chỉ thành công' };
  }

  // Quản lý kỹ năng
  async createUserSkill(createDto: CreateUserSkillDto) {
    const skill = await this.prisma.skills.findFirst({
      where: { id: createDto.skill_id, deleted_at: null },
    });

    if (!skill) {
      throw new NotFoundException('Không tìm thấy thông tin kỹ năng');
    }

    const user = await this.prisma.users.findFirst({
      where: { id: createDto.user_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return await this.prisma.user_skills.create({
      data: {
        ...createDto,
        user_id: createDto.user_id,
        skill_id: createDto.skill_id,
      },
      include: {
        skill: {
          include: {
            position: true,
          },
        },
      },
    });
  }

  async getUserSkills(userId: number) {
    return await this.prisma.user_skills.findMany({
      where: {
        user_id: userId,
        ...{ deleted_at: null },
      },
      include: {
        skill: {
          include: {
            position: true,
          },
        },
      },
      orderBy: { is_main: 'desc' },
    });
  }

  async updateUserSkill(userSkillId: number, updateDto: UpdateUserSkillDto) {
    const userSkill = await this.prisma.user_skills.findFirst({
      where: { id: userSkillId, deleted_at: null },
    });

    if (!userSkill) {
      throw new NotFoundException('Không tìm thấy thông tin kỹ năng');
    }

    if (userSkill.user_id !== updateDto.user_id) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật thông tin kỹ năng',
      );
    }

    const skill = await this.prisma.skills.findFirst({
      where: { id: updateDto.skill_id, deleted_at: null },
    });

    if (!skill) {
      throw new NotFoundException('Không tìm thấy thông tin kỹ năng');
    }

    return await this.prisma.user_skills.update({
      where: { id: userSkillId },
      data: {
        ...updateDto,
        experience: updateDto.experience || 0,
        months_experience: updateDto.months_experience || 0,
      },
      include: {
        skill: {
          include: {
            position: true,
          },
        },
      },
    });
  }

  async deleteUserSkill(userSkillId: number, userId: number) {
    const userSkill = await this.prisma.user_skills.findFirst({
      where: { id: userSkillId, deleted_at: null },
    });

    if (!userSkill) {
      throw new NotFoundException('Không tìm thấy thông tin kỹ năng');
    }

    if (userSkill.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa thông tin kỹ năng');
    }

    await this.prisma.user_skills.update({
      where: { id: userSkillId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Xóa thông tin kỹ năng thành công' };
  }

  // Lấy danh sách kỹ năng theo vị trí
  async getSkillsByPosition(positionId: number) {
    return await this.prisma.skills.findMany({
      where: {
        position_id: positionId,
        ...{ deleted_at: null },
      },
      include: {
        position: true,
      },
    });
  }

  // Lấy danh sách các tham chiếu (positions, offices, roles, levels, languages)
  async getPositions() {
    return await this.prisma.positions.findMany({
      where: { deleted_at: null },
    });
  }

  async getRoles() {
    return await this.prisma.roles.findMany({
      where: { deleted_at: null },
    });
  }

  async getLevels() {
    return await this.prisma.levels.findMany({
      where: { deleted_at: null },
    });
  }

  async getLanguages() {
    return await this.prisma.languages.findMany({
      where: { deleted_at: null },
    });
  }

  // Cập nhật avatar URL
  async updateAvatar(userId: number, avatarUrl: string) {
    // Kiểm tra user có tồn tại không
    const user = await this.prisma.users.findFirst({
      where: { id: userId, ...{ deleted_at: null } },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Lưu thông tin avatar vào database
    const userInfo = await this.prisma.user_information.findFirst({
      where: { user_id: userId, ...{ deleted_at: null } },
    });

    if (userInfo) {
      const updatedInfo = await this.prisma.user_information.update({
        where: { id: userInfo.id },
        data: { avatar: avatarUrl },
        include: {
          position: true,
          role: true,
          level: true,
          language: true,
        },
      });
      return {
        message: 'Cập nhật avatar thành công',
        avatar_url: avatarUrl,
        user_information: updatedInfo,
      };
    } else {
      // Tạo mới user_information nếu chưa có
      const newInfo = await this.prisma.user_information.create({
        data: {
          user_id: userId,
          avatar: avatarUrl,
          // Các field required khác sẽ cần được set default
          email: user.email || '',
          personal_email: '',
          nationality: '',
          name: user.name || '',
          code: '',
          gender: '',
          marital: '',
          birthday: new Date(),
          position_id: 1, // Default position
          address: '',
          temp_address: '',
          phone: '',
          tax_code: '',
          role_id: 1, // Default role
          status: 'ACTIVE',
          description: '',
          level_id: 1, // Default level
          note: '',
          overview: '',
          expertise: '',
          technique: '',
          main_task: '',
          language_id: 1, // Default language
        },
        include: {
          position: true,
          role: true,
          level: true,
          language: true,
        },
      });

      return {
        message: 'Cập nhật avatar thành công',
        avatar_url: avatarUrl,
        user_information: newInfo,
      };
    }
  }

  // === PAGINATION METHODS ===

  async getExperiencesPaginated(
    userId: number,
    paginationDto: ExperiencePaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.experienceWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo tên công ty
    if (paginationDto.company_name) {
      where.company = {
        contains: paginationDto.company_name,
      };
    }

    // Thêm filter theo vị trí
    if (paginationDto.position) {
      where.job_title = {
        contains: paginationDto.position,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.experience.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { start_date: 'desc' },
      }),
      this.prisma.experience.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getUserCertificatesPaginated(
    userId: number,
    paginationDto: CertificatePaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.user_certificatesWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo certificate_id
    if (paginationDto.certificate_id) {
      where.certificate_id = {
        equals: paginationDto.certificate_id,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.user_certificates.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          certificate: true,
        },
      }),
      this.prisma.user_certificates.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getUserSkillsPaginated(
    userId: number,
    paginationDto: UserSkillPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.user_skillsWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo skill_id
    if (paginationDto.skill_id) {
      where.skill_id = {
        equals: paginationDto.skill_id,
      };
    }

    // Thêm filter theo level range
    if (paginationDto.min_level) {
      where.experience = {
        gte: paginationDto.min_level,
      };
    }
    if (paginationDto.max_level) {
      where.experience = {
        lte: paginationDto.max_level,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.user_skills.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          skill: true,
        },
      }),
      this.prisma.user_skills.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getPositionsPaginated(paginationDto: ReferencePaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.positionsWhereInput = { deleted_at: null };

    // Thêm filter theo search
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.positions.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
      }),
      this.prisma.positions.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getRolesPaginated(paginationDto: ReferencePaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.rolesWhereInput = { deleted_at: null };

    // Thêm filter theo search
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.roles.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
      }),
      this.prisma.roles.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getLevelsPaginated(paginationDto: ReferencePaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.levelsWhereInput = { deleted_at: null };

    // Thêm filter theo search
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.levels.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
      }),
      this.prisma.levels.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getLanguagesPaginated(paginationDto: ReferencePaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.languagesWhereInput = { deleted_at: null };

    // Thêm filter theo search
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.languages.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
      }),
      this.prisma.languages.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }
}
