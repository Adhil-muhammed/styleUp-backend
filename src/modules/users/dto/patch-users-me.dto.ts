import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CustomerGender } from '@/infra/persistence/postgres/auth/auth.enums';

export class PatchUsersMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  displayName?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(64)
  nickname?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  dateOfBirth?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(64)
  country?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(CustomerGender)
  gender?: CustomerGender | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  address?: string | null;
}
