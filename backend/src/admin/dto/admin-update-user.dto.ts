import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma/enums';
import { UserStatus } from '../../../generated/prisma/enums';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

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
