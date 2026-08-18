import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Msg91WebhookService } from '@/modules/messaging/msg91-webhook.service';

@Controller({ path: 'webhooks/msg91', version: VERSION_NEUTRAL })
export class Msg91WebhookController {
  private readonly logger = new Logger(Msg91WebhookController.name);

  constructor(
    private readonly webhookService: Msg91WebhookService,
    private readonly config: ConfigService,
  ) {}

  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  handleWhatsappDelivery(
    @Headers('x-msg91-webhook-secret') webhookSecret: string | undefined,
    payload: unknown,
  ): { success: true; data: { received: boolean } } {
    const expectedSecret = this.config.get<string>('msg91.webhookSecret');
    if (expectedSecret && webhookSecret !== expectedSecret) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_SECRET_INVALID',
        message: 'Invalid MSG91 webhook secret',
      });
    }

    void this.webhookService.handleDeliveryStatus(payload).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
      this.logger.error(`MSG91 webhook async processing failed: ${message}`);
    });

    return { success: true, data: { received: true } };
  }
}
