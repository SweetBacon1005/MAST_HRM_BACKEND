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
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { TeamService } from './team.service';
import { CreateTeamDto, UpdateTeamDto, TeamPaginationDto } from '../division/dto/team.dto';
import { AddTeamMemberDto } from './dto/add-member.dto';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @RequirePermission('team.create')
  @ApiOperation({ summary: 'Tạo team mới' })
  @ApiBody({ type: CreateTeamDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Team được tạo thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo team thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Team Backend' },
            division_id: { type: 'number', example: 2 },
            founding_date: { type: 'string', example: '2024-01-01' },
            division: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                name: { type: 'string', example: 'Phòng Phát Triển' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy division' })
  create(
    @Body() createTeamDto: CreateTeamDto,
    @GetCurrentUser('id') assignedBy: number,
  ) {
    return this.teamService.create(createTeamDto, assignedBy);
  }

  @Get()
  @RequirePermission('team.read')
  @ApiOperation({ summary: 'Lấy danh sách teams có phân trang' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách teams',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Team Backend' },
              division_id: { type: 'number', example: 2 },
              division: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 2 },
                  name: { type: 'string', example: 'Phòng Phát Triển' },
                },
              },
              manager: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number', example: 5 },
                  name: { type: 'string', example: 'Nguyễn Văn A' },
                  email: { type: 'string', example: 'leader@example.com' },
                  avatar: { type: 'string', example: 'https://...' },
                },
              },
              member_count: { type: 'number', example: 5 },
              resource_by_level: {
                type: 'object',
                additionalProperties: { type: 'number' },
                example: { 'Junior': 2, 'Mid': 2, 'Senior': 1 },
              },
              active_projects: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 10 },
                    name: { type: 'string', example: 'API Gateway' },
                  },
                },
              },
              founding_date: { type: 'string', example: '2024-01-01' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 20 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total_pages: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  findAll(@Query() paginationDto: TeamPaginationDto) {
    return this.teamService.findAll(paginationDto);
  }

  @Get(':id')
  @RequirePermission('team.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thông tin chi tiết team',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            division_id: { type: 'number' },
            division: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
              },
            },
            member_count: { type: 'number' },
            project_count: { type: 'number' },
            founding_date: { type: 'string' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  position: { type: 'object' },
                  level: { type: 'object' },
                  role: { type: 'object' },
                },
              },
            },
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  code: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy team' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('team.update')
  @ApiOperation({ summary: 'Cập nhật thông tin team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiBody({ type: UpdateTeamDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy team' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @RequirePermission('team.delete')
  @ApiOperation({ summary: 'Xóa team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa thành công',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy team' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Không thể xóa team vì còn dự án' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.remove(id);
  }

  // ============================================================================
  // TEAM MEMBER MANAGEMENT
  // ============================================================================

  @Post(':id/members')
  @RequirePermission('team.member.add')
  @ApiOperation({
    summary: 'Thêm user vào team',
    description: `
      Thêm user vào team trong cùng division.
      
      **Quyền truy cập:**
      - Admin: Có thể thêm vào bất kỳ team nào
      - Division Head: Có thể thêm vào team của division mình quản lý
      - Team Leader: Có thể thêm vào team mình quản lý
      
      **Quy tắc:**
      - User có thể là thành viên của nhiều team cùng lúc
      - Tất cả các team phải thuộc cùng 1 division với user
      - User chỉ thuộc 1 division duy nhất
      - Role mặc định là Employee nếu không chỉ định
      
      **Lưu ý về quyền truy cập projects:**
      - Thêm vào team KHÔNG tự động cấp quyền truy cập projects
      - Để user truy cập project, cần thêm riêng vào từng project
      - Khi lấy danh sách thành viên project, sẽ lấy tất cả members từ team của project
    `,
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiBody({
    type: AddTeamMemberDto,
    examples: {
      basic: {
        summary: 'Thêm member cơ bản (role mặc định)',
        value: {
          user_id: 5,
          description: 'Backend Developer',
        },
      },
      withRole: {
        summary: 'Thêm member với role cụ thể',
        value: {
          user_id: 5,
          role_id: 7,
          description: 'Senior Frontend Developer',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Thêm thành viên thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã thêm user vào team thành công' },
        data: {
          type: 'object',
          properties: {
            assignment_id: { type: 'number', example: 123 },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 5 },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'Nguyễn Văn A' },
                code: { type: 'string', example: 'NV001' },
                avatar: { type: 'string', example: 'avatar.jpg' },
              },
            },
            team: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 3 },
                name: { type: 'string', example: 'Team Backend' },
                division: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 2 },
                    name: { type: 'string', example: 'Phòng Phát Triển' },
                  },
                },
              },
            },
            role: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 6 },
                name: { type: 'string', example: 'Employee' },
              },
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Backend Developer',
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy team hoặc user' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'User đã là thành viên của team' })
  addMember(
    @Param('id', ParseIntPipe) teamId: number,
    @Body() dto: AddTeamMemberDto,
    @GetCurrentUser('id') assignedBy: number,
  ) {
    return this.teamService.addMember(teamId, dto, assignedBy);
  }

  @Delete(':id/members/:userId')
  @RequirePermission('team.member.remove')
  @ApiOperation({
    summary: 'Xóa user khỏi team',
    description: `
      Xóa user khỏi team. Chỉ xóa khỏi team, KHÔNG xóa khỏi các projects.
      
      **Lưu ý:**
      - Chỉ xóa membership của user trong team này
      - User vẫn giữ quyền truy cập các projects đã được cấp riêng
      - Để xóa khỏi project, cần xóa riêng trong từng project
      - Action này không thể hoàn tác
    `,
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa thành viên thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã xóa user khỏi team' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy team hoặc user không phải thành viên' })
  removeMember(
    @Param('id', ParseIntPipe) teamId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.teamService.removeMember(teamId, userId);
  }

  @Get(':id/available-members')
  @RequirePermission('team.read')
  @ApiOperation({
    summary: 'Lấy danh sách users có thể thêm vào team',
    description: `
      Trả về danh sách users trong cùng division mà chưa là thành viên của team này.
      
      **Logic:**
      - Lấy tất cả users trong division của team
      - Loại bỏ users đã là thành viên của team
      - Kết quả: users có thể thêm vào team
      
      **Hữu ích cho:**
      - Team Leader khi muốn thêm member
      - UI dropdown/autocomplete chọn user
    `,
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách users có thể thêm vào team',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'number' },
              email: { type: 'string' },
              name: { type: 'string' },
              code: { type: 'string' },
              avatar: { type: 'string' },
              position: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
              level: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy team' })
  getAvailableMembers(@Param('id', ParseIntPipe) teamId: number) {
    return this.teamService.getAvailableMembers(teamId);
  }

  @Get(':id/members')
  @RequirePermission('team.read')
  @ApiOperation({
    summary: 'Lấy danh sách thành viên của team',
    description: 'Trả về danh sách tất cả members của team với thông tin chi tiết',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách thành viên',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lấy danh sách thành viên thành công' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              assignment_id: { type: 'number' },
              user_id: { type: 'number' },
              email: { type: 'string' },
              name: { type: 'string' },
              code: { type: 'string' },
              avatar: { type: 'string' },
              position: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
              level: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  coefficient: { type: 'number' },
                },
              },
              role: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
              joined_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy team' })
  getMembers(@Param('id', ParseIntPipe) teamId: number) {
    return this.teamService.getMembers(teamId);
  }
}
