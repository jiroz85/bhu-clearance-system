import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class ReviewStepDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @MinLength(2, { message: 'Comment is required' })
  comment: string;

  @ValidateIf((o: ReviewStepDto) => o.status === 'REJECTED')
  @IsString()
  @MinLength(2, { message: 'Rejection reason is required' })
  reason?: string;

  @ValidateIf((o: ReviewStepDto) => o.status === 'REJECTED')
  @IsString()
  @MinLength(2, { message: 'Instruction for the student is required' })
  instruction?: string;
}
