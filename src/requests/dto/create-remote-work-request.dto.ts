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

  @ApiProperty({
    description: 'Tiêu đề đơn xin làm từ xa',
    example: 'Xin làm việc từ xa do có việc gia đình',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
  title: string;

  @ApiPropertyOptional({
    description: 'Lý do làm việc từ xa',
    example: 'Có việc gia đình cần xử lý',
  })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  reason?: string;
}
