import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString } from 'class-validator';

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

  @ApiProperty({ description: 'Ngày bắt đầu', example: '2023-01-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Loại chứng chỉ', example: 'ACHIEVEMENT' })
  @IsString()
  type: CerticicateType;

  @ApiProperty({ description: 'ID chứng chỉ', example: 1 })
  @IsInt()
  certificate_id: number;
}

export enum CerticicateType {
  ACHIEVEMENT = 'ACHIEVEMENT',
  CERTIFICATE = 'CERTIFICATE',
}
