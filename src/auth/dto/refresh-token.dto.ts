import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'ID của user',
    example: 1,
  })
  @IsNumber({}, { message: 'User ID phải là số' })
  userId: number;

  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token phải là chuỗi' })
  refresh_token: string;
}
