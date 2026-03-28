import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export class ReviewStepDto {
  @IsIn(['APPROVED', 'REJECTED'], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsNotEmpty({ message: 'Comment is required' })
  @MinLength(2, { message: 'Comment must be at least 2 characters long' })
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters' })
  comment: string;

  @ValidateIf((o: ReviewStepDto) => o.status === 'REJECTED')
  @IsString()
  @IsNotEmpty({
    message: 'Rejection reason is required when status is REJECTED',
  })
  @MinLength(2, {
    message: 'Rejection reason must be at least 2 characters long',
  })
  @MaxLength(500, { message: 'Rejection reason cannot exceed 500 characters' })
  reason?: string;

  @ValidateIf((o: ReviewStepDto) => o.status === 'REJECTED')
  @IsString()
  @IsNotEmpty({ message: 'Instruction is required when status is REJECTED' })
  @MinLength(2, { message: 'Instruction must be at least 2 characters long' })
  @MaxLength(500, { message: 'Instruction cannot exceed 500 characters' })
  instruction?: string;
}
