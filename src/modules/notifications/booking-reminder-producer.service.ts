import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReminderOption, computeReminderFireAt } from '@/modules/bookings/domain/reminder-option';
import { BOOKING_REMINDER_QUEUE, BookingReminderJobData } from './notifications.constants';

@Injectable()
export class BookingReminderProducerService {
  private readonly logger = new Logger(BookingReminderProducerService.name);

  constructor(
    @InjectQueue(BOOKING_REMINDER_QUEUE) private readonly queue: Queue<BookingReminderJobData>,
  ) {}

  async scheduleReminder(
    bookingId: string,
    customerId: string,
    scheduledStart: Date,
    reminderOptionId: ReminderOption,
  ): Promise<void> {
    const fireAt = computeReminderFireAt(scheduledStart, reminderOptionId);
    const delayMs = fireAt.getTime() - Date.now();

    await this.cancelReminder(bookingId);

    if (delayMs <= 0) {
      this.logger.debug(`Skipping past reminder for booking ${bookingId}`);
      return;
    }

    await this.queue.add(
      'notify',
      { bookingId, customerId },
      {
        jobId: bookingId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    this.logger.debug(`Scheduled reminder for booking ${bookingId} in ${delayMs}ms`);
  }

  async cancelReminder(bookingId: string): Promise<void> {
    const job = await this.queue.getJob(bookingId);
    if (job) {
      await job.remove();
      this.logger.debug(`Cancelled reminder job for booking ${bookingId}`);
    }
  }
}
