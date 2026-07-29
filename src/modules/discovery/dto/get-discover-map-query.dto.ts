import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class GetDiscoverMapQueryDto {
  @ApiProperty({ description: 'Map centre latitude' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiProperty({ description: 'Map centre longitude' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometres (default 10)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  radiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}
