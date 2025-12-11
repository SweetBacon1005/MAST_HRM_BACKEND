import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScopeType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'ID của user' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'ID của role' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  role_id: number;

  @ApiProperty({
    description: 'Loại scope',
    example: ScopeType.COMPANY,
    enum: ScopeType,
  })
  @IsString()
  @IsEnum(ScopeType)
  scope_type: ScopeType;

  @ApiPropertyOptional({ description: 'ID của scope (null cho company)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  scope_id?: number;
}

export class BulkAssignRoleDto {
  @ApiProperty({
    description: 'Danh sách role assignments',
    type: [AssignRoleDto],
  })
  @IsArray()
  assignments: AssignRoleDto[];
}

export class RevokeRoleDto {
  @ApiProperty({ description: 'ID của user' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'ID của role' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  role_id: number;

  @ApiPropertyOptional({ description: 'ID của scope' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsOptional()
  @IsInt()
  scope_id?: number;

  @ApiProperty({ example: ScopeType.COMPANY, description: 'Loại scope' })
  @IsEnum(ScopeType)
  scope_type: ScopeType;
}

export class GetUserRolesByScopeDto {
  @ApiProperty({
    description: 'Loại scope',
    enum: ScopeType,
  })
  @IsString()
  @IsEnum(ScopeType)
  scope_type: ScopeType;

  @ApiPropertyOptional({ description: 'ID của scope' })
  @IsOptional()
  @IsInt()
  scope_id?: number;
}

// Response DTOs
export class RoleAssignmentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: number;

  @ApiProperty()
  role_id: number;

  @ApiProperty()
  scope_type: ScopeType;

  @ApiProperty()
  scope_id?: number | null;

  @ApiProperty()
  assigned_by: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  role: {
    id: number;
    name: string;
  };

  @ApiProperty()
  user: {
    id: number;
    email: string;
    user_information?: {
      name: string | null;
    } | null;
  };
}

export class UserRoleContextResponseDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        scope_type: { type: 'enum', enum: Object.values(ScopeType) },
        scope_id: { type: 'number', nullable: true },
      },
    },
  })
  roles: {
    id: number;
    name: string;
    scope_type: ScopeType;
    scope_id?: number;
  }[];
}

export class UserRoleByScopeResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  assigned_at: Date;
}

export class UsersByRoleResponseDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name?: string | null;

  @ApiProperty()
  avatar?: string | null;

  @ApiProperty()
  role_name: string;

  @ApiProperty()
  assigned_at: Date;
}

export class BulkAssignResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data?: RoleAssignmentResponseDto;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  assignment?: AssignRoleDto;
}

export class RoleHierarchyResponseDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  max_role_level: number;

  @ApiProperty({ type: [UserRoleByScopeResponseDto] })
  roles: UserRoleByScopeResponseDto[];

  @ApiProperty({ type: [String] })
  inherited_permissions: string[];
}
