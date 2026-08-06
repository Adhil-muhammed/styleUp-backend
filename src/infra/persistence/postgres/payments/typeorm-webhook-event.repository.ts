import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentWebhookEventEntity } from '@/infra/persistence/postgres/transactions/payment-webhook-event.entity';
import {
  RecordWebhookEventInput,
  WebhookEventRepositoryPort,
} from '@/modules/payments/ports/webhook-event.repository.port';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>)['code'] === '23505'
  );
}

@Injectable()
export class TypeOrmWebhookEventRepository implements WebhookEventRepositoryPort {
  constructor(
    @InjectRepository(PaymentWebhookEventEntity)
    private readonly repo: Repository<PaymentWebhookEventEntity>,
  ) {}

  async tryRecordEvent(input: RecordWebhookEventInput): Promise<boolean> {
    try {
      await this.repo.save(
        this.repo.create({
          gatewayEventId: input.gatewayEventId,
          eventType: input.eventType,
          gatewayPaymentId: input.gatewayPaymentId,
          gatewayOrderId: input.gatewayOrderId,
          payload: input.payload,
          processedAt: new Date(),
        }),
      );
      return true;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return false;
      }
      throw err;
    }
  }
}
