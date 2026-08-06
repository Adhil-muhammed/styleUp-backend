import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateOrderResult,
  PaymentGatewayPort,
} from '@/modules/payments/ports/payment-gateway.port';

/** Dev/test fallback when Razorpay keys are not configured. */
@Injectable()
export class MockPaymentGatewayAdapter implements PaymentGatewayPort {
  getKeyId(): string {
    return 'rzp_test_mock_key';
  }

  async createOrder(amountPaise: number, _receipt: string): Promise<CreateOrderResult> {
    return {
      orderId: `order_mock_${randomUUID()}`,
      amountPaise,
      currency: 'INR',
    };
  }
}
