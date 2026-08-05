import { BookingsController } from './bookings.controller';
import type { BookingsService } from './bookings.service';
import type {
  AvailabilityResult,
  BookingConfirmation,
  BookingCreated,
  BookingQuote,
  PaymentMethodsResult,
} from '@/shared/types';

const mockService = {
  getAvailability: jest.fn(),
  computeQuote: jest.fn(),
  createBooking: jest.fn(),
  getPaymentMethods: jest.fn(),
  payBooking: jest.fn(),
  getConfirmation: jest.fn(),
};

const controller = () => new BookingsController(mockService as unknown as BookingsService);

const AUTH = { userId: 'user-uuid', jti: 'jti-1', exp: 9999999999 };
const SHOP_ID = 'shop-uuid';
const BOOKING_ID = 'booking-uuid';

describe('BookingsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getAvailability
  // ---------------------------------------------------------------------------

  it('getAvailability wraps result in success envelope', async () => {
    const data: AvailabilityResult = {
      availableDates: ['2026-08-01'],
      timeSlots: [{ id: '0900', label: '9:00 AM' }],
    };
    mockService.getAvailability.mockResolvedValue(data);

    const result = await controller().getAvailability(SHOP_ID, { dateYmd: '2026-08-01' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(mockService.getAvailability).toHaveBeenCalledWith(SHOP_ID, { dateYmd: '2026-08-01' });
  });

  // ---------------------------------------------------------------------------
  // postQuote
  // ---------------------------------------------------------------------------

  it('postQuote wraps computed quote in success envelope', async () => {
    const quote: BookingQuote = {
      lineItems: [{ label: 'Haircut', amountCents: 300 }],
      totalCents: 300,
      currency: 'INR',
    };
    mockService.computeQuote.mockResolvedValue(quote);

    const dto = { shopId: SHOP_ID, selectedVariants: { 'cat-1': 'ss-1' } };
    const result = await controller().postQuote(dto);

    expect(result.success).toBe(true);
    expect((result.data as BookingQuote).totalCents).toBe(300);
    expect(mockService.computeQuote).toHaveBeenCalledWith(dto);
  });

  // ---------------------------------------------------------------------------
  // createBooking
  // ---------------------------------------------------------------------------

  it('createBooking passes customerId from auth and wraps result', async () => {
    const created: BookingCreated = {
      bookingId: BOOKING_ID,
      status: 'pending',
      quote: { lineItems: [], totalCents: 0, currency: 'INR' },
      customer: { name: 'Test', phone: '+91' },
      bookingDetails: [],
    };
    mockService.createBooking.mockResolvedValue(created);

    const dto = {
      shopId: SHOP_ID,
      selectedSpecialistId: 'staff-uuid',
      selectedDateYmd: '2026-08-01',
      selectedTimeId: '0900',
      paymentMethodId: 'pm-uuid',
    };
    const result = await controller().createBooking(dto, AUTH);

    expect(result.success).toBe(true);
    expect(mockService.createBooking).toHaveBeenCalledWith(AUTH.userId, dto);
  });

  // ---------------------------------------------------------------------------
  // getPaymentMethods
  // ---------------------------------------------------------------------------

  it('getPaymentMethods delegates userId from auth', async () => {
    const pmResult: PaymentMethodsResult = {
      methods: [{ id: 'pm-1', kind: 'google_pay', label: 'Google Pay' }],
      defaultMethodId: 'pm-1',
    };
    mockService.getPaymentMethods.mockResolvedValue(pmResult);

    const result = await controller().getPaymentMethods(AUTH);

    expect(result.success).toBe(true);
    expect(mockService.getPaymentMethods).toHaveBeenCalledWith(AUTH.userId);
  });

  // ---------------------------------------------------------------------------
  // payBooking
  // ---------------------------------------------------------------------------

  it('payBooking passes bookingId and customerId from auth', async () => {
    const payResult = {
      bookingId: BOOKING_ID,
      status: 'confirmed',
      paidAt: '2026-08-01T10:00:00.000Z',
      totalCents: 300,
      currency: 'INR',
    };
    mockService.payBooking.mockResolvedValue(payResult);

    const result = await controller().payBooking(BOOKING_ID, { paymentMethodId: 'pm-uuid' }, AUTH);

    expect(result.success).toBe(true);
    expect(mockService.payBooking).toHaveBeenCalledWith(BOOKING_ID, AUTH.userId, {
      paymentMethodId: 'pm-uuid',
    });
  });

  // ---------------------------------------------------------------------------
  // getConfirmation
  // ---------------------------------------------------------------------------

  it('getConfirmation delegates to service and wraps result', async () => {
    const confirmation: BookingConfirmation = {
      bookingId: BOOKING_ID,
      shopName: "Meera's Cuts",
      shopAddress: 'Fort Kochi',
      dateTimeLabel: '01 Aug 2026, 09:00 AM',
      services: ['Haircut'],
      totalCents: 300,
      currency: 'INR',
      status: 'confirmed',
    };
    mockService.getConfirmation.mockResolvedValue(confirmation);

    const result = await controller().getConfirmation(BOOKING_ID, AUTH);

    expect(result.success).toBe(true);
    expect(mockService.getConfirmation).toHaveBeenCalledWith(BOOKING_ID, AUTH.userId);
  });
});
