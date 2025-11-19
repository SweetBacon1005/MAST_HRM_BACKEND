import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
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
import { ScopeType } from '@prisma/client';
import { GetCurrentUser } from '../decorators/get-current-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { ROLE_PERMISSIONS } from '../constants/permission.constants';
import {
  AssignRoleDto,
  BulkAssignResultDto,
  BulkAssignRoleDto,
  RevokeRoleDto,
  RoleAssignmentResponseDto,
  UserRoleContextResponseDto,
} from '../dto/role-assignment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RoleAssignmentService } from '../services/role-assignment.service';

@ApiTags('Role Assignment Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('role-assignments')
export class RoleAssignmentController {
  constructor(private readonly roleAssignmentService: RoleAssignmentService) {}

  @Post('assign')
  @RequirePermission('role.assign')
  @ApiOperation({ summary: 'Gán role cho user trong context cụ thể' })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Gán role thành công',
    type: RoleAssignmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'User hoặc role không tồn tại',
  })
  @ApiResponse({
    status: 409,
    description: 'User đã có role này trong context này',
  })
  async assignRole(
    @Body() assignRoleDto: AssignRoleDto,
    @GetCurrentUser('id') assignedBy: number,
  ): Promise<RoleAssignmentResponseDto> {
    return await this.roleAssignmentService.assignRole({
      user_id: assignRoleDto.user_id,
      role_id: assignRoleDto.role_id,
      scope_type: assignRoleDto.scope_type,
      scope_id: assignRoleDto.scope_id,
      assigned_by: assignedBy,
    });
  }

  @Get('roles')
  @RequirePermission(ROLE_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Lấy danh sách roles hệ thống' })
  async getRoles() {
    return this.roleAssignmentService.getRoles();
  }

  @Post('bulk-assign')
  @RequirePermission('role.assign')
  @ApiOperation({ summary: 'Gán roles cho nhiều users cùng lúc' })
  @ApiBody({ type: BulkAssignRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Bulk assign thành công',
    type: [BulkAssignResultDto],
  })
  async bulkAssignRoles(
    @Body() bulkAssignDto: BulkAssignRoleDto,
    @GetCurrentUser('id') assignedBy: number,
  ): Promise<BulkAssignResultDto[]> {
    const assignmentsWithAssigner = bulkAssignDto.assignments.map(
      (assignment) => ({
        ...assignment,
        assigned_by: assignedBy,
      }),
    );

    return await this.roleAssignmentService.bulkAssignRoles(
      assignmentsWithAssigner,
    );
  }

  @Delete('revoke')
  @RequirePermission('role.revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Thu hồi role assignment' })
  @ApiBody({ type: RevokeRoleDto })
  @ApiResponse({
    status: 204,
    description: 'Thu hồi role thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Role assignment không tồn tại',
  })
  async revokeRole(@Body() revokeRoleDto: RevokeRoleDto, @GetCurrentUser('id') assignedBy: number): Promise<void> {
    await this.roleAssignmentService.revokeRole(
      revokeRoleDto.user_id,
      revokeRoleDto.role_id,
      revokeRoleDto.scope_type as ScopeType,
      assignedBy,
      revokeRoleDto.scope_id,
    );
  }

  @Get('users/:user_id/roles')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Lấy tất cả role assignments của user' })
  @ApiParam({ name: 'user_id', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách role assignments',
    type: UserRoleContextResponseDto,
  })
  async getUserRoles(
    @Param('user_id', ParseIntPipe) user_id: number,
  ): Promise<UserRoleContextResponseDto> {
    return await this.roleAssignmentService.getUserRoles(user_id);
  }
}
