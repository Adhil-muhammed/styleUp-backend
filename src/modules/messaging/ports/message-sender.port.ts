import { MessageLogChannel } from '@/modules/messaging/ports/message-log.repository.port';

export const MESSAGE_SENDER = Symbol('MESSAGE_SENDER');

export interface SendTemplateMessageInput {
  channel: MessageLogChannel;
  recipient: string;
  templateName: string;
  variables: Record<string, string>;
}

export interface SendTemplateMessageResult {
  providerMessageId: string;
}

export interface MessageSenderPort {
  sendTemplate(input: SendTemplateMessageInput): Promise<SendTemplateMessageResult>;
}
