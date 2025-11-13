import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ScopeType } from '@prisma/client';

export class AssignRoleDto {
  @ApiProperty({ description: 'ID của user' })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'ID của role' })
  @IsInt()
  role_id: number;

  @ApiProperty({ 
    description: 'Loại scope',
    example: ScopeType.COMPANY,
    enum: ScopeType 
  })
  @IsString()
  @IsEnum(ScopeType)
  scope_type: ScopeType;

  @ApiPropertyOptional({ description: 'ID của scope (null cho company)' })
  @IsOptional()
  @IsInt()
  scope_id?: number;
}

export class BulkAssignRoleDto {
  @ApiProperty({ 
    description: 'Danh sách role assignments',
    type: [AssignRoleDto]
  })
  @IsArray()
  assignments: AssignRoleDto[];
}

export class RevokeRoleDto {
  @ApiProperty({ description: 'ID của user' })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'ID của role' })
  @IsInt()
  role_id: number;

  @ApiProperty({ 
    description: 'Loại scope', 
    enum: ScopeType 
  })
  @IsString()
  @IsEnum(ScopeType)
  scope_type: ScopeType;

  @ApiPropertyOptional({ description: 'ID của scope' })
  @IsOptional()
  @IsInt()
  scope_id?: number;
}

export class GetUserRolesByScopeDto {
  @ApiProperty({ 
    description: 'Loại scope', 
    enum: ScopeType 
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
      }
    }
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