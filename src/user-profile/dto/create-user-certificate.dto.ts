import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsInt } from 'class-validator';

export class CreateUserCertificateDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsInt()
  user_id: number;

  @ApiProperty({
    description: 'Tên chứng chỉ',
    example: 'AWS Certified Developer',
  })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Cơ quan cấp', example: 'Amazon Web Services' })
  @IsString()
  authority: string;

  @ApiProperty({ description: 'Ngày cấp', example: '2023-01-01' })
  @IsDateString()
  issued_at: string;
}
