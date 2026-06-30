import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

/** Standard API envelope — wrap every controller response */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

/** Cursor-based pagination metadata */
export interface CursorPageMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

/** Paginated list wrapper inside `data` */
export interface PaginatedData<T> {
  items: T[];
  page: CursorPageMeta;
}

/** Example item DTO — replace per domain */
export class BookingListItemDto {
  @IsString()
  id!: string;

  @IsString()
  scheduledAt!: string; // ISO 8601 UTC
}

/** Example paginated list response DTO */
export class PaginatedBookingsResponseDto implements ApiResponse<PaginatedData<BookingListItemDto>> {
  @IsBoolean()
  success!: boolean;

  @ValidateNested()
  @Type(() => Object)
  data!: PaginatedData<BookingListItemDto>;

  @IsOptional()
  @ValidateNested()
  error?: { code: string; message: string };
}
