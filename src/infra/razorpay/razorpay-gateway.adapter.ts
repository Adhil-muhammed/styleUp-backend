import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');

import {
  CreateOrderResult,
  PaymentGatewayPort,
} from '@/modules/payments/ports/payment-gateway.port';

@Injectable()
export class RazorpayGatewayAdapter implements PaymentGatewayPort {
  private readonly client: Razorpay;
  private readonly keyId: string;

  constructor(private readonly config: ConfigService) {
    const keyId = this.config.get<string>('razorpay.keyId') ?? '';
    const keySecret = this.config.get<string>('razorpay.keySecret') ?? '';

    if (!keyId || !keySecret) {
      throw new InternalServerErrorException({
        code: 'RAZORPAY_NOT_CONFIGURED',
        message: 'Razorpay credentials are not configured',
      });
    }

    this.keyId = keyId;
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  getKeyId(): string {
    return this.keyId;
  }

  async createOrder(
    amountPaise: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<CreateOrderResult> {
    try {
      const order = await this.client.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes,
      });

      return {
        orderId: order.id,
        amountPaise: Number(order.amount),
        currency: order.currency,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Razorpay order creation failed';
      throw new InternalServerErrorException({
        code: 'RAZORPAY_ORDER_FAILED',
        message,
      });
    }
  }
}
