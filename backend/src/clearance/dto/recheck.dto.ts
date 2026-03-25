import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RecheckDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsString()
  @MinLength(3)
  message: string;
}
