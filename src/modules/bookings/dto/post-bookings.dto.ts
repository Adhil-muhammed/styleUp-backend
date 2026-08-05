import { IsDateString, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class PostBookingsDto {
  @IsUUID()
  shopId!: string;

  @IsOptional()
  @IsString()
  shopPinId?: string | null;

  @IsOptional()
  @IsUUID()
  discoverServiceId?: string;

  @IsOptional()
  @IsUUID()
  bookServiceId?: string;

  @IsOptional()
  @IsString()
  timeFilterId?: string;

  @IsOptional()
  @IsString()
  profileId?: string;

  /** YYYY-MM-DD in Asia/Kolkata context. */
  @IsDateString()
  selectedDateYmd!: string;

  /** Slot id from the availability endpoint (HHmm format, e.g. "0900"). */
  @IsString()
  selectedTimeId!: string;

  @IsUUID()
  selectedSpecialistId!: string;

  /**
   * Map of categoryId → shopServiceId.
   * Exactly one of selectedVariants / packageId must be supplied.
   */
  @IsOptional()
  @IsObject()
  selectedVariants?: Record<string, string>;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsUUID()
  paymentMethodId!: string;
}
