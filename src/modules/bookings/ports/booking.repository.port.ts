import { BookingConfirmation, BookingCreated, ResolvedServiceLine } from '@/shared/types';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface CreateBookingInput {
  shopId: string;
  customerId: string;
  /** ISO 8601 UTC datetime string. */
  scheduledStart: Date;
  scheduledEnd: Date;
  totalPricePaise: bigint;
  staffId: string;
  items: CreateBookingItemInput[];
}

export interface CreateBookingItemInput {
  staffId: string;
  shopServiceId: string | null;
  packageId: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  durationMinutes: number;
  unitPricePaise: bigint;
}

export interface BookingRepositoryPort {
  /**
   * Resolves variant / package line items for quote or booking creation.
   * Returns empty array when no ids are supplied.
   */
  resolveServiceLines(
    shopId: string,
    shopServiceIds: string[],
    packageId: string | null,
  ): Promise<ResolvedServiceLine[]>;

  /** Returns true when the staff already has an active booking_item overlapping the window. */
  isSlotTaken(staffId: string, start: Date, end: Date): Promise<boolean>;

  /**
   * Returns true when the customer already has a non-cancelled/no-show booking
   * whose time window overlaps [start, end).
   */
  hasDoubleBooking(customerId: string, start: Date, end: Date): Promise<boolean>;

  /**
   * Creates the bookings row, one booking_items row per service line, and the
   * initial booking_timeline 'created' entry — all in one transaction.
   */
  createBooking(input: CreateBookingInput): Promise<BookingCreated>;

  /** Fetches full booking data needed for the POST /bookings response. */
  findByIdForCustomer(bookingId: string, customerId: string): Promise<BookingCreated | null>;

  /** Returns the confirmation/receipt data for PaymentSuccess screen. */
  getConfirmation(bookingId: string, customerId: string): Promise<BookingConfirmation | null>;
}
