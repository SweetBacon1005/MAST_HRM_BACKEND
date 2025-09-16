import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({
    description: 'URL avatar từ S3',
    example: 'https://bucket-name.s3.amazonaws.com/avatars/user-123.jpg',
  })
  @IsString()
  @IsUrl()
  avatar_url: string;
}
