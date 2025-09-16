import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserSkillDto {
  @ApiProperty({ description: 'ID kỹ năng' })
  @IsInt()
  skill_id: number;

  @ApiProperty({ description: 'ID người dùng' })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'Năm kinh nghiệm', example: 3 })
  @IsInt()
  experience: number;

  @ApiProperty({ description: 'Tháng kinh nghiệm', example: 6 })
  @IsInt()
  months_experience: number;

  @ApiProperty({ description: 'Có phải kỹ năng chính không', example: true })
  @IsOptional()
  @IsBoolean()
  is_main?: boolean;
}
