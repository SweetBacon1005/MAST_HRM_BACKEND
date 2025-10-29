import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

// AssignRoleDto và BulkAssignRoleDto đã được thay thế bởi UnifiedRoleAssignmentDto
// Xem: src/auth/dto/unified-role-assignment.dto.ts

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'ID của role mới',
    example: 2,
  })
  @IsNumber()
  roleId: number;

  @ApiPropertyOptional({
    description: 'Lý do thay đổi role',
    example: 'Thăng chức',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

