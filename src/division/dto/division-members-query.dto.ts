import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum DivisionMembersSortByEnum {
  NAME = 'name',
  BIRTHDAY = 'birthday',
  JOIN_DATE = 'join_date',
}

export class DivisionMembersQueryDto {
  @ApiProperty({
    description: 'Số trang',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @ApiProperty({
    description: 'Tìm kiếm theo tên nhân viên',
    example: 'Nguyễn Văn A',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo team ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  team_id?: number;

  @ApiHideProperty()
  @IsOptional()
  roles?: string[];

  @ApiHideProperty()
  @IsOptional()
  current_user_id?: number;

  @ApiHideProperty()
  @IsOptional()
  is_admin?: boolean;

  @ApiProperty({
    description: 'Lọc theo vị trí ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position_id?: number;

  @ApiProperty({
    description: 'Lọc theo kỹ năng ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skill_id?: number;

  @ApiProperty({
    description: 'Sắp xếp theo trường (name, birthday, join_date)',
    example: DivisionMembersSortByEnum.NAME,
    enum: DivisionMembersSortByEnum,
    required: false,
  })
  @IsOptional()
  sort_by?: DivisionMembersSortByEnum;

  @ApiProperty({
    description: 'Thứ tự sắp xếp (asc, desc)',
    example: 'asc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  sort_order?: 'asc' | 'desc' = 'desc';
}
