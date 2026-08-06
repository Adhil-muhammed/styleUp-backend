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
}
