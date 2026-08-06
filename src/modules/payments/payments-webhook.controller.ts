import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verifyRazorpaySignature } from '@/infra/razorpay/razorpay-signature.util';
import { PaymentsService, RazorpayWebhookPayload } from '@/modules/payments/payments.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Controller({ path: 'webhooks', version: VERSION_NEUTRAL })
export class PaymentsWebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
  ): Promise<{ success: true; data: { received: boolean; duplicate?: boolean } }> {
    const rawBody = req.rawBody;
    const webhookSecret = this.config.get<string>('razorpay.webhookSecret') ?? '';

    if (!rawBody || !signature || !verifyRazorpaySignature(rawBody, signature, webhookSecret)) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid Razorpay webhook signature',
      });
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    const resolvedEventId =
      eventId ?? `${payload.event}:${payload.payload.payment?.entity?.id ?? 'unknown'}`;

    const result = await this.paymentsService.handleWebhookEvent(resolvedEventId, payload);

    return {
      success: true,
      data: { received: true, ...(result.duplicate ? { duplicate: true } : {}) },
    };
  }
}
