import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
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
import { UpdateAvatarDto } from './dto/upload-avatar.dto';
import { UserProfileService } from './user-profile.service';

// CRUD DTOs
import { CreateRoleDto } from './roles/dto/create-role.dto';
import { UpdateRoleDto } from './roles/dto/update-role.dto';
import { RolePaginationDto } from './roles/dto/role-pagination.dto';
import { CreateLevelDto } from './levels/dto/create-level.dto';
import { UpdateLevelDto } from './levels/dto/update-level.dto';
import { LevelPaginationDto } from './levels/dto/level-pagination.dto';
import { CreatePositionDto } from './positions/dto/create-position.dto';
import { UpdatePositionDto } from './positions/dto/update-position.dto';
import { PositionPaginationDto } from './positions/dto/position-pagination.dto';
import { CreateLanguageDto } from './languages/dto/create-language.dto';
import { UpdateLanguageDto } from './languages/dto/update-language.dto';
import { LanguagePaginationDto } from './languages/dto/language-pagination.dto';

// CRUD Services - now integrated into UserProfileService

@ApiTags('user-profile')
@Controller('user-profile')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
  ) {}

  // ===== THÔNG TIN CÁ NHÂN =====
  @Get()
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Xem thông tin cá nhân của user hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin cá nhân chi tiết bao gồm phòng ban và team',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        username: { type: 'string' },
        email: { type: 'string' },
        user_information: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            avatar: { type: 'string' },
            position: { type: 'object' },
            role: { type: 'object' },
            level: { type: 'object' },
            language: { type: 'object' },
          },
        },
        user_division: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              division: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  code: { type: 'string' },
                  manager: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      user_information: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string' },
                          avatar: { type: 'string' },
                          position: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        user_team: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              team: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  team_lead: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      user_information: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string' },
                          avatar: { type: 'string' },
                          position: { type: 'object' },
                        },
                      },
                    },
                  },
                  division: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        education: { type: 'array' },
        experience: { type: 'array' },
        user_certificates: { type: 'array' },
        user_skills: { type: 'array' },
      },
    },
  })
  async getUserProfile(@GetCurrentUser('id') userId: number) {
    return await this.userProfileService.getUserProfile(userId);
  }

  @Patch('information')
  @RequirePermission('user.profile.update')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin thành công',
  })
  async updateUserInformation(
    @GetCurrentUser('id') userId: number,
    @Body() updateDto: UpdateUserInformationDto,
  ) {
    return await this.userProfileService.updateUserInformation(
      userId,
      updateDto,
    );
  }

  // ===== QUẢN LÝ HỌC VẤN =====
  @Post('education')
  @RequirePermission('user.profile.update')
  @ApiOperation({ summary: 'Thêm thông tin học vấn' })
  @ApiResponse({
    status: 201,
    description: 'Thêm thông tin học vấn thành công',
  })
  async createEducation(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateEducationDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createEducation(createDto);
  }

  @Get('education')
  @ApiOperation({ summary: 'Lấy danh sách học vấn có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách học vấn có phân trang',
  })
  async getEducations(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: EducationPaginationDto,
  ) {
    return await this.userProfileService.getEducationsPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('education/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin học vấn' })
  @ApiParam({ name: 'id', description: 'ID của học vấn' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateEducation(
    @Param('id', ParseIntPipe) educationId: number,
    @Body() updateDto: UpdateEducationDto,
    @GetCurrentUser('id') userId: number,
  ) {
    updateDto.user_id = userId;
    return await this.userProfileService.updateEducation(
      educationId,
      updateDto,
    );
  }

  @Delete('education/:id')
  @ApiOperation({ summary: 'Xóa thông tin học vấn' })
  @ApiParam({ name: 'id', description: 'ID của học vấn' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteEducation(
    @Param('id', ParseIntPipe) educationId: number,
    @GetCurrentUser('id') userId: number,
  ) {
    return await this.userProfileService.deleteEducation(educationId, userId);
  }

  // ===== QUẢN LÝ KINH NGHIỆM =====
  @Post('experience')
  @ApiOperation({ summary: 'Thêm thông tin kinh nghiệm' })
  @ApiResponse({
    status: 201,
    description: 'Thêm thông tin kinh nghiệm thành công',
  })
  async createExperience(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateExperienceDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createExperience(createDto);
  }

  @Get('experience')
  @ApiOperation({ summary: 'Lấy danh sách kinh nghiệm có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kinh nghiệm có phân trang',
  })
  async getExperiences(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: ExperiencePaginationDto,
  ) {
    return await this.userProfileService.getExperiencesPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('experience/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin kinh nghiệm' })
  @ApiParam({ name: 'id', description: 'ID của kinh nghiệm' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateExperience(
    @Param('id', ParseIntPipe) experienceId: number,
    @Body() updateDto: UpdateExperienceDto,
    @GetCurrentUser('id') userId: number,
  ) {
    updateDto.user_id = userId;
    return await this.userProfileService.updateExperience(
      experienceId,
      updateDto,
    );
  }

  @Delete('experience/:id')
  @ApiOperation({ summary: 'Xóa thông tin kinh nghiệm' })
  @ApiParam({ name: 'id', description: 'ID của kinh nghiệm' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteExperience(
    @Param('id', ParseIntPipe) experienceId: number,
    @GetCurrentUser('id') userId: number,
  ) {
    return await this.userProfileService.deleteExperience(experienceId, userId);
  }

  // ===== QUẢN LÝ CHỨNG CHỈ =====
  @Post('certificates')
  @ApiOperation({ summary: 'Thêm chứng chỉ' })
  @ApiResponse({
    status: 201,
    description: 'Thêm chứng chỉ thành công',
  })
  async createUserCertificate(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateUserCertificateDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createUserCertificate(createDto);
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Lấy danh sách chứng chỉ có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chứng chỉ có phân trang',
  })
  async getUserCertificates(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: CertificatePaginationDto,
  ) {
    return await this.userProfileService.getUserCertificatesPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('certificates/:id')
  @ApiOperation({ summary: 'Cập nhật chứng chỉ' })
  @ApiParam({ name: 'id', description: 'ID của chứng chỉ' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateUserCertificate(
    @Param('id', ParseIntPipe) certificateId: number,
    @Body() updateDto: UpdateUserCertificateDto,
    @GetCurrentUser('id') userId: number,
  ) {
    updateDto.user_id = userId;
    return await this.userProfileService.updateUserCertificate(
      certificateId,
      updateDto,
    );
  }

  @Delete('certificates/:id')
  @ApiOperation({ summary: 'Xóa chứng chỉ' })
  @ApiParam({ name: 'id', description: 'ID của chứng chỉ' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteUserCertificate(
    @Param('id', ParseIntPipe) certificateId: number,
    @GetCurrentUser('id') userId: number,
  ) {
    return await this.userProfileService.deleteUserCertificate(
      certificateId,
      userId,
    );
  }

  // ===== QUẢN LÝ KỸ NĂNG =====
  @Post('skills')
  @ApiOperation({ summary: 'Thêm kỹ năng' })
  @ApiResponse({
    status: 201,
    description: 'Thêm kỹ năng thành công',
  })
  async createUserSkill(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateUserSkillDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createUserSkill(createDto);
  }

  @Get('skills/position/:positionId')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng theo vị trí' })
  @ApiParam({ name: 'positionId', description: 'ID của vị trí' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kỹ năng theo vị trí',
  })
  async getSkillsByPosition(
    @Param('positionId', ParseIntPipe) positionId: number,
  ) {
    return await this.userProfileService.getSkillsByPosition(positionId);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kỹ năng có phân trang',
  })
  async getUserSkills(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: UserSkillPaginationDto,
  ) {
    return await this.userProfileService.getUserSkillsPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('skills/:id')
  @ApiOperation({ summary: 'Cập nhật kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của user skill' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateUserSkill(
    @Param('id', ParseIntPipe) userSkillId: number,
    @Body() updateDto: UpdateUserSkillDto,
    @GetCurrentUser('id') userId: number,
  ) {
    updateDto.user_id = userId;
    return await this.userProfileService.updateUserSkill(
      userSkillId,
      updateDto,
    );
  }

  @Delete('skills/:id')
  @ApiOperation({ summary: 'Xóa kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của user skill' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteUserSkill(
    @Param('id', ParseIntPipe) userSkillId: number,
    @GetCurrentUser('id') userId: number,
  ) {
    return await this.userProfileService.deleteUserSkill(userSkillId, userId);
  }

  // ===== CÁC DANH SÁCH THAM CHIẾU =====
  @Get('references/positions')
  @ApiOperation({ summary: 'Lấy danh sách vị trí có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách vị trí có phân trang',
  })
  async getPositions(@Query() paginationDto: ReferencePaginationDto) {
    return await this.userProfileService.getPositionsPaginated(paginationDto);
  }

  @Get('references/roles')
  @ApiOperation({ summary: 'Lấy danh sách vai trò có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách vai trò có phân trang',
  })
  async getRoles(@Query() paginationDto: ReferencePaginationDto) {
    return await this.userProfileService.getRolesPaginated(paginationDto);
  }

  @Get('references/levels')
  @ApiOperation({ summary: 'Lấy danh sách cấp độ có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách cấp độ có phân trang',
  })
  async getLevels(@Query() paginationDto: ReferencePaginationDto) {
    return await this.userProfileService.getLevelsPaginated(paginationDto);
  }

  @Get('references/languages')
  @ApiOperation({ summary: 'Lấy danh sách ngôn ngữ có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách ngôn ngữ có phân trang',
  })
  async getLanguages(@Query() paginationDto: ReferencePaginationDto) {
    return await this.userProfileService.getLanguagesPaginated(paginationDto);
  }

  // ===== CẬP NHẬT AVATAR =====
  @Patch('avatar')
  @RequirePermission('user.profile.update')
  @ApiOperation({ summary: 'Cập nhật avatar URL từ S3' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật avatar thành công',
  })
  async updateAvatar(
    @GetCurrentUser('id') userId: number,
    @Body() updateAvatarDto: UpdateAvatarDto,
  ) {
    return await this.userProfileService.updateAvatar(
      userId,
      updateAvatarDto.avatar_url,
    );
  }

  // ===== QUẢN LÝ ROLES =====
  @Post('roles')
  @RequirePermission('role.create')
  @ApiOperation({ summary: 'Tạo role mới' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo role thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo role thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'manager' },
            description: { type: 'string', example: 'Quản lý nhóm' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tên role đã tồn tại' })
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.userProfileService.createRole(createRoleDto);
  }

  @Get('roles')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy danh sách roles với phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách roles thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'manager' },
              description: { type: 'string', example: 'Quản lý nhóm' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              _count: {
                type: 'object',
                properties: {
                  user_information: { type: 'number', example: 5 },
                  permission_role: { type: 'number', example: 10 },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllRoles(@Query() paginationDto: RolePaginationDto) {
    return this.userProfileService.findAllRoles(paginationDto);
  }

  @Get('roles/:id')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết role' })
  @ApiParam({ name: 'id', description: 'ID của role' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin role thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'manager' },
            description: { type: 'string', example: 'Quản lý nhóm' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            permission_role: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  permission: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', example: 1 },
                      name: { type: 'string', example: 'user.read' },
                      description: { type: 'string', example: 'Xem thông tin user' },
                    },
                  },
                },
              },
            },
            _count: {
              type: 'object',
              properties: {
                user_information: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
  findOneRole(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.findOneRole(id);
  }

  @Patch('roles/:id')
  @RequirePermission('role.update')
  @ApiOperation({ summary: 'Cập nhật thông tin role' })
  @ApiParam({ name: 'id', description: 'ID của role' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật role thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cập nhật role thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'manager' },
            description: { type: 'string', example: 'Quản lý nhóm' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
  @ApiResponse({ status: 400, description: 'Tên role đã tồn tại' })
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.userProfileService.updateRole(id, updateRoleDto);
  }

  @Delete('roles/:id')
  @RequirePermission('role.delete')
  @ApiOperation({ summary: 'Xóa role' })
  @ApiParam({ name: 'id', description: 'ID của role' })
  @ApiResponse({
    status: 200,
    description: 'Xóa role thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa role thành công' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
  @ApiResponse({ status: 400, description: 'Không thể xóa role đang được sử dụng' })
  removeRole(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.removeRole(id);
  }

  @Post('roles/:id/permissions')
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Gán quyền cho role' })
  @ApiParam({ name: 'id', description: 'ID của role' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissionIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
          description: 'Danh sách ID của permissions',
        },
      },
      required: ['permissionIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gán quyền cho role thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Gán quyền cho role thành công' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
  assignRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissionIds') permissionIds: number[],
  ) {
    return this.userProfileService.assignRolePermissions(id, permissionIds);
  }

  // ===== QUẢN LÝ LEVELS =====
  @Post('levels')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Tạo level mới' })
  @ApiBody({ type: CreateLevelDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo level thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo level thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Senior' },
            level: { type: 'number', example: 3 },
            description: { type: 'string', example: 'Cấp độ cao cấp' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tên level hoặc cấp độ đã tồn tại' })
  createLevel(@Body() createLevelDto: CreateLevelDto) {
    return this.userProfileService.createLevel(createLevelDto);
  }

  @Get('levels')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy danh sách levels với phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách levels thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Senior' },
              level: { type: 'number', example: 3 },
              description: { type: 'string', example: 'Cấp độ cao cấp' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              _count: {
                type: 'object',
                properties: {
                  user_information: { type: 'number', example: 5 },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllLevels(@Query() paginationDto: LevelPaginationDto) {
    return this.userProfileService.findAllLevels(paginationDto);
  }

  @Get('levels/:id')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết level' })
  @ApiParam({ name: 'id', description: 'ID của level' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin level thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Senior' },
            level: { type: 'number', example: 3 },
            description: { type: 'string', example: 'Cấp độ cao cấp' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            _count: {
              type: 'object',
              properties: {
                user_information: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy level' })
  findOneLevel(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.findOneLevel(id);
  }

  @Patch('levels/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Cập nhật thông tin level' })
  @ApiParam({ name: 'id', description: 'ID của level' })
  @ApiBody({ type: UpdateLevelDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật level thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cập nhật level thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Senior' },
            level: { type: 'number', example: 3 },
            description: { type: 'string', example: 'Cấp độ cao cấp' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy level' })
  @ApiResponse({ status: 400, description: 'Tên level hoặc cấp độ đã tồn tại' })
  updateLevel(@Param('id', ParseIntPipe) id: number, @Body() updateLevelDto: UpdateLevelDto) {
    return this.userProfileService.updateLevel(id, updateLevelDto);
  }

  @Delete('levels/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xóa level' })
  @ApiParam({ name: 'id', description: 'ID của level' })
  @ApiResponse({
    status: 200,
    description: 'Xóa level thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa level thành công' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy level' })
  @ApiResponse({ status: 400, description: 'Không thể xóa level đang được sử dụng' })
  removeLevel(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.removeLevel(id);
  }

  // ===== QUẢN LÝ POSITIONS =====
  @Post('positions')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Tạo vị trí mới' })
  @ApiBody({ type: CreatePositionDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo vị trí thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo vị trí thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Software Engineer' },
            level_id: { type: 'number', example: 1 },
            description: { type: 'string', example: 'Phát triển phần mềm' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            level: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Senior' },
                level: { type: 'number', example: 3 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Level không tồn tại hoặc tên vị trí đã tồn tại' })
  createPosition(@Body() createPositionDto: CreatePositionDto) {
    return this.userProfileService.createPosition(createPositionDto);
  }

  @Get('positions')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy danh sách vị trí với phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách vị trí thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Software Engineer' },
              level_id: { type: 'number', example: 1 },
              description: { type: 'string', example: 'Phát triển phần mềm' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              level: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'Senior' },
                  level: { type: 'number', example: 3 },
                },
              },
              _count: {
                type: 'object',
                properties: {
                  user_information: { type: 'number', example: 5 },
                  skills: { type: 'number', example: 3 },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllPositions(@Query() paginationDto: PositionPaginationDto) {
    return this.userProfileService.findAllPositions(paginationDto);
  }

  @Get('positions/:id')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết vị trí' })
  @ApiParam({ name: 'id', description: 'ID của vị trí' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin vị trí thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Software Engineer' },
            level_id: { type: 'number', example: 1 },
            description: { type: 'string', example: 'Phát triển phần mềm' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            level: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Senior' },
                level: { type: 'number', example: 3 },
              },
            },
            skills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'JavaScript' },
                  description: { type: 'string', example: 'Ngôn ngữ lập trình' },
                },
              },
            },
            _count: {
              type: 'object',
              properties: {
                user_information: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vị trí' })
  findOnePosition(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.findOnePosition(id);
  }

  @Patch('positions/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Cập nhật thông tin vị trí' })
  @ApiParam({ name: 'id', description: 'ID của vị trí' })
  @ApiBody({ type: UpdatePositionDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật vị trí thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cập nhật vị trí thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Software Engineer' },
            level_id: { type: 'number', example: 1 },
            description: { type: 'string', example: 'Phát triển phần mềm' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            level: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Senior' },
                level: { type: 'number', example: 3 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vị trí' })
  @ApiResponse({ status: 400, description: 'Level không tồn tại hoặc tên vị trí đã tồn tại' })
  updatePosition(@Param('id', ParseIntPipe) id: number, @Body() updatePositionDto: UpdatePositionDto) {
    return this.userProfileService.updatePosition(id, updatePositionDto);
  }

  @Delete('positions/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xóa vị trí' })
  @ApiParam({ name: 'id', description: 'ID của vị trí' })
  @ApiResponse({
    status: 200,
    description: 'Xóa vị trí thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa vị trí thành công' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vị trí' })
  @ApiResponse({ status: 400, description: 'Không thể xóa vị trí đang được sử dụng' })
  removePosition(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.removePosition(id);
  }

  // ===== QUẢN LÝ LANGUAGES =====
  @Post('languages')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Tạo ngôn ngữ mới' })
  @ApiBody({ type: CreateLanguageDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo ngôn ngữ thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo ngôn ngữ thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'English' },
            code: { type: 'string', example: 'en' },
            description: { type: 'string', example: 'Tiếng Anh' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tên hoặc mã ngôn ngữ đã tồn tại' })
  createLanguage(@Body() createLanguageDto: CreateLanguageDto) {
    return this.userProfileService.createLanguage(createLanguageDto);
  }

  @Get('languages')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy danh sách ngôn ngữ với phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ngôn ngữ thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'English' },
              code: { type: 'string', example: 'en' },
              description: { type: 'string', example: 'Tiếng Anh' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              _count: {
                type: 'object',
                properties: {
                  user_languages: { type: 'number', example: 5 },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllLanguages(@Query() paginationDto: LanguagePaginationDto) {
    return this.userProfileService.findAllLanguages(paginationDto);
  }

  @Get('languages/:id')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết ngôn ngữ' })
  @ApiParam({ name: 'id', description: 'ID của ngôn ngữ' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin ngôn ngữ thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'English' },
            code: { type: 'string', example: 'en' },
            description: { type: 'string', example: 'Tiếng Anh' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            _count: {
              type: 'object',
              properties: {
                user_languages: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngôn ngữ' })
  findOneLanguage(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.findOneLanguage(id);
  }

  @Patch('languages/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Cập nhật thông tin ngôn ngữ' })
  @ApiParam({ name: 'id', description: 'ID của ngôn ngữ' })
  @ApiBody({ type: UpdateLanguageDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ngôn ngữ thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cập nhật ngôn ngữ thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'English' },
            code: { type: 'string', example: 'en' },
            description: { type: 'string', example: 'Tiếng Anh' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngôn ngữ' })
  @ApiResponse({ status: 400, description: 'Tên hoặc mã ngôn ngữ đã tồn tại' })
  updateLanguage(@Param('id', ParseIntPipe) id: number, @Body() updateLanguageDto: UpdateLanguageDto) {
    return this.userProfileService.updateLanguage(id, updateLanguageDto);
  }

  @Delete('languages/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xóa ngôn ngữ' })
  @ApiParam({ name: 'id', description: 'ID của ngôn ngữ' })
  @ApiResponse({
    status: 200,
    description: 'Xóa ngôn ngữ thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa ngôn ngữ thành công' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngôn ngữ' })
  @ApiResponse({ status: 400, description: 'Không thể xóa ngôn ngữ đang được sử dụng' })
  removeLanguage(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.removeLanguage(id);
  }
}
