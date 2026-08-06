import {
  BookingConfirmation,
  BookingCreated,
  BookingListTab,
  BookingReminderResult,
  BookingCancelledResult,
  PaginatedBookings,
  ResolvedServiceLine,
} from '@/shared/types';

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

export interface OwnedBookingRow {
  id: string;
  customerId: string;
  scheduledStart: Date;
  bookingStatus: string;
  paymentStatus: string;
  reminderEnabled: boolean;
  reminderOptionId: string | null;
  cancelledAt: Date | null;
}

export interface ListBookingsInput {
  customerId: string;
  tab: BookingListTab;
  page: number;
  perPage: number;
}

export interface UpdateReminderInput {
  bookingId: string;
  customerId: string;
  reminderEnabled: boolean;
  reminderOptionId: string | null;
}

export interface BookingRepositoryPort {
  resolveServiceLines(
    shopId: string,
    shopServiceIds: string[],
    packageId: string | null,
  ): Promise<ResolvedServiceLine[]>;

  isSlotTaken(staffId: string, start: Date, end: Date): Promise<boolean>;

  hasDoubleBooking(customerId: string, start: Date, end: Date): Promise<boolean>;

  createBooking(input: CreateBookingInput): Promise<BookingCreated>;

  findByIdForCustomer(bookingId: string, customerId: string): Promise<BookingCreated | null>;

  getConfirmation(bookingId: string, customerId: string): Promise<BookingConfirmation | null>;

  listForCustomer(input: ListBookingsInput): Promise<PaginatedBookings>;

  findOwnedById(bookingId: string, customerId: string): Promise<OwnedBookingRow | null>;

  updateReminder(input: UpdateReminderInput): Promise<BookingReminderResult | null>;

  cancelBooking(bookingId: string, customerId: string): Promise<BookingCancelledResult | null>;
}
