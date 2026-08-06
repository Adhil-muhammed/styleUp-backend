import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
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
import { BookingsService } from './bookings.service';
import { PaymentsService } from '@/modules/payments/payments.service';
import { BookingReminderProducerService } from '@/modules/notifications/booking-reminder-producer.service';
import { ReminderOption } from '@/modules/bookings/domain/reminder-option';
import type {
  BookingConfirmation,
  BookingCreated,
  PaymentMethodItem,
  PaymentMethodsResult,
  ResolvedServiceLine,
  TimeSlot,
} from '@/shared/types';

type AvailMock = { [K in keyof AvailabilityRepositoryPort]: jest.Mock };
type BookingMock = { [K in keyof BookingRepositoryPort]: jest.Mock };
type PaymentMethodMock = { [K in keyof PaymentMethodRepositoryPort]: jest.Mock };

function makeAvailMock(): AvailMock {
  return {
    getAvailableDates: jest.fn(),
    getTimeSlots: jest.fn(),
    specialistBelongsToShop: jest.fn(),
  };
}

function makeBookingMock(): BookingMock {
  return {
    resolveServiceLines: jest.fn(),
    isSlotTaken: jest.fn(),
    hasDoubleBooking: jest.fn(),
    createBooking: jest.fn(),
    findByIdForCustomer: jest.fn(),
    getConfirmation: jest.fn(),
    listForCustomer: jest.fn(),
    findOwnedById: jest.fn(),
    updateReminder: jest.fn(),
    cancelBooking: jest.fn(),
  };
}

const mockReminderProducer = {
  scheduleReminder: jest.fn(),
  cancelReminder: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'booking.cancelMinHoursBefore') return 2;
    return undefined;
  }),
};

function makePaymentMethodMock(): PaymentMethodMock {
  return {
    listForUser: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
  };
}

const mockPaymentsService = {
  initiateUpiPayment: jest.fn(),
  getPaymentStatusForBooking: jest.fn(),
};

const SHOP_ID = 'shop-uuid';
const SPECIALIST_ID = 'staff-uuid';
const BOOKING_ID = 'booking-uuid';
const CUSTOMER_ID = 'customer-uuid';
const PAYMENT_METHOD_ID = 'pm-uuid';

const mockTimeSlots: TimeSlot[] = [
  { id: '0900', label: '9:00 AM' },
  { id: '0930', label: '9:30 AM' },
];

const mockPaymentMethod: PaymentMethodItem = {
  id: PAYMENT_METHOD_ID,
  kind: 'google_pay',
  label: 'Google Pay',
};

const mockServiceLine: ResolvedServiceLine = {
  label: "Classic Men's Haircut",
  shopServiceId: 'ss-uuid',
  packageId: null,
  pricePaise: BigInt(30000),
  durationMinutes: 30,
};

const mockBookingCreated: BookingCreated = {
  bookingId: BOOKING_ID,
  status: 'pending',
  quote: {
    lineItems: [{ label: "Classic Men's Haircut", amountCents: 300 }],
    totalCents: 300,
    currency: 'INR',
  },
  customer: { name: 'Adhil', phone: '+919876543210' },
  bookingDetails: [{ label: 'Shop', value: "Meera's Cuts" }],
};

describe('BookingsService', () => {
  let service: BookingsService;
  let availMock: AvailMock;
  let bookingMock: BookingMock;
  let pmMock: PaymentMethodMock;

  beforeEach(async () => {
    availMock = makeAvailMock();
    bookingMock = makeBookingMock();
    pmMock = makePaymentMethodMock();

    const module = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: AVAILABILITY_REPOSITORY, useValue: availMock },
        { provide: BOOKING_REPOSITORY, useValue: bookingMock },
        { provide: PAYMENT_METHOD_REPOSITORY, useValue: pmMock },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: BookingReminderProducerService, useValue: mockReminderProducer },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  // ---------------------------------------------------------------------------
  // getAvailability
  // ---------------------------------------------------------------------------

  describe('getAvailability', () => {
    it('throws SPECIALIST_UNAVAILABLE when specialist not at shop', async () => {
      availMock.specialistBelongsToShop.mockResolvedValue(false);

      await expect(
        service.getAvailability(SHOP_ID, { dateYmd: '2026-08-01', specialistId: SPECIALIST_ID }),
      ).rejects.toMatchObject({ status: 404, response: { code: 'SPECIALIST_UNAVAILABLE' } });
    });

    it('throws NO_SLOTS_AVAILABLE when shop closed and no slots', async () => {
      availMock.getAvailableDates.mockResolvedValue([]);
      availMock.getTimeSlots.mockResolvedValue([]);

      await expect(
        service.getAvailability(SHOP_ID, { dateYmd: '2026-08-01' }),
      ).rejects.toMatchObject({ status: 409, response: { code: 'NO_SLOTS_AVAILABLE' } });
    });

    it('returns availableDates and timeSlots', async () => {
      availMock.getAvailableDates.mockResolvedValue(['2026-08-01', '2026-08-02']);
      availMock.getTimeSlots.mockResolvedValue(mockTimeSlots);

      const result = await service.getAvailability(SHOP_ID, { dateYmd: '2026-08-01' });

      expect(result.availableDates).toHaveLength(2);
      expect(result.timeSlots).toEqual(mockTimeSlots);
    });
  });

  // ---------------------------------------------------------------------------
  // computeQuote
  // ---------------------------------------------------------------------------

  describe('computeQuote', () => {
    it('throws VALIDATION_ERROR when no services selected', async () => {
      await expect(service.computeQuote({ shopId: SHOP_ID })).rejects.toMatchObject({
        status: 400,
        response: { code: 'VALIDATION_ERROR' },
      });
    });

    it('throws VALIDATION_ERROR when selectedVariants is empty object', async () => {
      bookingMock.resolveServiceLines.mockResolvedValue([]);

      await expect(
        service.computeQuote({ shopId: SHOP_ID, selectedVariants: {} }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws VARIANT_NOT_FOUND when service lines resolve to empty', async () => {
      bookingMock.resolveServiceLines.mockResolvedValue([]);

      await expect(
        service.computeQuote({ shopId: SHOP_ID, selectedVariants: { 'cat-1': 'ss-1' } }),
      ).rejects.toMatchObject({ status: 404, response: { code: 'VARIANT_NOT_FOUND' } });
    });

    it('returns quote with INR currency', async () => {
      bookingMock.resolveServiceLines.mockResolvedValue([mockServiceLine]);

      const result = await service.computeQuote({
        shopId: SHOP_ID,
        selectedVariants: { 'cat-1': 'ss-uuid' },
      });

      expect(result.currency).toBe('INR');
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0]?.label).toBe("Classic Men's Haircut");
      expect(result.totalCents).toBe(300);
    });

    it('sums multiple line items correctly', async () => {
      const line2: ResolvedServiceLine = {
        label: 'Beard Trim',
        shopServiceId: 'ss-2',
        packageId: null,
        pricePaise: BigInt(20000),
        durationMinutes: 15,
      };
      bookingMock.resolveServiceLines.mockResolvedValue([mockServiceLine, line2]);

      const result = await service.computeQuote({
        shopId: SHOP_ID,
        selectedVariants: { 'cat-1': 'ss-uuid', 'cat-2': 'ss-2' },
      });

      expect(result.totalCents).toBe(500);
      expect(result.lineItems).toHaveLength(2);
    });

    it('throws SPECIALIST_UNAVAILABLE when specialistId does not belong to shop', async () => {
      availMock.specialistBelongsToShop.mockResolvedValue(false);

      await expect(
        service.computeQuote({
          shopId: SHOP_ID,
          selectedVariants: { 'cat-1': 'ss-uuid' },
          specialistId: SPECIALIST_ID,
        }),
      ).rejects.toMatchObject({ status: 404, response: { code: 'SPECIALIST_UNAVAILABLE' } });

      expect(bookingMock.resolveServiceLines).not.toHaveBeenCalled();
    });

    it('returns quote when specialistId belongs to shop', async () => {
      availMock.specialistBelongsToShop.mockResolvedValue(true);
      bookingMock.resolveServiceLines.mockResolvedValue([mockServiceLine]);

      const result = await service.computeQuote({
        shopId: SHOP_ID,
        selectedVariants: { 'cat-1': 'ss-uuid' },
        specialistId: SPECIALIST_ID,
      });

      expect(availMock.specialistBelongsToShop).toHaveBeenCalledWith(SHOP_ID, SPECIALIST_ID);
      expect(result.currency).toBe('INR');
      expect(result.totalCents).toBe(300);
    });
  });

  // ---------------------------------------------------------------------------
  // createBooking
  // ---------------------------------------------------------------------------

  describe('createBooking', () => {
    const baseDto = {
      shopId: SHOP_ID,
      selectedSpecialistId: SPECIALIST_ID,
      selectedDateYmd: '2026-08-01',
      selectedTimeId: '0900',
      selectedVariants: { 'cat-1': 'ss-uuid' },
      paymentMethodId: PAYMENT_METHOD_ID,
    };

    beforeEach(() => {
      availMock.specialistBelongsToShop.mockResolvedValue(true);
      pmMock.findByIdForUser.mockResolvedValue(mockPaymentMethod);
      bookingMock.resolveServiceLines.mockResolvedValue([mockServiceLine]);
      bookingMock.isSlotTaken.mockResolvedValue(false);
      bookingMock.hasDoubleBooking.mockResolvedValue(false);
      bookingMock.createBooking.mockResolvedValue(mockBookingCreated);
    });

    it('throws SPECIALIST_UNAVAILABLE when not at shop', async () => {
      availMock.specialistBelongsToShop.mockResolvedValue(false);

      await expect(service.createBooking(CUSTOMER_ID, baseDto)).rejects.toMatchObject({
        status: 404,
        response: { code: 'SPECIALIST_UNAVAILABLE' },
      });
    });

    it('throws SLOT_ALREADY_BOOKED on conflict', async () => {
      bookingMock.isSlotTaken.mockResolvedValue(true);

      await expect(service.createBooking(CUSTOMER_ID, baseDto)).rejects.toMatchObject({
        status: 409,
        response: { code: 'SLOT_ALREADY_BOOKED' },
      });
    });

    it('throws DOUBLE_BOOKING when customer has overlapping booking', async () => {
      bookingMock.hasDoubleBooking.mockResolvedValue(true);

      await expect(service.createBooking(CUSTOMER_ID, baseDto)).rejects.toMatchObject({
        status: 409,
        response: { code: 'DOUBLE_BOOKING' },
      });
    });

    it('throws VALIDATION_ERROR when no services selected', async () => {
      await expect(
        service.createBooking(CUSTOMER_ID, {
          ...baseDto,
          selectedVariants: undefined,
          packageId: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns booking created data on success', async () => {
      const result = await service.createBooking(CUSTOMER_ID, baseDto);

      expect(result.bookingId).toBe(BOOKING_ID);
      expect(result.status).toBe('pending');
      expect(result.quote.currency).toBe('INR');
      expect(bookingMock.createBooking).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // payBooking
  // ---------------------------------------------------------------------------

  describe('payBooking', () => {
    const dto = { paymentMethodId: PAYMENT_METHOD_ID };

    beforeEach(() => {
      pmMock.findByIdForUser.mockResolvedValue(mockPaymentMethod);
      mockPaymentsService.initiateUpiPayment.mockResolvedValue({
        paymentId: 'pay-uuid',
        razorpayOrderId: 'order_mock_1',
        razorpayKeyId: 'rzp_test_mock_key',
        amountPaise: 30000,
        currency: 'INR',
        status: 'processing',
      });
    });

    it('throws PAYMENT_METHOD_NOT_FOUND when method missing', async () => {
      pmMock.findByIdForUser.mockResolvedValue(null);

      await expect(service.payBooking(BOOKING_ID, CUSTOMER_ID, dto)).rejects.toMatchObject({
        status: 404,
        response: { code: 'PAYMENT_METHOD_NOT_FOUND' },
      });
    });

    it('returns Razorpay intent payload', async () => {
      const result = await service.payBooking(BOOKING_ID, CUSTOMER_ID, dto);

      expect(result.bookingId).toBe(BOOKING_ID);
      expect(result.razorpayOrderId).toBe('order_mock_1');
      expect(result.status).toBe('processing');
      expect(mockPaymentsService.initiateUpiPayment).toHaveBeenCalledWith(BOOKING_ID, CUSTOMER_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // getConfirmation
  // ---------------------------------------------------------------------------

  describe('getConfirmation', () => {
    const mockConfirmation: BookingConfirmation = {
      bookingId: BOOKING_ID,
      shopName: "Meera's Cuts",
      shopAddress: 'Fort Kochi',
      dateTimeLabel: '01 Aug 2026, 09:00 AM',
      services: ["Classic Men's Haircut"],
      totalCents: 300,
      currency: 'INR',
      status: 'confirmed',
    };

    it('throws BOOKING_NOT_FOUND when missing', async () => {
      bookingMock.getConfirmation.mockResolvedValue(null);

      await expect(service.getConfirmation(BOOKING_ID, CUSTOMER_ID)).rejects.toMatchObject({
        status: 404,
        response: { code: 'BOOKING_NOT_FOUND' },
      });
    });

    it('returns confirmation data', async () => {
      bookingMock.getConfirmation.mockResolvedValue(mockConfirmation);

      const result = await service.getConfirmation(BOOKING_ID, CUSTOMER_ID);

      expect(result.bookingId).toBe(BOOKING_ID);
      expect(result.services).toEqual(["Classic Men's Haircut"]);
    });
  });

  // ---------------------------------------------------------------------------
  // getPaymentMethods
  // ---------------------------------------------------------------------------

  describe('getPaymentMethods', () => {
    it('delegates to repository and returns result', async () => {
      const expected: PaymentMethodsResult = {
        methods: [mockPaymentMethod],
        defaultMethodId: PAYMENT_METHOD_ID,
      };
      pmMock.listForUser.mockResolvedValue(expected);

      const result = await service.getPaymentMethods('user-uuid');

      expect(result.methods).toHaveLength(1);
      expect(result.defaultMethodId).toBe(PAYMENT_METHOD_ID);
      expect(pmMock.listForUser).toHaveBeenCalledWith('user-uuid');
    });
  });

  describe('listBookings', () => {
    it('delegates to repository with pagination defaults', async () => {
      const paginated = {
        data: [],
        meta: { total: 0, page: 1, perPage: 20, totalPages: 0 },
      };
      bookingMock.listForCustomer.mockResolvedValue(paginated);

      const result = await service.listBookings(CUSTOMER_ID, { status: 'upcoming' });

      expect(result.meta.page).toBe(1);
      expect(bookingMock.listForCustomer).toHaveBeenCalledWith({
        customerId: CUSTOMER_ID,
        tab: 'upcoming',
        page: 1,
        perPage: 20,
      });
    });
  });

  describe('updateReminder', () => {
    const futureStart = new Date(Date.now() + 24 * 60 * 60_000);

    it('throws BOOKING_NOT_FOUND when booking missing', async () => {
      bookingMock.findOwnedById.mockResolvedValue(null);

      await expect(
        service.updateReminder(BOOKING_ID, CUSTOMER_ID, {
          reminderEnabled: true,
          reminderOptionId: ReminderOption.HOUR_1,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws PAST_BOOKING when appointment already started', async () => {
      bookingMock.findOwnedById.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        scheduledStart: new Date(Date.now() - 60_000),
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        reminderEnabled: false,
        reminderOptionId: null,
        cancelledAt: null,
      });

      await expect(
        service.updateReminder(BOOKING_ID, CUSTOMER_ID, {
          reminderEnabled: true,
          reminderOptionId: ReminderOption.HOUR_1,
        }),
      ).rejects.toMatchObject({ response: { code: 'PAST_BOOKING' } });
    });

    it('schedules reminder job when enabled', async () => {
      bookingMock.findOwnedById.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        scheduledStart: futureStart,
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        reminderEnabled: false,
        reminderOptionId: null,
        cancelledAt: null,
      });
      bookingMock.updateReminder.mockResolvedValue({
        id: BOOKING_ID,
        reminderEnabled: true,
        reminderLabel: '1 hour before',
      });

      await service.updateReminder(BOOKING_ID, CUSTOMER_ID, {
        reminderEnabled: true,
        reminderOptionId: ReminderOption.HOUR_1,
      });

      expect(mockReminderProducer.scheduleReminder).toHaveBeenCalledWith(
        BOOKING_ID,
        CUSTOMER_ID,
        futureStart,
        ReminderOption.HOUR_1,
      );
    });
  });

  describe('cancelBooking', () => {
    const futureStart = new Date(Date.now() + 24 * 60 * 60_000);

    it('throws ALREADY_CANCELLED when booking already cancelled', async () => {
      bookingMock.findOwnedById.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        scheduledStart: futureStart,
        bookingStatus: 'cancelled',
        paymentStatus: 'paid',
        reminderEnabled: false,
        reminderOptionId: null,
        cancelledAt: new Date(),
      });

      await expect(service.cancelBooking(BOOKING_ID, CUSTOMER_ID)).rejects.toMatchObject({
        response: { code: 'ALREADY_CANCELLED' },
      });
    });

    it('throws CANCEL_WINDOW_CLOSED when too close to start', async () => {
      bookingMock.findOwnedById.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        scheduledStart: new Date(Date.now() + 30 * 60_000),
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        reminderEnabled: false,
        reminderOptionId: null,
        cancelledAt: null,
      });

      await expect(service.cancelBooking(BOOKING_ID, CUSTOMER_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('cancels booking and reminder job', async () => {
      bookingMock.findOwnedById.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        scheduledStart: futureStart,
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        reminderEnabled: true,
        reminderOptionId: ReminderOption.HOUR_1,
        cancelledAt: null,
      });
      bookingMock.cancelBooking.mockResolvedValue({
        id: BOOKING_ID,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });

      const result = await service.cancelBooking(BOOKING_ID, CUSTOMER_ID);

      expect(result.status).toBe('cancelled');
      expect(mockReminderProducer.cancelReminder).toHaveBeenCalledWith(BOOKING_ID);
    });
  });
});
