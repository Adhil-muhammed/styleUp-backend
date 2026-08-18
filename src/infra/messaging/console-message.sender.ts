import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MessageSenderPort,
  SendTemplateMessageInput,
  SendTemplateMessageResult,
} from '@/modules/messaging/ports/message-sender.port';

@Injectable()
export class ConsoleMessageSender implements MessageSenderPort {
  private readonly logger = new Logger(ConsoleMessageSender.name);

  async sendTemplate(input: SendTemplateMessageInput): Promise<SendTemplateMessageResult> {
    this.logger.log(
      `[DEV] ${input.channel} template "${input.templateName}" → ${input.recipient} vars=${JSON.stringify(input.variables)}`,
    );
    return { providerMessageId: `console-${randomUUID()}` };
  }
}
