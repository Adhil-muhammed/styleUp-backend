import { MessageLogChannel } from '@/modules/messaging/ports/message-log.repository.port';
import { MessageTemplateType } from '@/modules/messaging/ports/messaging-dispatch.port';

export const MESSAGING_DISPATCH_QUEUE = 'messaging-dispatch';

export interface MessagingDispatchJobData {
  logId: string;
  shopId: string;
  channel: MessageLogChannel;
  recipient: string;
  templateName: string;
  variables: Record<string, string>;
  templateType?: MessageTemplateType;
}
