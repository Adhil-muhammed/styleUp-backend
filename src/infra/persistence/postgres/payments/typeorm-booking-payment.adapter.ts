import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { BookingTimelineEntity } from '@/infra/persistence/postgres/transactions/booking-timeline.entity';
import {
  BookingStatus,
  BookingPaymentStatus,
  BookingItemStatus,
  TimelineEventType,
} from '@/infra/persistence/postgres/transactions/transactions.enums';
import {
  BookingPaymentContext,
  BookingPaymentPort,
} from '@/modules/payments/ports/booking-payment.port';
import { BookingMessagingContext } from '@/modules/bookings/domain/booking-messaging-context';

@Injectable()
export class TypeOrmBookingPaymentAdapter implements BookingPaymentPort {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingItemEntity)
    private readonly bookingItemRepo: Repository<BookingItemEntity>,
    @InjectRepository(BookingTimelineEntity)
    private readonly timelineRepo: Repository<BookingTimelineEntity>,
  ) {}

  async findPendingForPayment(
    bookingId: string,
    customerId: string,
  ): Promise<BookingPaymentContext | null> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId, customerId } });
    if (!booking) return null;

    return this.toContext(booking);
  }

  async findByBookingId(bookingId: string): Promise<BookingPaymentContext | null> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) return null;

    return this.toContext(booking);
  }

  private toContext(booking: BookingEntity): BookingPaymentContext {
    return {
      bookingId: booking.id,
      customerId: booking.customerId,
      totalPricePaise: booking.totalPricePaise,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
    };
  }

  async markBookingPaid(bookingId: string, customerId: string): Promise<void> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId, customerId } });
    if (!booking) throw new Error('BOOKING_NOT_FOUND');
    if (booking.paymentStatus === BookingPaymentStatus.PAID) return;

    await this.bookingRepo.update(
      { id: bookingId, customerId },
      {
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID,
      },
    );

    await this.bookingItemRepo.update({ bookingId }, { itemStatus: BookingItemStatus.CONFIRMED });

    await this.timelineRepo.save(
      this.timelineRepo.create({
        bookingId,
        eventType: TimelineEventType.CONFIRMED,
        note: null,
      }),
    );
  }

  async markBookingPaymentFailed(bookingId: string, customerId: string): Promise<void> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId, customerId } });
    if (!booking) throw new Error('BOOKING_NOT_FOUND');
    if (booking.paymentStatus === BookingPaymentStatus.PAID) return;

    await this.bookingRepo.update(
      { id: bookingId, customerId },
      { paymentStatus: BookingPaymentStatus.FAILED },
    );
  }

  async getPaymentStatus(
    bookingId: string,
    customerId: string,
  ): Promise<{ bookingStatus: string; paymentStatus: string } | null> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, customerId },
      select: ['bookingStatus', 'paymentStatus'],
    });
    if (!booking) return null;

    return {
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
    };
  }

  async findMessagingContext(bookingId: string): Promise<BookingMessagingContext | null> {
    type MessagingRow = {
      booking_id: string;
      shop_id: string;
      scheduled_start: Date;
      display_name: string | null;
      phone: string | null;
      shop_name: string | null;
    };

    const rows = await this.bookingRepo.query<MessagingRow[]>(
      `SELECT b.id AS booking_id,
              b.shop_id,
              b.scheduled_start,
              c.display_name,
              u.phone,
              s.name AS shop_name
       FROM bookings b
       JOIN customers c ON c.user_id = b.customer_id
       JOIN users u ON u.id = c.user_id
       JOIN shops s ON s.id = b.shop_id
       WHERE b.id = $1`,
      [bookingId],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    const recipient = row.phone?.trim() ?? '';
    if (!recipient) {
      return null;
    }

    return {
      bookingId: row.booking_id,
      shopId: row.shop_id,
      recipient,
      customerName: row.display_name ?? '',
      shopName: row.shop_name ?? '',
      scheduledStart: row.scheduled_start,
    };
  }
}
