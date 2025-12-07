import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({
    description: 'ID của user cần thêm vào team',
    example: 5,
  })
  @IsInt()
  user_id: number;

  @ApiProperty({
    description: 'ID của role trong team (optional, mặc định là Employee)',
    example: 6,
    required: false,
  })
  @IsInt()
  @IsOptional()
  role_id?: number;

  @ApiProperty({
    description: 'Mô tả vai trò của user trong team',
    example: 'Backend Developer chính',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
