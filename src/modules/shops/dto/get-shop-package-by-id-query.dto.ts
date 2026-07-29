import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetShopPackageByIdQueryDto {
  @ApiPropertyOptional({ description: 'ISO 4217 currency code (ignored; always returns INR)' })
  @IsOptional()
  @IsString()
  currency?: string;
}
