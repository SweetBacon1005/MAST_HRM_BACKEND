import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateNewsDto } from './create-news.dto';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {
  @ApiProperty({
    description: 'Tiêu đề tin tức',
    example: 'Thông báo nghỉ lễ Quốc khánh 2/9 (Cập nhật)',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Nội dung tin tức (HTML)',
    example: '<p>Công ty thông báo lịch nghỉ lễ Quốc khánh từ ngày <strong>2/9 đến 4/9</strong>.</p><p>Các bạn nhân viên lưu ý sắp xếp công việc phù hợp.</p><p><em>Cập nhật: Thêm thông tin về ca trực.</em></p>',
    required: false,
  })
  content?: string;
}

