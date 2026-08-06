export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface CreateOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
}

export interface PaymentGatewayPort {
  /** Creates a Razorpay order for UPI Intent checkout. Amount must be in paise. */
  createOrder(
    amountPaise: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<CreateOrderResult>;

  /** Returns the publishable key id for the mobile SDK. */
  getKeyId(): string;
}
