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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import {
  EducationPaginationDto,
  ExperiencePaginationDto,
  ReferencePaginationDto,
  UserSkillPaginationDto,
} from './dto/pagination-queries.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { UpdateAvatarDto } from './dto/upload-avatar.dto';
import { UserProfileService } from './user-profile.service';

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

@ApiTags('user-profile')
@Controller('user-profile')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

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
        user_name: { type: 'string' },
        email: { type: 'string' },
        user_information: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            avatar: { type: 'string' },
            position: { type: 'object' },
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
  async getUserProfile(@GetCurrentUser('id') user_id: number) {
    return await this.userProfileService.getUserProfile(user_id);
  }

  @Patch('information')
  @RequirePermission('user.profile.update')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin thành công',
  })
  async updateUserInformation(
    @GetCurrentUser('id') user_id: number,
    @Body() updateDto: UpdateUserInformationDto,
  ) {
    return await this.userProfileService.updateUserInformation(
      user_id,
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
    @GetCurrentUser('id') user_id: number,
    @Body() createDto: CreateEducationDto,
  ) {
    createDto.user_id = user_id;
    return await this.userProfileService.createEducation(createDto);
  }

  @Get('education')
  @ApiOperation({ summary: 'Lấy danh sách học vấn có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách học vấn có phân trang',
  })
  async getEducations(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: EducationPaginationDto,
  ) {
    return await this.userProfileService.getEducationsPaginated(
      user_id,
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
    @GetCurrentUser('id') user_id: number,
  ) {
    updateDto.user_id = user_id;
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
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.userProfileService.deleteEducation(educationId, user_id);
  }

  // ===== QUẢN LÝ KINH NGHIỆM =====
  @Post('experience')
  @ApiOperation({ summary: 'Thêm thông tin kinh nghiệm' })
  @ApiResponse({
    status: 201,
    description: 'Thêm thông tin kinh nghiệm thành công',
  })
  async createExperience(
    @GetCurrentUser('id') user_id: number,
    @Body() createDto: CreateExperienceDto,
  ) {
    createDto.user_id = user_id;
    return await this.userProfileService.createExperience(createDto);
  }

  @Get('experience')
  @ApiOperation({ summary: 'Lấy danh sách kinh nghiệm có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kinh nghiệm có phân trang',
  })
  async getExperiences(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: ExperiencePaginationDto,
  ) {
    return await this.userProfileService.getExperiencesPaginated(
      user_id,
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
    @GetCurrentUser('id') user_id: number,
  ) {
    updateDto.user_id = user_id;
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
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.userProfileService.deleteExperience(experienceId, user_id);
  }

  // ===== QUẢN LÝ KỸ NĂNG CỦA USER =====

  @Post('user-skills')
  @ApiOperation({ summary: 'Thêm kỹ năng' })
  @ApiResponse({
    status: 201,
    description: 'Thêm kỹ năng thành công',
  })
  async createUserSkill(
    @GetCurrentUser('id') user_id: number,
    @Body() createDto: CreateUserSkillDto,
  ) {
    createDto.user_id = user_id;
    return await this.userProfileService.createUserSkill(createDto);
  }

  @Get('user-skills/position/:position_id')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng theo vị trí' })
  @ApiParam({ name: 'position_id', description: 'ID của vị trí' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kỹ năng theo vị trí',
  })
  async getSkillsByPosition(
    @Param('position_id', ParseIntPipe) position_id: number,
  ) {
    return await this.userProfileService.getSkillsByPosition(position_id);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kỹ năng có phân trang',
  })
  async getUserSkills(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: UserSkillPaginationDto,
  ) {
    return await this.userProfileService.getUserSkillsPaginated(
      user_id,
      paginationDto,
    );
  }

  @Patch('user-skills/:id')
  @ApiOperation({ summary: 'Cập nhật kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của user skill' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateUserSkill(
    @Param('id', ParseIntPipe) userskill_id: number,
    @Body() updateDto: UpdateUserSkillDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    updateDto.user_id = user_id;
    return await this.userProfileService.updateUserSkill(
      userskill_id,
      updateDto,
    );
  }

  @Delete('user-skills/:id')
  @ApiOperation({ summary: 'Xóa kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của user skill' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteUserSkill(
    @Param('id', ParseIntPipe) userskill_id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.userProfileService.deleteUserSkill(userskill_id, user_id);
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
    @GetCurrentUser('id') user_id: number,
    @Body() updateAvatarDto: UpdateAvatarDto,
  ) {
    return await this.userProfileService.updateAvatar(
      user_id,
      updateAvatarDto.avatar_url,
    );
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
            total_pages: { type: 'number', example: 5 },
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
  updateLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLevelDto: UpdateLevelDto,
  ) {
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
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa level đang được sử dụng',
  })
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
  @ApiResponse({
    status: 400,
    description: 'Level không tồn tại hoặc tên vị trí đã tồn tại',
  })
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
            total_pages: { type: 'number', example: 5 },
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
                  description: {
                    type: 'string',
                    example: 'Ngôn ngữ lập trình',
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
  @ApiResponse({
    status: 400,
    description: 'Level không tồn tại hoặc tên vị trí đã tồn tại',
  })
  updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
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
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa vị trí đang được sử dụng',
  })
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
            total_pages: { type: 'number', example: 5 },
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
  updateLanguage(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ) {
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
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa ngôn ngữ đang được sử dụng',
  })
  removeLanguage(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.removeLanguage(id);
  }

  // ===== QUẢN LÝ SKILLS =====
  @Post('skills')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Tạo kỹ năng mới' })
  @ApiBody({ type: CreateSkillDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo kỹ năng thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo kỹ năng thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'JavaScript' },
            position_id: { type: 'number', example: 1 },
            position: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Software Engineer' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tên kỹ năng đã tồn tại' })
  createSkill(@Body() createSkillDto: CreateSkillDto) {
    return this.userProfileService.createSkill(createSkillDto);
  }

  @Get('references/skills')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng với phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách kỹ năng thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'JavaScript' },
              position_id: { type: 'number', example: 1 },
              position: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'Software Engineer' },
                },
              },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              _count: {
                type: 'object',
                properties: {
                  user_skills: { type: 'number', example: 5 },
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
            total_pages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllSkills(@Query() paginationDto: SkillPaginationDto) {
    return this.userProfileService.findAllSkills(paginationDto);
  }

  @Get('skills/:id')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của kỹ năng' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin kỹ năng thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'JavaScript' },
            position_id: { type: 'number', example: 1 },
            position: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Software Engineer' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            _count: {
              type: 'object',
              properties: {
                user_skills: { type: 'number', example: 5 },
                position_skills: { type: 'number', example: 3 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỹ năng' })
  findOneSkill(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.findOneSkill(id);
  }

  @Patch('skills/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Cập nhật thông tin kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của kỹ năng' })
  @ApiBody({ type: UpdateSkillDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật kỹ năng thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cập nhật kỹ năng thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'JavaScript' },
            position_id: { type: 'number', example: 1 },
            position: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Software Engineer' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỹ năng' })
  @ApiResponse({ status: 400, description: 'Tên kỹ năng đã tồn tại' })
  updateSkill(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSkillDto: UpdateSkillDto,
  ) {
    return this.userProfileService.updateSkill(id, updateSkillDto);
  }

  @Delete('skills/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xóa kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của kỹ năng' })
  @ApiResponse({
    status: 200,
    description: 'Xóa kỹ năng thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa kỹ năng thành công' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỹ năng' })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa kỹ năng đang được sử dụng',
  })
  removeSkill(@Param('id', ParseIntPipe) id: number) {
    return this.userProfileService.removeSkill(id);
  }
}
