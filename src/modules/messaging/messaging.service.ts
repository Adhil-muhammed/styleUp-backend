import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MESSAGE_LOG_REPOSITORY,
  MessageLogRepositoryPort,
} from '@/modules/messaging/ports/message-log.repository.port';
import { SHOP_LOOKUP, ShopLookupPort } from '@/modules/messaging/ports/shop-lookup.port';
import { SendTemplateMessageDto } from '@/modules/messaging/dto';
import { MessagingDispatchProducerService } from '@/modules/messaging/messaging-dispatch-producer.service';

export interface SendTemplateMessageResult {
  logId: string;
  status: 'queued';
}

@Injectable()
export class MessagingService {
  constructor(
    @Inject(SHOP_LOOKUP) private readonly shops: ShopLookupPort,
    @Inject(MESSAGE_LOG_REPOSITORY) private readonly messageLogs: MessageLogRepositoryPort,
    private readonly producer: MessagingDispatchProducerService,
  ) {}

  async sendTemplate(
    shopId: string,
    dto: SendTemplateMessageDto,
  ): Promise<SendTemplateMessageResult> {
    const shopExists = await this.shops.existsById(shopId);
    if (!shopExists) {
      throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Shop not found' });
    }

    const variables = dto.variables ?? {};
    const log = await this.messageLogs.createQueued({
      shopId,
      recipient: dto.recipient,
      channel: dto.channel,
      templateName: dto.templateName,
      variables,
    });

    await this.producer.enqueue({
      logId: log.id,
      shopId,
      channel: dto.channel,
      recipient: dto.recipient,
      templateName: dto.templateName,
      variables,
    });

    return { logId: log.id, status: 'queued' };
  }
}
