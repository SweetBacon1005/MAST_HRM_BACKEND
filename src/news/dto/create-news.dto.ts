import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateNewsDto {
  @ApiProperty({
    description: 'Tiêu đề tin tức',
    example: 'Thông báo nghỉ lễ Quốc khánh 2/9',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MinLength(1, { message: 'Tiêu đề phải có ít nhất 1 ký tự' })
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
  title: string;

  @ApiProperty({
    description: 'Nội dung tin tức (HTML)',
    example: '<p>Công ty thông báo lịch nghỉ lễ Quốc khánh từ ngày <strong>2/9 đến 4/9</strong>.</p><p>Các bạn nhân viên lưu ý sắp xếp công việc phù hợp.</p>',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;
}

