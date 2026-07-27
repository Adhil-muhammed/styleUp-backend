import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpMethod } from '@/modules/auth/domain/types';

export class RequestOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @MinLength(3)
  contact!: string;

  @ApiProperty({ enum: ['email', 'sms'] })
  @IsIn(['email', 'sms'])
  method!: OtpMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}
