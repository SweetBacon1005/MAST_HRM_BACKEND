import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RemoteType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRemoteWorkRequestDto {
  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Ngày làm việc từ xa',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'Ngày làm việc là bắt buộc' })
  @IsDateString({}, { message: 'Ngày làm việc không hợp lệ' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value;
    }
    return value;
  })
  work_date: string;

  @ApiProperty({
    description: 'Loại làm việc từ xa',
    enum: RemoteType,
    example: RemoteType.REMOTE,
  })
  @IsNotEmpty({ message: 'Loại remote là bắt buộc' })
  @IsEnum(RemoteType, { message: 'Loại remote không hợp lệ' })
  remote_type: RemoteType;

  @ApiPropertyOptional({
    description: 'Lý do làm việc từ xa',
    example: 'Có việc gia đình cần xử lý',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Sẽ online đầy đủ trong giờ hành chính',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Ghi chú không được vượt quá 1000 ký tự' })
  note?: string;
}
