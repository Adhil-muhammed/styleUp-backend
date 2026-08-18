import { BookingMessagingContext } from '@/modules/bookings/domain/booking-messaging-context';
import { formatIstDateTime } from '@/modules/bookings/domain/format-ist-datetime';

export type BookingMessageTemplateKind = 'confirmation' | 'reminder' | 'cancellation';

export function buildBookingMessageVariables(
  context: BookingMessagingContext,
  kind: BookingMessageTemplateKind,
  paymentRef?: string,
): Record<string, string> {
  const dateTime = formatIstDateTime(context.scheduledStart);
  const variables: Record<string, string> = {
    '1': context.customerName,
    '2': context.shopName,
    '3': dateTime,
  };

  if (kind === 'confirmation' && paymentRef) {
    variables['4'] = paymentRef;
  }

  if (kind === 'cancellation') {
    variables['4'] = 'Refund will be processed as per shop policy';
  }

  return variables;
}
