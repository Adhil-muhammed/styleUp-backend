export interface BookingMessagingContext {
  shopId: string;
  bookingId: string;
  recipient: string;
  customerName: string;
  shopName: string;
  scheduledStart: Date;
}
