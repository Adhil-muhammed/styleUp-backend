export interface BookingLineItem {
  label: string;
  amountCents: number;
}

export interface BookingQuote {
  lineItems: BookingLineItem[];
  totalCents: number;
  currency: string;
}

export interface TimeSlot {
  id: string;
  label: string;
}

export interface AvailabilityResult {
  availableDates: string[];
  timeSlots: TimeSlot[];
}

export interface BookingCreated {
  bookingId: string;
  status: string;
  quote: BookingQuote;
  customer: {
    name: string;
    phone: string;
  };
  bookingDetails: { label: string; value: string; emphasizeValue?: boolean }[];
}

export interface BookingConfirmation {
  bookingId: string;
  shopName: string;
  shopAddress: string;
  dateTimeLabel: string;
  services: string[];
  totalCents: number;
  currency: string;
  status: string;
}

export type PaymentMethodKind = 'paypal' | 'google_pay' | 'apple_pay' | 'saved_card';

export interface PaymentMethodItem {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  lastFour?: string;
}

export interface PaymentMethodsResult {
  methods: PaymentMethodItem[];
  defaultMethodId: string;
}

/** Input for service-layer quote computation. */
export interface QuoteInput {
  shopId: string;
  /** Map of categoryId → shopServiceId. */
  selectedVariants?: Record<string, string>;
  packageId?: string;
  /** Treated as a shopServiceId when provided. */
  discoverServiceId?: string;
}

/** Resolved service line ready for quote or booking_items. */
export interface ResolvedServiceLine {
  label: string;
  shopServiceId: string | null;
  packageId: string | null;
  pricePaise: bigint;
  durationMinutes: number;
}
