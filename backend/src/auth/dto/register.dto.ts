import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(160, { message: 'Display name cannot exceed 160 characters' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, {
    message: 'Student university ID must be at least 3 characters long',
  })
  @MaxLength(64, {
    message: 'Student university ID cannot exceed 64 characters',
  })
  studentUniversityId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: 'Student department must be at least 2 characters long',
  })
  @MaxLength(160, {
    message: 'Student department cannot exceed 160 characters',
  })
  studentDepartment?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Student year must be at least 1 character long' })
  @MaxLength(32, { message: 'Student year cannot exceed 32 characters' })
  studentYear?: string;
}
