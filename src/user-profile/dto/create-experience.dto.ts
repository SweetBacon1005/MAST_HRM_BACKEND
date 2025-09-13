import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsInt } from 'class-validator';

export class CreateExperienceDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsInt()
  user_id: number;

  @ApiProperty({
    description: 'Chức danh công việc',
    example: 'Lập trình viên Frontend',
  })
  @IsString()
  job_title: string;

  @ApiProperty({ description: 'Tên công ty', example: 'Công ty ABC' })
  @IsString()
  company: string;

  @ApiProperty({ description: 'Ngày bắt đầu', example: '2020-01-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Ngày kết thúc', example: '2022-12-31' })
  @IsDateString()
  end_date: string;
}
