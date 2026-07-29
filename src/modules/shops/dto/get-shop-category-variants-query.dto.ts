import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetShopCategoryVariantsQueryDto {
  @ApiProperty({ enum: ['man', 'woman'] })
  @IsIn(['man', 'woman'])
  gender!: 'man' | 'woman';

  @ApiPropertyOptional({ description: 'ISO 4217 currency code (ignored; always returns INR)' })
  @IsOptional()
  @IsString()
  currency?: string;
}
