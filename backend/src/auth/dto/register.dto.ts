import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  studentUniversityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  studentDepartment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  studentYear?: string;
}
