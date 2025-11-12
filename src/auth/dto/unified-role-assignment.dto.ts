import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsInt, 
  IsOptional, 
  Min, 
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AssignmentContextDto {
  @ApiPropertyOptional({ description: 'ID của division (required cho DIVISION_HEAD)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  divisionId?: number;

  @ApiPropertyOptional({ description: 'ID của project (required cho PROJECT_MANAGER)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;

  @ApiPropertyOptional({ description: 'ID của team (required cho TEAM_LEADER)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  teamId?: number;
}

// Removed AssignmentDetailsDto and AssignmentOptionsDto as database doesn't support these fields

export class UnifiedRoleAssignmentDto {
  @ApiProperty({ 
    description: 'ID của user hoặc danh sách user IDs cần gán role',
    example: 123,
    oneOf: [
      { type: 'number', example: 123 },
      { type: 'array', items: { type: 'number' }, example: [123, 456, 789] }
    ]
  })
  @Transform(({ value }) => {
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách user không được trống' })
  @IsNumber({}, { each: true })
  targetUserId: number[];

  @ApiProperty({ description: 'ID của role cần gán', example: 4 })
  @IsInt()
  @Min(1)
  roleId: number;

  @ApiPropertyOptional({ description: 'Context thông tin cho assignment' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentContextDto)
  context?: AssignmentContextDto;
}

// Response DTOs
export class AssignmentResultDto {
  @ApiProperty({ description: 'ID của user được gán' })
  userId: number;

  @ApiProperty({ description: 'Thành công hay không' })
  success: boolean;

  @ApiProperty({ description: 'Thông báo kết quả' })
  message: string;

  @ApiPropertyOptional({ description: 'Chi tiết user sau khi gán' })
  user?: {
    id: number;
    name: string;
    email: string;
    role: {
      id: number;
      name: string;
    };
  };

  @ApiPropertyOptional({ description: 'Thông tin context assignment' })
  context?: {
    division?: { id: number; name: string };
    project?: { id: number; name: string; code: string };
    team?: { id: number; name: string };
  };

  @ApiPropertyOptional({ description: 'Thông tin user bị thay thế (nếu có)' })
  replacedUser?: {
    id: number;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Error details nếu thất bại' })
  error?: string;
}

export class UnifiedRoleAssignmentResponseDto {
  @ApiProperty({ description: 'Kết quả tổng thể' })
  success: boolean;

  @ApiProperty({ description: 'Kết quả chi tiết cho từng user' })
  results: AssignmentResultDto[];

  @ApiPropertyOptional({ description: 'Tóm tắt kết quả (cho batch assignment)' })
  summary?: {
    total: number;
    successful: number;
    failed: number;
  };

  // Removed complex conflict handling as it's not supported by current database schema
}

// Enum cho role types để validate context requirements
export enum RoleContextRequirement {
  NONE = 'none',
  DIVISION = 'division',
  PROJECT = 'project', 
  TEAM = 'team',
  DIVISION_OR_PROJECT = 'division_or_project'
}

// Mapping role names to context requirements
export const ROLE_CONTEXT_REQUIREMENTS: Record<string, RoleContextRequirement> = {
  'admin': RoleContextRequirement.NONE,
  'hr_manager': RoleContextRequirement.NONE,
  'division_head': RoleContextRequirement.DIVISION,
  'project_manager': RoleContextRequirement.PROJECT,
  'team_leader': RoleContextRequirement.TEAM,
  'employee': RoleContextRequirement.NONE,
};
