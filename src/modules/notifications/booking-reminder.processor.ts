import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BOOKING_REMINDER_QUEUE, BookingReminderJobData } from './notifications.constants';

@Processor(BOOKING_REMINDER_QUEUE)
export class BookingReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingReminderProcessor.name);

  async process(job: Job<BookingReminderJobData>): Promise<void> {
    const { bookingId, customerId } = job.data;
    // Push notification dispatch will plug in here when the notifications channel exists.
    this.logger.log(`Reminder fired for booking ${bookingId} (customer ${customerId})`);
  }
}
