import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class TeamMemberItemDto {
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

export class AddTeamMemberDto {
  @ApiProperty({
    description: 'Danh sách users cần thêm vào team',
    type: [TeamMemberItemDto],
    example: [
      { user_id: 5, role_id: 6, description: 'Backend Developer' },
      { user_id: 7, description: 'Frontend Developer' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 user để thêm vào team' })
  @ValidateNested({ each: true })
  @Type(() => TeamMemberItemDto)
  members: TeamMemberItemDto[];
}
