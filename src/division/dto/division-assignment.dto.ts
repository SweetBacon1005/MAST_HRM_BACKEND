import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateDivisionAssignmentDto {
  @ApiProperty({
    description: 'ID phòng ban',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'ID phòng ban phải là số nguyên' })
  @Min(1, { message: 'ID phòng ban phải lớn hơn 0' })
  division_id: number;

  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'ID người dùng phải là số nguyên' })
  @Min(1, { message: 'ID người dùng phải lớn hơn 0' })
  user_id: number;

  @ApiProperty({
    description: 'Ngày bắt đầu',
    example: '2024-01-01',
  })
  @IsDateString({}, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc',
    example: '2024-12-31',
  })
  @IsDateString({}, { message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD' })
  end_date: string;

  @ApiProperty({
    description: 'ID hợp đồng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID hợp đồng phải là số nguyên' })
  @Min(1, { message: 'ID hợp đồng phải lớn hơn 0' })
  contract_id?: number;

  @ApiProperty({
    description: 'Ghi chú',
    example: 'Phân công làm việc tại phòng ban mới',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(1000, { message: 'Ghi chú không được quá 1000 ký tự' })
  note?: string;
}

export class UpdateDivisionAssignmentDto {
  @ApiProperty({
    description: 'Ngày bắt đầu',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD' })
  end_date?: string;

  @ApiProperty({
    description: 'ID hợp đồng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID hợp đồng phải là số nguyên' })
  @Min(1, { message: 'ID hợp đồng phải lớn hơn 0' })
  contract_id?: number;

  @ApiProperty({
    description: 'Ghi chú',
    example: 'Cập nhật thông tin phân công',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(1000, { message: 'Ghi chú không được quá 1000 ký tự' })
  note?: string;
}
