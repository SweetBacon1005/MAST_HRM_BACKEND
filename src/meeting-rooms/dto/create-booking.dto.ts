import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  room_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Date)
  start_time!: Date;

  @Type(() => Date)
  end_time!: Date;
}
