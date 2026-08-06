import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepositoryPort,
} from '@/modules/bookings/ports/availability.repository.port';
import {
  BOOKING_REPOSITORY,
  BookingRepositoryPort,
} from '@/modules/bookings/ports/booking.repository.port';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepositoryPort,
} from '@/modules/bookings/ports/payment-method.repository.port';
import {
  GetAvailabilityQueryDto,
  PostBookingsQuoteDto,
  PostBookingsDto,
  PostBookingsPayDto,
} from '@/modules/bookings/dto';
import { PaymentsService } from '@/modules/payments/payments.service';
import {
  AvailabilityResult,
  BookingConfirmation,
  BookingCreated,
  BookingQuote,
  PaymentIntentResult,
  PaymentMethodsResult,
  PaymentStatusResult,
} from '@/shared/types';

const AVAILABILITY_LOOK_AHEAD_DAYS = 30;
const CURRENCY = 'INR';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepo: AvailabilityRepositoryPort,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: BookingRepositoryPort,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepositoryPort,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getAvailability(
    shopId: string,
    query: GetAvailabilityQueryDto,
  ): Promise<AvailabilityResult> {
    if (query.specialistId) {
      const belongs = await this.availabilityRepo.specialistBelongsToShop(
        shopId,
        query.specialistId,
      );
      if (!belongs) {
        throw new NotFoundException({
          code: 'SPECIALIST_UNAVAILABLE',
          message: 'Specialist not found at shop',
        });
      }
    }

    const availableDates = await this.availabilityRepo.getAvailableDates(
      shopId,
      query.dateYmd,
      AVAILABILITY_LOOK_AHEAD_DAYS,
    );

    const timeSlots = await this.availabilityRepo.getTimeSlots({
      shopId,
      dateYmd: query.dateYmd,
      specialistId: query.specialistId,
    });

    if (availableDates.length === 0 && timeSlots.length === 0) {
      throw new ConflictException({
        code: 'NO_SLOTS_AVAILABLE',
        message: 'Shop is closed or fully booked on this date',
      });
    }

    return { availableDates, timeSlots };
  }

  async computeQuote(dto: PostBookingsQuoteDto): Promise<BookingQuote> {
    const { shopId, selectedVariants, packageId, discoverServiceId, specialistId } = dto;
    if (specialistId) {
      const belongs = await this.availabilityRepo.specialistBelongsToShop(shopId, specialistId);
      console.log('belongs', belongs);

      if (!belongs) {
        throw new NotFoundException({
          code: 'SPECIALIST_UNAVAILABLE',
          message: 'Specialist not found at shop',
        });
      }
    }

    const shopServiceIds = this.collectShopServiceIds(selectedVariants, discoverServiceId);

    if (shopServiceIds.length === 0 && !packageId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'At least one service or package must be selected',
      });
    }

    const lines = await this.bookingRepo.resolveServiceLines(
      shopId,
      shopServiceIds,
      packageId ?? null,
    );

    if (lines.length === 0) {
      throw new NotFoundException({
        code: 'VARIANT_NOT_FOUND',
        message: 'One or more variants could not be found for this shop',
      });
    }

    const totalCents = lines.reduce((sum, l) => sum + Math.round(Number(l.pricePaise) / 100), 0);

    return {
      lineItems: lines.map((l) => ({
        label: l.label,
        amountCents: Math.round(Number(l.pricePaise) / 100),
      })),
      totalCents,
      currency: CURRENCY,
    };
  }

  /**
   * Creates a pending booking and returns its data.
   * The controller must respond with HTTP 402 (PAYMENT_REQUIRED) since payment
   * hasn't been captured yet — this is the normal happy-path for this endpoint.
   */
  async createBooking(customerId: string, dto: PostBookingsDto): Promise<BookingCreated> {
    const {
      shopId,
      selectedSpecialistId,
      selectedDateYmd,
      selectedTimeId,
      selectedVariants,
      packageId,
      paymentMethodId,
    } = dto;

    const belongs = await this.availabilityRepo.specialistBelongsToShop(
      shopId,
      selectedSpecialistId,
    );
    if (!belongs) {
      throw new NotFoundException({
        code: 'SPECIALIST_UNAVAILABLE',
        message: 'Specialist not found at shop',
      });
    }

    const paymentMethod = await this.paymentMethodRepo.findByIdForUser(paymentMethodId, customerId);
    if (!paymentMethod) {
      throw new NotFoundException({
        code: 'PAYMENT_METHOD_NOT_FOUND',
        message: 'Payment method not found',
      });
    }

    const shopServiceIds = this.collectShopServiceIds(selectedVariants, dto.discoverServiceId);

    if (shopServiceIds.length === 0 && !packageId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'At least one service or package must be selected',
      });
    }

    const lines = await this.bookingRepo.resolveServiceLines(
      shopId,
      shopServiceIds,
      packageId ?? null,
    );

    if (lines.length === 0) {
      throw new NotFoundException({
        code: 'VARIANT_NOT_FOUND',
        message: 'One or more variants could not be found for this shop',
      });
    }

    const scheduledStart = this.slotToDate(selectedDateYmd, selectedTimeId);
    const totalDurationMins = lines.reduce((sum, l) => sum + l.durationMinutes, 0);
    const scheduledEnd = new Date(scheduledStart.getTime() + totalDurationMins * 60_000);

    const slotTaken = await this.bookingRepo.isSlotTaken(
      selectedSpecialistId,
      scheduledStart,
      scheduledEnd,
    );
    if (slotTaken) {
      throw new ConflictException({
        code: 'SLOT_ALREADY_BOOKED',
        message: 'This time slot is no longer available',
      });
    }

    const doubleBooked = await this.bookingRepo.hasDoubleBooking(
      customerId,
      scheduledStart,
      scheduledEnd,
    );
    if (doubleBooked) {
      throw new ConflictException({
        code: 'DOUBLE_BOOKING',
        message: 'You already have a booking during this time',
      });
    }

    const totalPricePaise = lines.reduce((sum, l) => sum + l.pricePaise, BigInt(0));

    let itemStart = new Date(scheduledStart);
    const items = lines.map((l) => {
      const itemEnd = new Date(itemStart.getTime() + l.durationMinutes * 60_000);
      const item = {
        staffId: selectedSpecialistId,
        shopServiceId: l.shopServiceId,
        packageId: l.packageId,
        scheduledStart: new Date(itemStart),
        scheduledEnd: new Date(itemEnd),
        durationMinutes: l.durationMinutes,
        unitPricePaise: l.pricePaise,
      };
      itemStart = new Date(itemEnd);
      return item;
    });

    return this.bookingRepo.createBooking({
      shopId,
      customerId,
      scheduledStart,
      scheduledEnd,
      totalPricePaise,
      staffId: selectedSpecialistId,
      items,
    });
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethodsResult> {
    return this.paymentMethodRepo.listForUser(userId);
  }

  async payBooking(
    bookingId: string,
    customerId: string,
    dto: PostBookingsPayDto,
  ): Promise<PaymentIntentResult & { bookingId: string }> {
    const paymentMethod = await this.paymentMethodRepo.findByIdForUser(
      dto.paymentMethodId,
      customerId,
    );
    if (!paymentMethod) {
      throw new NotFoundException({
        code: 'PAYMENT_METHOD_NOT_FOUND',
        message: 'Payment method not found',
      });
    }

    const intent = await this.paymentsService.initiateUpiPayment(bookingId, customerId);
    return { bookingId, ...intent };
  }

  async getPaymentStatus(bookingId: string, customerId: string): Promise<PaymentStatusResult> {
    return this.paymentsService.getPaymentStatusForBooking(bookingId, customerId);
  }

  async getConfirmation(bookingId: string, customerId: string): Promise<BookingConfirmation> {
    const confirmation = await this.bookingRepo.getConfirmation(bookingId, customerId);
    if (!confirmation) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    return confirmation;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private collectShopServiceIds(
    selectedVariants?: Record<string, string>,
    discoverServiceId?: string,
  ): string[] {
    const ids = new Set<string>();
    if (selectedVariants) {
      for (const val of Object.values(selectedVariants)) {
        if (val) ids.add(val);
      }
    }
    if (discoverServiceId) {
      ids.add(discoverServiceId);
    }
    return [...ids];
  }

  /**
   * Converts `dateYmd` (YYYY-MM-DD) + `slotId` (HHmm) to a UTC Date,
   * treating the time as IST (UTC+5:30).
   */
  private slotToDate(dateYmd: string, slotId: string): Date {
    const hh = slotId.slice(0, 2);
    const mm = slotId.slice(2, 4);
    return new Date(`${dateYmd}T${hh}:${mm}:00+05:30`);
  }
}
