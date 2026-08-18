export const MESSAGE_LOG_REPOSITORY = Symbol('MESSAGE_LOG_REPOSITORY');

export type MessageLogChannel = 'whatsapp' | 'sms';
export type MessageLogStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface CreateMessageLogInput {
  shopId: string;
  recipient: string;
  channel: MessageLogChannel;
  templateName: string;
  variables: Record<string, string>;
  provider?: string;
}

export interface MessageLogRecord {
  id: string;
  shopId: string;
  recipient: string;
  channel: MessageLogChannel;
  templateName: string;
  variables: Record<string, string>;
  status: MessageLogStatus;
  providerMessageId: string | null;
  failureReason: string | null;
  provider: string;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
}

export interface MessageLogRepositoryPort {
  createQueued(input: CreateMessageLogInput): Promise<MessageLogRecord>;
  findById(id: string): Promise<MessageLogRecord | null>;
  findByProviderMessageId(providerMessageId: string): Promise<MessageLogRecord | null>;
  markSent(id: string, providerMessageId: string, sentAt: Date): Promise<void>;
  markDelivered(id: string, deliveredAt: Date): Promise<boolean>;
  markRead(id: string, readAt: Date): Promise<boolean>;
  markFailed(id: string, failureReason: string): Promise<void>;
  markFailedFromWebhook(id: string, failureReason: string): Promise<boolean>;
}
