import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisWhatsappIdempotencyStore } from '@/infra/persistence/redis/redis-whatsapp-idempotency.store';
import { RedisModule } from '@/infra/redis/redis.module';
import { WhatsappSignatureGuard } from '@/modules/whatsapp/guards/whatsapp-signature.guard';
import { WHATSAPP_IDEMPOTENCY_STORE } from '@/modules/whatsapp/ports/whatsapp-idempotency.port';
import { WHATSAPP_WEBHOOK_QUEUE } from '@/modules/whatsapp/whatsapp.constants';
import { WhatsappWebhookController } from '@/modules/whatsapp/whatsapp-webhook.controller';
import { WhatsappWebhookProducerService } from '@/modules/whatsapp/whatsapp-webhook-producer.service';
import { WhatsappWebhookProcessor } from '@/modules/whatsapp/whatsapp-webhook.processor';
import { WhatsappWebhookService } from '@/modules/whatsapp/whatsapp-webhook.service';

@Module({
  imports: [RedisModule, BullModule.registerQueue({ name: WHATSAPP_WEBHOOK_QUEUE })],
  controllers: [WhatsappWebhookController],
  providers: [
    WhatsappWebhookService,
    WhatsappWebhookProducerService,
    WhatsappWebhookProcessor,
    WhatsappSignatureGuard,
    { provide: WHATSAPP_IDEMPOTENCY_STORE, useClass: RedisWhatsappIdempotencyStore },
  ],
})
export class WhatsappModule {}
