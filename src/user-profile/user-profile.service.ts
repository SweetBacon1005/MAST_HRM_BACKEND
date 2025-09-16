import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { CreateUserCertificateDto } from './dto/create-user-certificate.dto';
import { UpdateUserCertificateDto } from './dto/update-user-certificate.dto';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import {
  ChildrenPaginationDto,
  EducationPaginationDto,
  ExperiencePaginationDto,
  CertificatePaginationDto,
  UserSkillPaginationDto,
  ReferencePaginationDto,
} from './dto/pagination-queries.dto';

@Injectable()
export class UserProfileService {
  constructor(private prisma: PrismaService) {}

  // Xem thông tin cá nhân
  async getUserProfile(userId: number) {
    const userProfile = await this.prisma.users.findFirst({
      where: {
        id: userId,
        deleted_at: undefined,
      },
      include: {
        user_information: {
          include: {
            position: true,
            office: true,
            role: true,
            level: true,
            language: true,
          },
        },
        children: {
          where: { deleted_at: null },
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
    console.log('userId', userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Kiểm tra xem user_information đã tồn tại chưa
    const existingInfo = await this.prisma.user_information.findFirst({
      where: { user_id: userId, deleted_at: undefined },
    });

    if (existingInfo) {
      // Cập nhật thông tin hiện có
      return await this.prisma.user_information.update({
        where: { id: existingInfo.id },
        data: {
          ...updateDto,
          birthday: updateDto.birthday
            ? new Date(updateDto.birthday).toISOString()
            : new Date().toISOString(),
        },
        include: {
          position: true,
          office: true,
          role: true,
          level: true,
          language: true,
        },
      });
    } else {
      // Tạo mới thông tin
      return await this.prisma.user_information.create({
        data: {
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
          office_id: updateDto.office_id || 1,
          address: updateDto.address || '',
          temp_address: updateDto.temp_address || '',
          phone: updateDto.phone || '',
          tax_code: updateDto.tax_code || '',
          role_id: updateDto.role_id || 1,
          status: updateDto.status || 'active',
          description: updateDto.description || '',
          level_id: updateDto.level_id || 1,
          social_insurance_code: updateDto.social_insurance_code || '',
          provider_id: updateDto.provider_id || '',
          note: updateDto.note || '',
          overview: updateDto.overview || '',
          market_type: updateDto.market_type || '',
          expertise: updateDto.expertise || '',
          technique: updateDto.technique || '',
          main_task: updateDto.main_task || '',
          language_id: updateDto.language_id || 1,
        },
        include: {
          position: true,
          office: true,
          role: true,
          level: true,
          language: true,
        },
      });
    }
  }

  // Quản lý con cái
  async createChild(createDto: CreateChildDto) {
    return await this.prisma.children.create({
      data: {
        ...createDto,
        birthday: new Date(createDto.birthday),
        dependent_start_date: new Date(createDto.dependent_start_date),
      },
    });
  }

  async getChildren(userId: number) {
    return await this.prisma.children.findMany({
      where: {
        user_id: userId,
        deleted_at: undefined,
      },
    });
  }

  async getChildrenPaginated(
    userId: number,
    paginationDto: ChildrenPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo tên con
    if (paginationDto.name) {
      where.name = {
        contains: paginationDto.name,
        mode: 'insensitive',
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.children.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
      }),
      this.prisma.children.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async updateChild(childId: number, updateDto: UpdateChildDto) {
    const child = await this.prisma.children.findFirst({
      where: { id: childId, deleted_at: undefined },
    });

    if (!child) {
      throw new NotFoundException('Không tìm thấy thông tin con');
    }

    const user = await this.prisma.users.findFirst({
      where: { id: child.user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return await this.prisma.children.update({
      where: { id: childId },
      data: {
        ...updateDto,
        birthday: updateDto.birthday
          ? new Date(updateDto.birthday).toISOString()
          : undefined,
        dependent_start_date: updateDto.dependent_start_date
          ? new Date(updateDto.dependent_start_date).toISOString()
          : undefined,
      },
    });
  }

  async deleteChild(childId: number) {
    const child = await this.prisma.children.findFirst({
      where: { id: childId, deleted_at: undefined },
    });

    if (!child) {
      throw new NotFoundException('Không tìm thấy thông tin con');
    }

    await this.prisma.children.update({
      where: { id: childId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Xóa thông tin con thành công' };
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
        deleted_at: undefined,
      },
      orderBy: { start_date: 'desc' },
    });
  }

  async getEducationsPaginated(
    userId: number,
    paginationDto: EducationPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo tên trường
    if (paginationDto.school_name) {
      where.school_name = {
        contains: paginationDto.school_name,
        mode: 'insensitive',
      };
    }

    // Thêm filter theo bằng cấp
    if (paginationDto.degree) {
      where.degree = {
        contains: paginationDto.degree,
        mode: 'insensitive',
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
      where: { id: educationId, deleted_at: undefined },
    });

    if (!education) {
      throw new NotFoundException('Không tìm thấy thông tin học vấn');
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

  async deleteEducation(educationId: number) {
    const education = await this.prisma.education.findFirst({
      where: { id: educationId, deleted_at: undefined },
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
        deleted_at: undefined,
      },
      orderBy: { start_date: 'desc' },
    });
  }

  async updateExperience(experienceId: number, updateDto: UpdateExperienceDto) {
    const experience = await this.prisma.experience.findFirst({
      where: { id: experienceId, deleted_at: undefined },
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

  async deleteExperience(experienceId: number) {
    const experience = await this.prisma.experience.findFirst({
      where: { id: experienceId, deleted_at: undefined },
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
        deleted_at: undefined,
      },
      orderBy: { issued_at: 'desc' },
    });
  }

  async updateUserCertificate(
    certificateId: number,
    updateDto: UpdateUserCertificateDto,
  ) {
    const certificate = await this.prisma.user_certificates.findFirst({
      where: { id: certificateId, deleted_at: undefined },
    });

    if (!certificate) {
      throw new NotFoundException('Không tìm thấy thông tin chứng chỉ');
    }

    return await this.prisma.user_certificates.update({
      where: { id: certificateId },
      data: {
        ...updateDto,
        issued_at: updateDto.issued_at
          ? new Date(updateDto.issued_at).toISOString()
          : undefined,
      },
    });
  }

  async deleteUserCertificate(certificateId: number) {
    const certificate = await this.prisma.user_certificates.findFirst({
      where: { id: certificateId, deleted_at: undefined },
    });

    if (!certificate) {
      throw new NotFoundException('Không tìm thấy thông tin chứng chỉ');
    }

    await this.prisma.user_certificates.update({
      where: { id: certificateId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Xóa thông tin chứng chỉ thành công' };
  }

  // Quản lý kỹ năng
  async createUserSkill(createDto: CreateUserSkillDto) {
    return await this.prisma.user_skills.create({
      data: createDto,
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
        deleted_at: undefined,
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
      where: { id: userSkillId, deleted_at: undefined },
    });

    if (!userSkill) {
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

  async deleteUserSkill(userSkillId: number) {
    const userSkill = await this.prisma.user_skills.findFirst({
      where: { id: userSkillId, deleted_at: undefined },
    });

    if (!userSkill) {
      throw new NotFoundException('Không tìm thấy thông tin kỹ năng');
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
        deleted_at: undefined,
      },
      include: {
        position: true,
      },
    });
  }

  // Lấy danh sách các tham chiếu (positions, offices, roles, levels, languages)
  async getPositions() {
    return await this.prisma.positions.findMany({
      where: { deleted_at: undefined },
    });
  }

  async getOffices() {
    return await this.prisma.offices.findMany({
      where: { deleted_at: undefined },
    });
  }

  async getRoles() {
    return await this.prisma.roles.findMany({
      where: { deleted_at: undefined },
    });
  }

  async getLevels() {
    return await this.prisma.levels.findMany({
      where: { deleted_at: undefined },
    });
  }

  async getLanguages() {
    return await this.prisma.languages.findMany({
      where: { deleted_at: undefined },
    });
  }

  // Cập nhật avatar URL
  async updateAvatar(userId: number, avatarUrl: string) {
    // Kiểm tra user có tồn tại không
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: undefined },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Lưu thông tin avatar vào database
    const userInfo = await this.prisma.user_information.findFirst({
      where: { user_id: userId, deleted_at: undefined },
    });

    if (userInfo) {
      const updatedInfo = await this.prisma.user_information.update({
        where: { id: userInfo.id },
        data: { avatar: avatarUrl },
        include: {
          position: true,
          office: true,
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
          office_id: 1, // Default office
          address: '',
          temp_address: '',
          phone: '',
          tax_code: '',
          role_id: 1, // Default role
          status: 'active',
          description: '',
          level_id: 1, // Default level
          social_insurance_code: '',
          provider_id: '',
          note: '',
          overview: '',
          market_type: '',
          expertise: '',
          technique: '',
          main_task: '',
          language_id: 1, // Default language
        },
        include: {
          position: true,
          office: true,
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
    const where: any = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo tên công ty
    if (paginationDto.company_name) {
      where.company_name = {
        contains: paginationDto.company_name,
        mode: 'insensitive',
      };
    }

    // Thêm filter theo vị trí
    if (paginationDto.position) {
      where.position = {
        contains: paginationDto.position,
        mode: 'insensitive',
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
    const where: any = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo certificate_id
    if (paginationDto.certificate_id) {
      where.certificate_id = paginationDto.certificate_id;
    }

    // Thêm filter theo status
    if (paginationDto.status) {
      where.status = paginationDto.status;
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
    const where: any = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo skill_id
    if (paginationDto.skill_id) {
      where.skill_id = paginationDto.skill_id;
    }

    // Thêm filter theo level range
    if (paginationDto.min_level) {
      where.level = {
        gte: paginationDto.min_level,
      };
    }
    if (paginationDto.max_level) {
      where.level = {
        ...where.level,
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
    const where: any = { deleted_at: null };

    // Thêm filter theo search
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
        mode: 'insensitive',
      };
    }

    // Thêm filter theo status
    if (paginationDto.status) {
      where.status = paginationDto.status;
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

  async getOfficesPaginated(paginationDto: ReferencePaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = { deleted_at: null };

    // Thêm filter theo search
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
        mode: 'insensitive',
      };
    }

    // Thêm filter theo status
    if (paginationDto.status) {
      where.status = paginationDto.status;
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.offices.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
      }),
      this.prisma.offices.count({ where }),
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
    const where: any = { deleted_at: null };

    // Thêm filter theo search
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
        mode: 'insensitive',
      };
    }

    // Thêm filter theo status
    if (paginationDto.status) {
      where.status = paginationDto.status;
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
}
