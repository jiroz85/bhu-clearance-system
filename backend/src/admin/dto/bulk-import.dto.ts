import { ValidateNested, IsArray, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseUserValidationDto } from './base-user.dto';

export class BulkImportUserDto extends BaseUserValidationDto {}

export class BulkImportDto {
  @IsArray({ message: 'Users must be provided as an array' })
  @IsNotEmpty({ message: 'At least one user must be provided' })
  @ValidateNested({ each: true, message: 'Each user entry must be valid' })
  @Type(() => BulkImportUserDto)
  users: BulkImportUserDto[];
}
