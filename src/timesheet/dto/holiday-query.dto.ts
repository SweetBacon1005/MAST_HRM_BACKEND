import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';

export class HolidayQueryDto {
  @ApiPropertyOptional({
    description: 'Năm (YYYY)',
    example: '2025',
  })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Năm phải là chuỗi' })
  @Matches(/^\d{4}$/, { message: 'Năm phải có định dạng YYYY' })
  year?: string;
}
