import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetAvailabilityQueryDto {
  /** Required: ISO date string YYYY-MM-DD (in Asia/Kolkata context). */
  @IsDateString()
  dateYmd!: string;

  @IsOptional()
  @IsUUID()
  specialistId?: string;

  /**
   * Variant IDs selected by the user (used for duration estimation).
   * Accepted as a comma-separated string from the query param.
   * Not used in v1 availability computation — reserved for future slot-duration refinement.
   */
  @IsOptional()
  @IsString({ each: true })
  variantIds?: string[];
}
