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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ScopeType } from '@prisma/client';
import { GetCurrentUser } from '../decorators/get-current-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import {
  AssignRoleDto,
  BulkAssignResultDto,
  BulkAssignRoleDto,
  RevokeRoleDto,
  RoleAssignmentResponseDto,
  RoleHierarchyResponseDto,
  UserRoleByScopeResponseDto,
  UserRoleContextResponseDto,
  UsersByRoleResponseDto,
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
  async revokeRole(@Body() revokeRoleDto: RevokeRoleDto): Promise<void> {
    await this.roleAssignmentService.revokeRole(
      revokeRoleDto.user_id,
      revokeRoleDto.role_id,
      revokeRoleDto.scope_type as ScopeType,
      revokeRoleDto.scope_id,
    );
  }

  @Get('users/:userId/roles')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Lấy tất cả role assignments của user' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách role assignments',
    type: UserRoleContextResponseDto,
  })
  async getUserRoles(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UserRoleContextResponseDto> {
    return await this.roleAssignmentService.getUserRoles(userId);
  }

  @Get('users/:userId/roles/by-scope')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Lấy roles của user trong scope cụ thể' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiQuery({ name: 'scope_type', description: 'Loại scope', enum: ScopeType })
  @ApiQuery({ name: 'scope_id', description: 'ID của scope', required: false })
  @ApiResponse({
    status: 200,
    description: 'Danh sách roles trong scope',
    type: [UserRoleByScopeResponseDto],
  })
  async getUserRolesByScope(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('scope_type') scopeType: ScopeType,
    @Query('scope_id', ParseIntPipe) scopeId?: number,
  ): Promise<UserRoleByScopeResponseDto[]> {
    return await this.roleAssignmentService.getUserRolesByScope(
      userId,
      scopeType as ScopeType,
      scopeId,
    );
  }

  @Get('users/:userId/primary-role')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Lấy primary role của user trong scope cụ thể' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiQuery({ name: 'scope_type', description: 'Loại scope', enum: ScopeType })
  @ApiQuery({ name: 'scope_id', description: 'ID của scope', required: false })
  @ApiResponse({
    status: 200,
    description: 'Primary role trong scope',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        scope_type: { type: 'enum', enum: Object.values(ScopeType) },
        scope_id: { type: 'number', nullable: true },
      },
    },
  })
  async getUserPrimaryRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('scope_type') scopeType: ScopeType,
    @Query('scope_id', ParseIntPipe) scopeId?: number,
  ) {
    return await this.roleAssignmentService.getUserPrimaryRole(
      userId,
      scopeType,
      scopeId,
    );
  }

  @Get('roles/:roleName/users')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Lấy danh sách users có role cụ thể trong scope' })
  @ApiParam({ name: 'roleName', description: 'Tên role' })
  @ApiQuery({ name: 'scope_type', description: 'Loại scope', enum: ScopeType })
  @ApiQuery({ name: 'scope_id', description: 'ID của scope', required: false })
  @ApiResponse({
    status: 200,
    description: 'Danh sách users có role',
    type: [UsersByRoleResponseDto],
  })
  async getUsersByRole(
    @Param('roleName') roleName: string,
    @Query('scope_type') scopeType: ScopeType,
    @Query('scope_id', ParseIntPipe) scopeId?: number,
  ): Promise<UsersByRoleResponseDto[]> {
    return await this.roleAssignmentService.getUsersByRole(
      roleName,
      scopeType,
      scopeId,
    );
  }

  @Get('users/:userId/has-role')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Kiểm tra user có role cụ thể trong scope không' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiQuery({ name: 'role_name', description: 'Tên role' })
  @ApiQuery({ name: 'scope_type', description: 'Loại scope', enum: ScopeType })
  @ApiQuery({ name: 'scope_id', description: 'ID của scope', required: false })
  @ApiResponse({
    status: 200,
    description: 'Kết quả kiểm tra',
    schema: {
      type: 'object',
      properties: {
        hasRole: { type: 'boolean' },
      },
    },
  })
  async hasRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('role_name') roleName: string,
    @Query('scope_type') scopeType: ScopeType,
    @Query('scope_id', ParseIntPipe) scopeId?: number,
  ): Promise<{ hasRole: boolean }> {
    const hasRole = await this.roleAssignmentService.hasRole(
      userId,
      roleName,
      scopeType,
      scopeId,
    );
    return { hasRole };
  }

  @Get('users/:userId/has-any-role')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Kiểm tra user có bất kỳ role nào trong danh sách' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiQuery({
    name: 'role_names',
    description: 'Danh sách tên roles (phân cách bằng dấu phẩy)',
  })
  @ApiQuery({ name: 'scope_type', description: 'Loại scope', enum: ScopeType })
  @ApiQuery({ name: 'scope_id', description: 'ID của scope', required: false })
  @ApiResponse({
    status: 200,
    description: 'Kết quả kiểm tra',
    schema: {
      type: 'object',
      properties: {
        hasAnyRole: { type: 'boolean' },
      },
    },
  })
  async hasAnyRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('role_names') roleNames: string,
    @Query('scope_type') scopeType: ScopeType,
    @Query('scope_id', ParseIntPipe) scopeId?: number,
  ): Promise<{ hasAnyRole: boolean }> {
    const roleNamesArray = roleNames.split(',').map((name) => name.trim());
    const hasAnyRole = await this.roleAssignmentService.hasAnyRole(
      userId,
      roleNamesArray,
      scopeType,
      scopeId,
    );
    return { hasAnyRole };
  }

  @Get('users/:userId/hierarchy')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Lấy role hierarchy của user trong scope' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiQuery({ name: 'scope_type', description: 'Loại scope', enum: ScopeType })
  @ApiQuery({ name: 'scope_id', description: 'ID của scope', required: false })
  @ApiResponse({
    status: 200,
    description: 'Role hierarchy information',
    type: RoleHierarchyResponseDto,
  })
  async getRoleHierarchy(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('scope_type') scopeType: ScopeType,
    @Query('scope_id', ParseIntPipe) scopeId?: number,
  ): Promise<RoleHierarchyResponseDto> {
    return await this.roleAssignmentService.getRoleHierarchy(
      userId,
      scopeType,
      scopeId,
    );
  }
}
