import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { buildBookingMessageVariables } from '@/modules/bookings/domain/build-booking-message-variables';
import {
  BOOKING_REPOSITORY,
  BookingRepositoryPort,
} from '@/modules/bookings/ports/booking.repository.port';
import {
  MESSAGING_DISPATCH,
  MessagingDispatchPort,
} from '@/modules/messaging/ports/messaging-dispatch.port';
import { BOOKING_REMINDER_QUEUE, BookingReminderJobData } from './notifications.constants';

@Processor(BOOKING_REMINDER_QUEUE)
export class BookingReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingReminderProcessor.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: BookingRepositoryPort,
    @Inject(MESSAGING_DISPATCH) private readonly messagingDispatch: MessagingDispatchPort,
  ) {
    super();
  }

  async process(job: Job<BookingReminderJobData>): Promise<void> {
    const { bookingId, customerId } = job.data;

    try {
      const context = await this.bookingRepo.findMessagingContext(bookingId);
      if (!context) {
        this.logger.warn(
          `Reminder skipped for booking ${bookingId} (customer ${customerId}): no phone on file`,
        );
        return;
      }

      const result = await this.messagingDispatch.sendBookingReminder({
        shopId: context.shopId,
        bookingId: context.bookingId,
        recipient: context.recipient,
        variables: buildBookingMessageVariables(context, 'reminder'),
      });

      this.logger.log(
        `Reminder WhatsApp queued for booking ${bookingId} (customer ${customerId}, log ${result.logId})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown reminder dispatch error';
      this.logger.error(`Reminder dispatch failed for booking ${bookingId}: ${message}`);
      throw error;
    }
  }
}
