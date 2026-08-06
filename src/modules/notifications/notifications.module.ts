import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BOOKING_REMINDER_QUEUE } from './notifications.constants';
import { BookingReminderProducerService } from './booking-reminder-producer.service';
import { BookingReminderProcessor } from './booking-reminder.processor';

@Module({
  imports: [BullModule.registerQueue({ name: BOOKING_REMINDER_QUEUE })],
  providers: [BookingReminderProducerService, BookingReminderProcessor],
  exports: [BookingReminderProducerService],
})
export class NotificationsModule {}
