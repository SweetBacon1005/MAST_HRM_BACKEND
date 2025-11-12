import {
  BadRequestException,
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
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';

// CRUD DTOs
import { CreateLanguageDto } from './languages/dto/create-language.dto';
import { LanguagePaginationDto } from './languages/dto/language-pagination.dto';
import { UpdateLanguageDto } from './languages/dto/update-language.dto';
import { CreateLevelDto } from './levels/dto/create-level.dto';
import { LevelPaginationDto } from './levels/dto/level-pagination.dto';
import { UpdateLevelDto } from './levels/dto/update-level.dto';
import { CreatePositionDto } from './positions/dto/create-position.dto';
import { PositionPaginationDto } from './positions/dto/position-pagination.dto';
import { UpdatePositionDto } from './positions/dto/update-position.dto';
import { CreateSkillDto } from './skills/dto/create-skill.dto';
import { SkillPaginationDto } from './skills/dto/skill-pagination.dto';
import { UpdateSkillDto } from './skills/dto/update-skill.dto';

@Injectable()
export class UserProfileService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: number) {
    const userProfile = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      include: {
        user_information: true,
        user_division: {
          where: { division: { deleted_at: null } },
          select: {
            division: true,
            team: true,
          },
        },
        education: {
          where: { deleted_at: null },
        },
        experience: {
          where: { deleted_at: null },
        },
        user_skills: {
          where: { deleted_at: null },
          include: {
            skill: true,
          },
        },
      },
    });

    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    return userProfile;
  }

  async updateUserInformation(
    userId: number,
    updateDto: UpdateUserInformationDto,
  ) {
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

    const { position_id, level_id, language_id, ...rest } = updateDto;

    const existingInfo = await this.prisma.user_information.findFirst({
      where: { user_id: userId, ...{ deleted_at: null } },
    });

    if (existingInfo) {
      return await this.prisma.user_information.update({
        where: { id: existingInfo.id },
        data: {
          personal_email: updateDto.personal_email || '',
          marital: updateDto.marital || '',
          nationality: updateDto.nationality || '',
          name: updateDto.name || '',
          gender: updateDto.gender || '',
          status: 'ACTIVE',
          birthday: updateDto.birthday
            ? new Date(updateDto.birthday).toISOString()
            : new Date().toISOString(),
          address: updateDto.address || '',
          temp_address: updateDto.temp_address || '',
          phone: updateDto.phone || '',
          tax_code: updateDto.tax_code || '',
          expertise: updateDto.expertise || '',
          position: { connect: { id: position.id } },
          level: { connect: { id: level.id } },
          language: { connect: { id: language.id } },
        },
        include: {
          position: true,
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
          personal_email: updateDto.personal_email || '',
          nationality: updateDto.nationality || '',
          name: updateDto.name || '',
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
          level_id: updateDto.level_id || 1,
          expertise: updateDto.expertise || '',
          language_id: updateDto.language_id || 1,
        },
        include: {
          position: true,
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

    if (paginationDto.name) {
      where.name = {
        contains: paginationDto.name,
      };
    }

    if (paginationDto.major) {
      where.major = {
        contains: paginationDto.major,
      };
    }

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

  async getPositions() {
    return await this.prisma.positions.findMany({
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

  async updateAvatar(userId: number, avatarUrl: string) {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, ...{ deleted_at: null } },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const userInfo = await this.prisma.user_information.findFirst({
      where: { user_id: userId, ...{ deleted_at: null } },
    });

    if (userInfo) {
      const updatedInfo = await this.prisma.user_information.update({
        where: { id: userInfo.id },
        data: { avatar: avatarUrl },
        include: {
          position: true,
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
      const newInfo = await this.prisma.user_information.create({
        data: {
          user_id: userId,
          avatar: avatarUrl,
        },
        include: {
          position: true,
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
    return buildPaginationResponse(
      [],
      0,
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

    if (paginationDto.skill_id) {
      where.skill_id = {
        equals: paginationDto.skill_id,
      };
    }

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

    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

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

  // ===== LEVELS CRUD METHODS =====
  async createLevel(createLevelDto: CreateLevelDto) {
    // Kiểm tra tên level đã tồn tại
    const existingLevel = await this.prisma.levels.findFirst({
      where: {
        name: createLevelDto.name,
        deleted_at: null,
      },
    });

    if (existingLevel) {
      throw new BadRequestException('Tên level đã tồn tại');
    }

    // Kiểm tra coefficient đã tồn tại
    const existingCoefficient = await this.prisma.levels.findFirst({
      where: {
        coefficient: createLevelDto.level, // Sử dụng level từ DTO làm coefficient
        deleted_at: null,
      },
    });

    if (existingCoefficient) {
      throw new BadRequestException('Hệ số này đã tồn tại');
    }

    const level = await this.prisma.levels.create({
      data: {
        name: createLevelDto.name,
        coefficient: createLevelDto.level, // Sử dụng level từ DTO làm coefficient
      },
    });

    return {
      message: 'Tạo level thành công',
      data: level,
    };
  }

  async findAllLevels(paginationDto: LevelPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: any = {
      deleted_at: null,
    };

    if (paginationDto.search) {
      whereConditions.name = {
        contains: paginationDto.search,
      };
    }

    if (paginationDto.level) {
      whereConditions.coefficient = paginationDto.level;
    }

    const [levels, total] = await Promise.all([
      this.prisma.levels.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: orderBy || { coefficient: 'asc' },
        include: {
          _count: {
            select: {
              user_information: true,
            },
          },
        },
      }),
      this.prisma.levels.count({ where: whereConditions }),
    ]);

    return buildPaginationResponse(
      levels,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneLevel(id: number) {
    const level = await this.prisma.levels.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        _count: {
          select: {
            user_information: true,
          },
        },
      },
    });

    if (!level) {
      throw new NotFoundException('Không tìm thấy level');
    }

    return {
      data: level,
    };
  }

  async updateLevel(id: number, updateLevelDto: UpdateLevelDto) {
    const existingLevel = await this.prisma.levels.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!existingLevel) {
      throw new NotFoundException('Không tìm thấy level');
    }

    // Kiểm tra tên level đã tồn tại (nếu có thay đổi tên)
    if (updateLevelDto.name && updateLevelDto.name !== existingLevel.name) {
      const duplicateLevel = await this.prisma.levels.findFirst({
        where: {
          name: updateLevelDto.name,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (duplicateLevel) {
        throw new BadRequestException('Tên level đã tồn tại');
      }
    }

    // Kiểm tra coefficient đã tồn tại (nếu có thay đổi coefficient)
    if (
      updateLevelDto.level &&
      updateLevelDto.level !== existingLevel.coefficient
    ) {
      const duplicateCoefficient = await this.prisma.levels.findFirst({
        where: {
          coefficient: updateLevelDto.level,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (duplicateCoefficient) {
        throw new BadRequestException('Hệ số này đã tồn tại');
      }
    }

    const updatedLevel = await this.prisma.levels.update({
      where: { id },
      data: {
        ...updateLevelDto,
        updated_at: new Date(),
      },
    });

    return {
      message: 'Cập nhật level thành công',
      data: updatedLevel,
    };
  }

  async removeLevel(id: number) {
    const existingLevel = await this.prisma.levels.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        _count: {
          select: {
            user_information: true,
          },
        },
      },
    });

    if (!existingLevel) {
      throw new NotFoundException('Không tìm thấy level');
    }

    // Kiểm tra xem có user nào đang sử dụng level này không
    if (existingLevel._count.user_information > 0) {
      throw new BadRequestException(
        `Không thể xóa level này vì có ${existingLevel._count.user_information} user đang sử dụng`,
      );
    }

    await this.prisma.levels.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    return {
      message: 'Xóa level thành công',
    };
  }

  // ===== POSITIONS CRUD METHODS =====
  async createPosition(createPositionDto: CreatePositionDto) {
    // Kiểm tra tên position đã tồn tại
    const existingPosition = await this.prisma.positions.findFirst({
      where: {
        name: createPositionDto.name,
        deleted_at: null,
      },
    });

    if (existingPosition) {
      throw new BadRequestException('Tên vị trí đã tồn tại');
    }

    const position = await this.prisma.positions.create({
      data: {
        name: createPositionDto.name,
      },
    });

    return {
      message: 'Tạo vị trí thành công',
      data: position,
    };
  }

  async findAllPositions(paginationDto: PositionPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: Prisma.positionsWhereInput = {
      deleted_at: null,
    };

    if (paginationDto.search) {
      whereConditions.name = {
        contains: paginationDto.search,
      };
    }

    // Xóa filter theo level_id vì field này không tồn tại

    const [positions, total] = await Promise.all([
      this.prisma.positions.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          _count: {
            select: {
              user_information: true,
              skills: true,
            },
          },
        },
      }),
      this.prisma.positions.count({ where: whereConditions }),
    ]);

    return buildPaginationResponse(
      positions,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOnePosition(id: number) {
    const position = await this.prisma.positions.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        skills: {
          where: { deleted_at: null },
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            user_information: true,
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundException('Không tìm thấy vị trí');
    }

    return {
      data: position,
    };
  }

  async updatePosition(id: number, updatePositionDto: UpdatePositionDto) {
    const existingPosition = await this.prisma.positions.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!existingPosition) {
      throw new NotFoundException('Không tìm thấy vị trí');
    }

    // Kiểm tra tên position đã tồn tại (nếu có thay đổi tên)
    if (
      updatePositionDto.name &&
      updatePositionDto.name !== existingPosition.name
    ) {
      const duplicatePosition = await this.prisma.positions.findFirst({
        where: {
          name: updatePositionDto.name,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (duplicatePosition) {
        throw new BadRequestException('Tên vị trí đã tồn tại');
      }
    }

    const updatedPosition = await this.prisma.positions.update({
      where: { id },
      data: {
        name: updatePositionDto.name,
        updated_at: new Date(),
      },
    });

    return {
      message: 'Cập nhật vị trí thành công',
      data: updatedPosition,
    };
  }

  async removePosition(id: number) {
    const existingPosition = await this.prisma.positions.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        _count: {
          select: {
            user_information: true,
          },
        },
      },
    });

    if (!existingPosition) {
      throw new NotFoundException('Không tìm thấy vị trí');
    }

    // Kiểm tra xem có user nào đang sử dụng position này không
    if (existingPosition._count.user_information > 0) {
      throw new BadRequestException(
        `Không thể xóa vị trí này vì có ${existingPosition._count.user_information} user đang sử dụng`,
      );
    }

    await this.prisma.positions.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    return {
      message: 'Xóa vị trí thành công',
    };
  }

  // ===== LANGUAGES CRUD METHODS =====
  async createLanguage(createLanguageDto: CreateLanguageDto) {
    // Kiểm tra tên ngôn ngữ đã tồn tại
    const existingLanguage = await this.prisma.languages.findFirst({
      where: {
        name: createLanguageDto.name,
        deleted_at: null,
      },
    });

    if (existingLanguage) {
      throw new BadRequestException('Tên ngôn ngữ đã tồn tại');
    }

    const language = await this.prisma.languages.create({
      data: {
        name: createLanguageDto.name,
      },
    });

    return {
      message: 'Tạo ngôn ngữ thành công',
      data: language,
    };
  }

  async findAllLanguages(paginationDto: LanguagePaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: Prisma.languagesWhereInput = {
      deleted_at: null,
    };

    if (paginationDto.search) {
      whereConditions.name = {
        contains: paginationDto.search,
      };
    }

    const [languages, total] = await Promise.all([
      this.prisma.languages.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
        include: {
          _count: {
            select: {
              user_information: true,
            },
          },
        },
      }),
      this.prisma.languages.count({ where: whereConditions }),
    ]);

    return buildPaginationResponse(
      languages,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneLanguage(id: number) {
    const language = await this.prisma.languages.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        _count: {
          select: {
            user_information: true,
          },
        },
      },
    });

    if (!language) {
      throw new NotFoundException('Không tìm thấy ngôn ngữ');
    }

    return {
      data: language,
    };
  }

  async updateLanguage(id: number, updateLanguageDto: UpdateLanguageDto) {
    const existingLanguage = await this.prisma.languages.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!existingLanguage) {
      throw new NotFoundException('Không tìm thấy ngôn ngữ');
    }

    // Kiểm tra tên ngôn ngữ đã tồn tại (nếu có thay đổi)
    if (
      updateLanguageDto.name &&
      updateLanguageDto.name !== existingLanguage.name
    ) {
      const duplicateLanguage = await this.prisma.languages.findFirst({
        where: {
          name: updateLanguageDto.name,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (duplicateLanguage) {
        throw new BadRequestException('Tên ngôn ngữ đã tồn tại');
      }
    }

    const updatedLanguage = await this.prisma.languages.update({
      where: { id },
      data: {
        name: updateLanguageDto.name,
        updated_at: new Date(),
      },
    });

    return {
      message: 'Cập nhật ngôn ngữ thành công',
      data: updatedLanguage,
    };
  }

  async removeLanguage(id: number) {
    const existingLanguage = await this.prisma.languages.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        _count: {
          select: {
            user_information: true,
          },
        },
      },
    });

    if (!existingLanguage) {
      throw new NotFoundException('Không tìm thấy ngôn ngữ');
    }

    // Kiểm tra xem có user nào đang sử dụng ngôn ngữ này không
    if (existingLanguage._count.user_information > 0) {
      throw new BadRequestException(
        `Không thể xóa ngôn ngữ này vì có ${existingLanguage._count.user_information} user đang sử dụng`,
      );
    }

    await this.prisma.languages.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    return {
      message: 'Xóa ngôn ngữ thành công',
    };
  }

  // ===== SKILLS CRUD =====
  async createSkill(createSkillDto: CreateSkillDto) {
    // Kiểm tra position có tồn tại không
    const existingPosition = await this.prisma.positions.findFirst({
      where: {
        id: createSkillDto.position_id,
        deleted_at: null,
      },
    });

    if (!existingPosition) {
      throw new BadRequestException('Vị trí không tồn tại');
    }

    // Kiểm tra tên skill đã tồn tại chưa trong cùng position
    const existingSkill = await this.prisma.skills.findFirst({
      where: {
        name: createSkillDto.name,
        position_id: createSkillDto.position_id,
        deleted_at: null,
      },
    });

    if (existingSkill) {
      throw new BadRequestException('Tên kỹ năng đã tồn tại trong vị trí này');
    }

    const skill = await this.prisma.skills.create({
      data: createSkillDto,
      include: {
        position: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: 'Tạo kỹ năng thành công',
      data: skill,
    };
  }

  async findAllSkills(paginationDto: SkillPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: Prisma.skillsWhereInput = {
      deleted_at: null,
    };

    if (paginationDto.search) {
      whereConditions.name = {
        contains: paginationDto.search,
      };
    }

    const [skills, total] = await Promise.all([
      this.prisma.skills.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
        include: {
          position: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              user_skills: true,
            },
          },
        },
      }),
      this.prisma.skills.count({ where: whereConditions }),
    ]);

    return buildPaginationResponse(
      skills,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneSkill(id: number) {
    const skill = await this.prisma.skills.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        position: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            user_skills: true,
          },
        },
      },
    });

    if (!skill) {
      throw new NotFoundException('Không tìm thấy kỹ năng');
    }

    return {
      data: skill,
    };
  }

  async updateSkill(id: number, updateSkillDto: UpdateSkillDto) {
    const existingSkill = await this.prisma.skills.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!existingSkill) {
      throw new NotFoundException('Không tìm thấy kỹ năng');
    }

    if (
      updateSkillDto.position_id &&
      updateSkillDto.position_id !== existingSkill.position_id
    ) {
      const existingPosition = await this.prisma.positions.findFirst({
        where: {
          id: updateSkillDto.position_id,
          deleted_at: null,
        },
      });

      if (!existingPosition) {
        throw new BadRequestException('Vị trí không tồn tại');
      }
    }

    if (updateSkillDto.name || updateSkillDto.position_id) {
      const checkName = updateSkillDto.name || existingSkill.name;
      const checkPositionId =
        updateSkillDto.position_id || existingSkill.position_id;

      const duplicateSkill = await this.prisma.skills.findFirst({
        where: {
          name: checkName,
          position_id: checkPositionId,
          deleted_at: null,
          NOT: { id },
        },
      });

      if (duplicateSkill) {
        throw new BadRequestException(
          'Tên kỹ năng đã tồn tại trong vị trí này',
        );
      }
    }

    const skill = await this.prisma.skills.update({
      where: { id },
      data: updateSkillDto,
      include: {
        position: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: 'Cập nhật kỹ năng thành công',
      data: skill,
    };
  }

  async removeSkill(id: number) {
    const existingSkill = await this.prisma.skills.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        _count: {
          select: {
            user_skills: true,
          },
        },
      },
    });

    if (!existingSkill) {
      throw new NotFoundException('Không tìm thấy kỹ năng');
    }

    if (existingSkill._count.user_skills > 0) {
      throw new BadRequestException(
        `Không thể xóa kỹ năng này vì có ${existingSkill._count.user_skills} user đang sử dụng`,
      );
    }

    await this.prisma.skills.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    return {
      message: 'Xóa kỹ năng thành công',
    };
  }
}
