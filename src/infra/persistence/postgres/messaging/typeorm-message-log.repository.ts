import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLogEntity } from '@/infra/persistence/postgres/messaging/message-log.entity';
import {
  CreateMessageLogInput,
  MessageLogRecord,
  MessageLogRepositoryPort,
  MessageLogStatus,
} from '@/modules/messaging/ports/message-log.repository.port';

const STATUS_RANK: Record<MessageLogStatus, number> = {
  queued: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  failed: 99,
};

function toRecord(entity: MessageLogEntity): MessageLogRecord {
  return {
    id: entity.id,
    shopId: entity.shopId,
    recipient: entity.recipient,
    channel: entity.channel as MessageLogRecord['channel'],
    templateName: entity.templateName,
    variables: entity.variables,
    status: entity.status as MessageLogRecord['status'],
    providerMessageId: entity.providerMessageId,
    failureReason: entity.failureReason,
    provider: entity.provider,
    createdAt: entity.createdAt,
    sentAt: entity.sentAt,
    deliveredAt: entity.deliveredAt,
    readAt: entity.readAt,
  };
}

@Injectable()
export class TypeOrmMessageLogRepository implements MessageLogRepositoryPort {
  constructor(
    @InjectRepository(MessageLogEntity)
    private readonly repo: Repository<MessageLogEntity>,
  ) {}

  async createQueued(input: CreateMessageLogInput): Promise<MessageLogRecord> {
    const entity = this.repo.create({
      shopId: input.shopId,
      recipient: input.recipient,
      channel: input.channel,
      templateName: input.templateName,
      variables: input.variables,
      status: 'queued',
      provider: input.provider ?? 'msg91',
      createdAt: new Date(),
    });
    const saved = await this.repo.save(entity);
    return toRecord(saved);
  }

  async findById(id: string): Promise<MessageLogRecord | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? toRecord(entity) : null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<MessageLogRecord | null> {
    const entity = await this.repo.findOne({ where: { providerMessageId } });
    return entity ? toRecord(entity) : null;
  }

  async markSent(id: string, providerMessageId: string, sentAt: Date): Promise<void> {
    await this.repo.update({ id }, { status: 'sent', providerMessageId, sentAt });
  }

  async markDelivered(id: string, deliveredAt: Date): Promise<boolean> {
    return this.updateStatusIfHigherRank(id, 'delivered', STATUS_RANK.delivered, {
      deliveredAt,
    });
  }

  async markRead(id: string, readAt: Date): Promise<boolean> {
    return this.updateStatusIfHigherRank(id, 'read', STATUS_RANK.read, {
      readAt,
      deliveredAt: readAt,
    });
  }

  async markFailed(id: string, failureReason: string): Promise<void> {
    await this.repo.update({ id }, { status: 'failed', failureReason });
  }

  async markFailedFromWebhook(id: string, failureReason: string): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(MessageLogEntity)
      .set({ status: 'failed', failureReason })
      .where('id = :id', { id })
      .andWhere('status IN (:...statuses)', { statuses: ['sent', 'delivered'] })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  private async updateStatusIfHigherRank(
    id: string,
    newStatus: MessageLogStatus,
    targetRank: number,
    timestamps: Partial<Pick<MessageLogEntity, 'deliveredAt' | 'readAt'>>,
  ): Promise<boolean> {
    const result = await this.repo.query<Array<{ id: string }>>(
      `UPDATE message_logs
       SET status = $1,
           delivered_at = COALESCE(delivered_at, $2),
           read_at = COALESCE(read_at, $3)
       WHERE id = $4
         AND (CASE status
           WHEN 'queued' THEN 1
           WHEN 'sent' THEN 2
           WHEN 'delivered' THEN 3
           WHEN 'read' THEN 4
           WHEN 'failed' THEN 99
         END) < $5
       RETURNING id`,
      [newStatus, timestamps.deliveredAt ?? null, timestamps.readAt ?? null, id, targetRank],
    );

    return result.length > 0;
  }
}
