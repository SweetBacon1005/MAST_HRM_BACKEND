import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOvertimeRequestDto {
  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Ngày làm thêm giờ',
    example: '2024-02-09',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu',
    example: '2024-02-09T18:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  start_time: string;

  @ApiProperty({
    description: 'Thời gian kết thúc',
    example: '2024-02-09T21:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  end_time: string;

  @ApiPropertyOptional({
    description: 'Tổng số giờ',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({
    description: 'Giá trị',
    example: 450000,
  })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({
    description: 'ID dự án',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  project_id?: number;

  @ApiPropertyOptional({
    description: 'Lý do làm thêm giờ',
    example: 'Hoàn thành dự án gấp',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
