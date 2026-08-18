export const MESSAGING_DISPATCH = Symbol('MESSAGING_DISPATCH');

export type MessageTemplateType =
  'booking_confirmation' | 'booking_reminder' | 'booking_cancellation';

export interface SendBookingMessageInput {
  shopId: string;
  bookingId: string;
  recipient: string;
  variables: Record<string, string>;
}

export interface MessagingDispatchPort {
  sendBookingConfirmation(input: SendBookingMessageInput): Promise<{ logId: string }>;
  sendBookingReminder(input: SendBookingMessageInput): Promise<{ logId: string }>;
  sendBookingCancellation(input: SendBookingMessageInput): Promise<{ logId: string }>;
}
