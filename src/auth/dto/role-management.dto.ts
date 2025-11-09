import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'ID của role mới',
    example: 2,
  })
  @IsNumber()
  roleId: number;

}

