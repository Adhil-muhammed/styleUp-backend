import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards';
import { SendTemplateMessageDto } from '@/modules/messaging/dto';
import { MessagingService } from '@/modules/messaging/messaging.service';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('shops/:shopId/messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('send')
  @ApiParam({ name: 'shopId', type: String })
  async sendTemplate(
    @Param('shopId') shopId: string,
    @Body() body: SendTemplateMessageDto,
  ): Promise<ApiSuccess<{ logId: string; status: 'queued' }>> {
    const data = await this.messagingService.sendTemplate(shopId, body);
    return { success: true, data };
  }
}
