import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AdminOverrideDto {
  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  reason: string;
}

