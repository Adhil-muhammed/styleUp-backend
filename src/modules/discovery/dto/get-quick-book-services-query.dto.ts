import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetQuickBookServicesQueryDto {
  @ApiProperty({ description: 'User latitude (required)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiProperty({ description: 'User longitude (required)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ description: 'Specific shop UUID; omit for nearest shop' })
  @IsOptional()
  @IsUUID()
  @IsString()
  shopId?: string;
}
