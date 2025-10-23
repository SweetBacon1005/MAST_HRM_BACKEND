import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, IsEnum, IsBoolean } from 'class-validator';

export enum AssignmentType {
  PROJECT_MANAGER = 'project_manager',
  TEAM_LEADER = 'team_leader',
}

export enum AssignmentStatus {
  ACTIVE = 'active',
  REPLACED = 'replaced',
  REVOKED = 'revoked',
}

export class AssignProjectManagerDto {
  @ApiProperty({ description: 'ID của project' })
  @IsInt()
  @Min(1)
  projectId: number;

  @ApiProperty({ description: 'ID của user sẽ làm PM' })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiPropertyOptional({ description: 'Lý do gán PM' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Xác nhận chuyển giao nếu đã có PM', default: false })
  @IsOptional()
  @IsBoolean()
  confirmTransfer?: boolean = false;
}

export class AssignTeamLeaderDto {
  @ApiProperty({ description: 'ID của team' })
  @IsInt()
  @Min(1)
  teamId: number;

  @ApiProperty({ description: 'ID của user sẽ làm Team Leader' })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiPropertyOptional({ description: 'Lý do gán Team Leader' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Xác nhận chuyển giao nếu đã có Team Leader', default: false })
  @IsOptional()
  @IsBoolean()
  confirmTransfer?: boolean = false;
}

export class RevokeAssignmentDto {
  @ApiProperty({ description: 'ID của assignment cần thu hồi' })
  @IsInt()
  @Min(1)
  assignmentId: number;

  @ApiPropertyOptional({ description: 'Lý do thu hồi' })
  @IsOptional()
  @IsString()
  reason?: string;
}
