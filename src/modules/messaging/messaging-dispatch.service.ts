import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingDispatchProducerService } from '@/modules/messaging/messaging-dispatch-producer.service';
import {
  MESSAGE_LOG_REPOSITORY,
  MessageLogRepositoryPort,
} from '@/modules/messaging/ports/message-log.repository.port';
import {
  MessageTemplateType,
  MessagingDispatchPort,
  SendBookingMessageInput,
} from '@/modules/messaging/ports/messaging-dispatch.port';

@Injectable()
export class MessagingDispatchService implements MessagingDispatchPort {
  private readonly logger = new Logger(MessagingDispatchService.name);

  constructor(
    @Inject(MESSAGE_LOG_REPOSITORY) private readonly messageLogs: MessageLogRepositoryPort,
    private readonly producer: MessagingDispatchProducerService,
    private readonly config: ConfigService,
  ) {}

  async sendBookingConfirmation(input: SendBookingMessageInput): Promise<{ logId: string }> {
    return this.dispatch(input, 'booking_confirmation');
  }

  async sendBookingReminder(input: SendBookingMessageInput): Promise<{ logId: string }> {
    return this.dispatch(input, 'booking_reminder');
  }

  async sendBookingCancellation(input: SendBookingMessageInput): Promise<{ logId: string }> {
    return this.dispatch(input, 'booking_cancellation');
  }

  private async dispatch(
    input: SendBookingMessageInput,
    templateType: MessageTemplateType,
  ): Promise<{ logId: string }> {
    const templateName = this.resolveTemplateName(templateType);
    const provider = this.config.get<string>('messaging.whatsappProvider') ?? 'console';

    const log = await this.messageLogs.createQueued({
      shopId: input.shopId,
      recipient: input.recipient,
      channel: 'whatsapp',
      templateName,
      variables: input.variables,
      provider,
    });

    await this.producer.enqueue({
      logId: log.id,
      shopId: input.shopId,
      channel: 'whatsapp',
      recipient: input.recipient,
      templateName,
      variables: input.variables,
      templateType,
    });

    this.logger.log(
      `Queued ${templateType} WhatsApp for booking ${input.bookingId} (log ${log.id})`,
    );

    return { logId: log.id };
  }

  private resolveTemplateName(templateType: MessageTemplateType): string {
    const templates = this.config.get<Record<string, string | undefined>>('msg91.templates');
    const keyMap: Record<MessageTemplateType, string> = {
      booking_confirmation: 'bookingConfirmation',
      booking_reminder: 'bookingReminder',
      booking_cancellation: 'bookingCancellation',
    };

    const templateName = templates?.[keyMap[templateType]];
    if (!templateName) {
      throw new InternalServerErrorException({
        code: 'MESSAGE_TEMPLATE_NOT_CONFIGURED',
        message: `MSG91 template not configured for ${templateType}`,
      });
    }

    return templateName;
  }
}
