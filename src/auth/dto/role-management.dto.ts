import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'ID của user cần gán role',
    example: 1,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'ID của role cần gán',
    example: 2,
  })
  @IsNumber()
  roleId: number;

  @ApiPropertyOptional({
    description: 'Tên của role (để validation)',
    example: 'team_leader',
  })
  @IsString()
  @IsOptional()
  roleName?: string;
}

export class BulkAssignRoleDto {
  @ApiProperty({
    description: 'Danh sách ID của các user cần gán role',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách user không được trống' })
  @IsNumber({}, { each: true })
  userIds: number[];

  @ApiProperty({
    description: 'ID của role cần gán',
    example: 2,
  })
  @IsNumber()
  roleId: number;

  @ApiPropertyOptional({
    description: 'Tên của role (để validation)',
    example: 'team_leader',
  })
  @IsString()
  @IsOptional()
  roleName?: string;
}

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

