import { ApiProperty } from '@nestjs/swagger';

export class FaceIdentifiedDto {
  @ApiProperty({
    description: 'ID người dùng được nhận diện',
    example: 123,
  })
  user_id: number;

  @ApiProperty({
    description: 'URL hình ảnh đã đăng ký',
    example: 'https://example.com/original.jpg',
  })
  registration_image_url: string;

  @ApiProperty({
    description: 'URL hình ảnh được chụp',
    example: 'https://example.com/uploaded.jpg',
  })
  captured_image_url: string;

  @ApiProperty({
    description: 'ID công khai của hình ảnh được chụp',
    example: 'public_id_123',
  })
  captured_image_public_id: string;

  @ApiProperty({
    description: 'Điểm tương đồng',
    example: 0.95,
  })
  similarity_score: number;
}
