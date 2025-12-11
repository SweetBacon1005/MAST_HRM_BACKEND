import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({
    description: 'Tên kỹ năng',
    example: 'JavaScript',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Tên kỹ năng không được để trống' })
  @IsString({ message: 'Tên kỹ năng phải là chuỗi' })
  @MaxLength(255, { message: 'Tên kỹ năng không được vượt quá 255 ký tự' })
  name: string;

  @ApiProperty({
    description: 'ID của vị trí',
    example: 1,
  })
  @IsNotEmpty({ message: 'ID vị trí không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'ID vị trí phải là số nguyên' })
  @IsPositive({ message: 'ID vị trí phải là số dương' })
  position_id: number;
}
