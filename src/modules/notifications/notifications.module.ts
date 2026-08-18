import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { MessagingModule } from '@/modules/messaging';
import { BOOKING_REMINDER_QUEUE } from './notifications.constants';
import { BookingReminderProducerService } from './booking-reminder-producer.service';
import { BookingReminderProcessor } from './booking-reminder.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: BOOKING_REMINDER_QUEUE }),
    MessagingModule,
    forwardRef(() => BookingsModule),
  ],
  providers: [BookingReminderProducerService, BookingReminderProcessor],
  exports: [BookingReminderProducerService],
})
export class NotificationsModule {}
