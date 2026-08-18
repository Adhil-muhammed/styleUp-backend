import { BookingMessagingContext } from '@/modules/bookings/domain/booking-messaging-context';

export const BOOKING_PAYMENT = Symbol('BOOKING_PAYMENT');

export interface BookingPaymentContext {
  bookingId: string;
  customerId: string;
  totalPricePaise: string;
  bookingStatus: string;
  paymentStatus: string;
}

export interface BookingPaymentPort {
  findPendingForPayment(
    bookingId: string,
    customerId: string,
  ): Promise<BookingPaymentContext | null>;

  findByBookingId(bookingId: string): Promise<BookingPaymentContext | null>;

  markBookingPaid(bookingId: string, customerId: string): Promise<void>;

  markBookingPaymentFailed(bookingId: string, customerId: string): Promise<void>;

  getPaymentStatus(
    bookingId: string,
    customerId: string,
  ): Promise<{ bookingStatus: string; paymentStatus: string } | null>;

  findMessagingContext(bookingId: string): Promise<BookingMessagingContext | null>;
}
