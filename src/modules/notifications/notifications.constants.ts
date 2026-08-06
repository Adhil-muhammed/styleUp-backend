export const BOOKING_REMINDER_QUEUE = 'booking-reminder';

export interface BookingReminderJobData {
  bookingId: string;
  customerId: string;
}
