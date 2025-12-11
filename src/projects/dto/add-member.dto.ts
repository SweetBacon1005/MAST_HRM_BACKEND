import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class AddProjectMemberDto {
  @ApiProperty({
    description: 'ID của user cần thêm vào dự án',
    example: 5,
  })
  @IsInt({ message: 'User ID phải là số nguyên' })
  @IsPositive({ message: 'User ID phải là số dương' })
  user_id: number;

  @ApiProperty({
    description: 'ID của role trong dự án (mặc định: Employee - ID 6)',
    example: 6,
    required: false,
    default: 6,
  })
  @IsOptional()
  @IsInt({ message: 'Role ID phải là số nguyên' })
  @IsPositive({ message: 'Role ID phải là số dương' })
  role_id?: number = 6; // Default: Employee
}
