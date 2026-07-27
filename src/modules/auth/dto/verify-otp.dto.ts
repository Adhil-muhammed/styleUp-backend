import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  otpSessionId!: string;

  @ApiProperty({ enum: ['verify', 'resend'] })
  @IsIn(['verify', 'resend'])
  action!: 'verify' | 'resend';

  @ApiPropertyOptional()
  @ValidateIf((dto: VerifyOtpDto) => dto.action === 'verify')
  @IsString()
  @MinLength(4)
  otp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}
