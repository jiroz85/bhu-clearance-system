import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

const ADMIN_CREATABLE_ROLES = [Role.STUDENT, Role.STAFF] as const;

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  password: string;

  @IsString()
  @MinLength(1)
  displayName: string;

  @IsIn(ADMIN_CREATABLE_ROLES as unknown as string[])
  role: (typeof ADMIN_CREATABLE_ROLES)[number];

  @IsOptional()
  @IsString()
  staffDepartment?: string;

  @IsOptional()
  @IsString()
  studentUniversityId?: string;

  @IsOptional()
  @IsString()
  studentDepartment?: string;

  @IsOptional()
  @IsString()
  studentYear?: string;
}
