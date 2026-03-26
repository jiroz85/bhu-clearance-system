import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

const ADMIN_CREATABLE_ROLES = [Role.STUDENT, Role.STAFF] as const;

export class BulkImportUserDto {
  @IsEmail()
  email: string;

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

export class BulkImportDto {
  users: BulkImportUserDto[];
}
