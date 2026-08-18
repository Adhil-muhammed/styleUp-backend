import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@/modules/auth';
import { MessageLogEntity } from '@/infra/persistence/postgres/messaging/message-log.entity';
import { TypeOrmMessageLogRepository } from '@/infra/persistence/postgres/messaging/typeorm-message-log.repository';
import { TypeOrmShopLookupAdapter } from '@/infra/persistence/postgres/messaging/typeorm-shop-lookup.adapter';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { ConsoleMessageSender } from '@/infra/messaging/console-message.sender';
import { Msg91WhatsappSender } from '@/infra/messaging/msg91-whatsapp.sender';
import { MessagingController } from '@/modules/messaging/messaging.controller';
import { Msg91WebhookController } from '@/modules/messaging/msg91-webhook.controller';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { MessagingDispatchService } from '@/modules/messaging/messaging-dispatch.service';
import { Msg91WebhookService } from '@/modules/messaging/msg91-webhook.service';
import { MESSAGING_DISPATCH_QUEUE } from '@/modules/messaging/messaging.constants';
import { MessagingDispatchProducerService } from '@/modules/messaging/messaging-dispatch-producer.service';
import { MessagingDispatchProcessor } from '@/modules/messaging/messaging-dispatch.processor';
import { MESSAGE_LOG_REPOSITORY } from '@/modules/messaging/ports/message-log.repository.port';
import { MESSAGE_SENDER } from '@/modules/messaging/ports/message-sender.port';
import { MESSAGING_DISPATCH } from '@/modules/messaging/ports/messaging-dispatch.port';
import { SHOP_LOOKUP } from '@/modules/messaging/ports/shop-lookup.port';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    BullModule.registerQueue({ name: MESSAGING_DISPATCH_QUEUE }),
    TypeOrmModule.forFeature([MessageLogEntity, ShopEntity]),
  ],
  controllers: [MessagingController, Msg91WebhookController],
  providers: [
    MessagingService,
    MessagingDispatchService,
    Msg91WebhookService,
    MessagingDispatchProducerService,
    MessagingDispatchProcessor,
    ConsoleMessageSender,
    Msg91WhatsappSender,
    { provide: MESSAGE_LOG_REPOSITORY, useClass: TypeOrmMessageLogRepository },
    { provide: SHOP_LOOKUP, useClass: TypeOrmShopLookupAdapter },
    { provide: MESSAGING_DISPATCH, useExisting: MessagingDispatchService },
    {
      provide: MESSAGE_SENDER,
      inject: [ConfigService, ConsoleMessageSender, Msg91WhatsappSender],
      useFactory: (
        config: ConfigService,
        consoleSender: ConsoleMessageSender,
        msg91Sender: Msg91WhatsappSender,
      ) => {
        const provider = config.get<string>('messaging.whatsappProvider') ?? 'console';
        const authKey = config.get<string>('msg91.authKey');
        if (provider === 'msg91' && authKey) {
          return msg91Sender;
        }
        return consoleSender;
      },
    },
  ],
  exports: [MessagingDispatchService, MESSAGING_DISPATCH],
})
export class MessagingModule {}
