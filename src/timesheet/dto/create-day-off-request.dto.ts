import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';

export class CreateDayOffRequestDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Ngày bắt đầu nghỉ',
    example: '2024-02-15',
  })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc nghỉ',
    example: '2024-02-17',
  })
  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @ApiProperty({
    description: 'Thời lượng nghỉ (1: cả ngày, 2: buổi sáng, 3: buổi chiều)',
    example: 1,
    enum: [1, 2, 3],
  })
  @IsNotEmpty()
  @IsInt()
  duration: number;

  @ApiProperty({
    description: 'Tổng số ngày nghỉ (0.5 cho nửa ngày, 1 cho cả ngày)',
    example: 3,
  })
  @IsNotEmpty()
  @IsNumber()
  total: number;

  @ApiProperty({
    description:
      'Loại nghỉ phép (1: có lương, 2: không lương, 3: ốm đau, 4: thai sản, 5: việc riêng, 6: nghỉ bù)',
    example: 1,
    enum: [1, 2, 3, 4, 5, 6],
  })
  @IsNotEmpty()
  @IsInt()
  type: number;

  @ApiProperty({
    description: 'Lý do nghỉ phép',
    example: 'Nghỉ phép năm',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Sẽ hoàn thành công việc trước khi nghỉ',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Có phải nghỉ bù không (1: có, 0: không)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  is_past?: number;

  @ApiPropertyOptional({
    description: 'ID hợp đồng',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  contract_id?: number;
}
