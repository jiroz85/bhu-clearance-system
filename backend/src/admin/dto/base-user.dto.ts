import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Role, UserStatus } from '../../../generated/prisma/enums';

const ADMIN_CREATABLE_ROLES = [Role.STUDENT, Role.STAFF] as const;
const VALID_STATUSES = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.SUSPENDED,
] as const;

// Base validation fields that can be reused
export class BaseUserValidationDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password?: string;

  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Display name cannot exceed 100 characters' })
  displayName: string;

  @IsIn(ADMIN_CREATABLE_ROLES as unknown as string[], {
    message: 'Invalid role specified',
  })
  role: (typeof ADMIN_CREATABLE_ROLES)[number];

  @ValidateIf((o: BaseUserValidationDto) => o.role === Role.STAFF)
  @IsString()
  @IsNotEmpty({ message: 'Staff department is required for staff users' })
  @MaxLength(100, { message: 'Staff department cannot exceed 100 characters' })
  staffDepartment?: string;

  @ValidateIf((o: BaseUserValidationDto) => o.role === Role.STUDENT)
  @IsString()
  @MinLength(3, {
    message: 'Student university ID must be at least 3 characters long',
  })
  @MaxLength(50, {
    message: 'Student university ID cannot exceed 50 characters',
  })
  studentUniversityId?: string;

  @ValidateIf((o: BaseUserValidationDto) => o.role === Role.STUDENT)
  @IsString()
  @MaxLength(100, {
    message: 'Student department cannot exceed 100 characters',
  })
  studentDepartment?: string;

  @ValidateIf((o: BaseUserValidationDto) => o.role === Role.STUDENT)
  @IsString()
  @MaxLength(50, { message: 'Student year cannot exceed 50 characters' })
  studentYear?: string;

  @IsOptional()
  @IsIn(VALID_STATUSES as unknown as string[], {
    message: 'Invalid status specified',
  })
  status?: (typeof VALID_STATUSES)[number] = UserStatus.ACTIVE;
}
