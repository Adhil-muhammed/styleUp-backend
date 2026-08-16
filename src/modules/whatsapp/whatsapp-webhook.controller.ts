import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { WhatsappSignatureGuard } from '@/modules/whatsapp/guards/whatsapp-signature.guard';
import { WhatsappWebhookService } from '@/modules/whatsapp/whatsapp-webhook.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Meta WhatsApp Business Cloud API webhook endpoint.
 *
 * GET  /api/webhooks/whatsapp — subscription verification (hub.challenge)
 * POST /api/webhooks/whatsapp — inbound messages + template status updates
 */
@ApiTags('Webhooks')
@ApiExcludeController()
@Controller({ path: 'webhooks/whatsapp', version: VERSION_NEUTRAL })
export class WhatsappWebhookController {
  constructor(private readonly webhookService: WhatsappWebhookService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  verifySubscription(
    @Query('hub.mode') hubMode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    return this.webhookService.verifySubscription(hubMode, verifyToken, challenge);
  }

  /**
   * Ack Meta immediately with HTTP 200, then hand off to BullMQ for processing.
   *
   * Only `queue.add()` is awaited here (~single-digit ms Redis round trip).
   * Heavy work (idempotency checks, message routing, outbound replies) runs in
   * {@link WhatsappWebhookProcessor} so Meta does not retry and flood the server.
   */
  @Post()
  @UseGuards(WhatsappSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: RawBodyRequest): Promise<{ success: true }> {
    const body: unknown = req.rawBody
      ? (JSON.parse(req.rawBody.toString('utf8')) as unknown)
      : req.body;

    await this.webhookService.acceptWebhook(body);
    return { success: true };
  }
}
