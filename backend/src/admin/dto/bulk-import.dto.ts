import {
  IsArray,
  IsNotEmpty,
  IsEmail,
  IsString,
  IsIn,
  IsOptional,
  ValidateIf,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role, UserStatus } from '../../../generated/prisma/enums';

const ADMIN_CREATABLE_ROLES = [Role.STUDENT, Role.STAFF] as const;
const VALID_STATUSES = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.SUSPENDED,
] as const;

export class BulkImportUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
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

  @ValidateIf((o: BulkImportUserDto) => o.role === Role.STAFF)
  @IsString()
  @IsNotEmpty({ message: 'Staff department is required for staff users' })
  @MaxLength(100, { message: 'Staff department cannot exceed 100 characters' })
  staffDepartment?: string;

  @ValidateIf((o: BulkImportUserDto) => o.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty({
    message: 'Student university ID is required for student users',
  })
  @MinLength(3, {
    message: 'Student university ID must be at least 3 characters long',
  })
  @MaxLength(50, {
    message: 'Student university ID cannot exceed 50 characters',
  })
  studentUniversityId?: string;

  @ValidateIf((o: BulkImportUserDto) => o.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty({ message: 'Student department is required for student users' })
  @MaxLength(100, {
    message: 'Student department cannot exceed 100 characters',
  })
  studentDepartment?: string;

  @ValidateIf((o: BulkImportUserDto) => o.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty({ message: 'Student year is required for student users' })
  @MaxLength(50, { message: 'Student year cannot exceed 50 characters' })
  studentYear?: string;

  @IsOptional()
  @IsIn(VALID_STATUSES as unknown as string[], {
    message: 'Invalid status specified',
  })
  status?: (typeof VALID_STATUSES)[number] = UserStatus.ACTIVE;
}

export class BulkImportDto {
  @IsArray({ message: 'Users must be provided as an array' })
  @IsNotEmpty({ message: 'At least one user must be provided' })
  users: BulkImportUserDto[];
}
