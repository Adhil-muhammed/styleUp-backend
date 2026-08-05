import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class PostBookingsQuoteDto {
  @IsUUID()
  shopId!: string;

  /**
   * Map of categoryId → shopServiceId.
   * At least one of selectedVariants / packageId / discoverServiceId must be supplied.
   */
  @IsOptional()
  @IsObject()
  selectedVariants?: Record<string, string>;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  /** Treated as a shopServiceId when provided. */
  @IsOptional()
  @IsUUID()
  discoverServiceId?: string;

  @IsOptional()
  @IsUUID()
  specialistId?: string;
}
