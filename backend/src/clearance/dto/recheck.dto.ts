import { IsString, IsUUID, MinLength } from 'class-validator';

export class RecheckDto {
  @IsString()
  @IsUUID()
  stepId: string;

  @IsString()
  @MinLength(3)
  message: string;
}
