import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class AddProjectMemberDto {
  @ApiProperty({
    description: 'ID của user cần thêm vào dự án',
    example: 5,
  })
  @IsInt()
  @IsNotEmpty()
  user_id: number;
}
