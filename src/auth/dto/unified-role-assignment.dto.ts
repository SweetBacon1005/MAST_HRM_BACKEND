import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsInt, 
  IsOptional, 
  IsString, 
  Min, 
  IsBoolean, 
  IsDateString,
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

export class AssignmentDetailsDto {
  @ApiPropertyOptional({ description: 'Assignment tạm thời', default: false })
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean = false;

  @ApiPropertyOptional({ description: 'Ngày hết hạn (nếu isTemporary = true)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Lý do gán role' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignmentOptionsDto {
  @ApiPropertyOptional({ description: 'Xác nhận chuyển giao nếu đã có người giữ role', default: false })
  @IsOptional()
  @IsBoolean()
  confirmTransfer?: boolean = false;

  @ApiPropertyOptional({ description: 'Cho phép gán cross-division (chỉ HR_MANAGER+)', default: false })
  @IsOptional()
  @IsBoolean()
  allowCrossDivision?: boolean = false;

  @ApiPropertyOptional({ description: 'Bỏ qua validation nghiệp vụ (chỉ SUPER_ADMIN)', default: false })
  @IsOptional()
  @IsBoolean()
  skipBusinessValidation?: boolean = false;
}

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
    // Chuyển đổi single number thành array để xử lý thống nhất
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

  @ApiPropertyOptional({ description: 'Chi tiết assignment' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentDetailsDto)
  assignment?: AssignmentDetailsDto;

  @ApiPropertyOptional({ description: 'Tùy chọn assignment' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentOptionsDto)
  options?: AssignmentOptionsDto;
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

  @ApiPropertyOptional({ description: 'Cảnh báo' })
  warnings?: string[];

  @ApiPropertyOptional({ description: 'Yêu cầu xác nhận (nếu có conflict)' })
  requiresConfirmation?: boolean;

  @ApiPropertyOptional({ description: 'Thông tin conflict cần giải quyết' })
  conflictInfo?: {
    conflictType: string;
    currentAssignments: any[];
    suggestedActions: string[];
  };
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
  'super_admin': RoleContextRequirement.NONE,
  'admin': RoleContextRequirement.NONE,
  'hr_manager': RoleContextRequirement.NONE,
  'division_head': RoleContextRequirement.DIVISION,
  'project_manager': RoleContextRequirement.PROJECT,
  'team_leader': RoleContextRequirement.TEAM,
  'employee': RoleContextRequirement.NONE,
};
