import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetHomeQueryDto {
  @ApiPropertyOptional({ description: 'User latitude for nearest-salons ordering' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: 'User longitude for nearest-salons ordering' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code (ignored; always returns INR)' })
  @IsOptional()
  @IsString()
  currency?: string;
}
