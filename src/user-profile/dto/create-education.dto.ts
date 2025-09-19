import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEducationDto {
  @ApiHideProperty()
  @IsOptional()
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'Tên trường học', example: 'Đại học Bách Khoa' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Chuyên ngành', example: 'Công nghệ thông tin' })
  @IsString()
  major: string;

  @ApiProperty({ description: 'Mô tả', example: 'Cử nhân Công nghệ thông tin' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Ngày bắt đầu', example: '2018-09-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Ngày kết thúc', example: '2022-06-30' })
  @IsDateString()
  end_date: string;
}
