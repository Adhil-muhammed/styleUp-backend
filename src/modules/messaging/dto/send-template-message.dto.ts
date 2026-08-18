import { IsIn, IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageLogChannel } from '@/modules/messaging/ports/message-log.repository.port';

export class SendTemplateMessageDto {
  @ApiProperty({ enum: ['whatsapp', 'sms'] })
  @IsIn(['whatsapp', 'sms'])
  channel!: MessageLogChannel;

  @ApiProperty({ example: '+919876543210', description: 'E.164 phone number' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'recipient must be a valid E.164 phone number' })
  recipient!: string;

  @ApiProperty({ example: 'booking_confirmation' })
  @IsString()
  @MinLength(1)
  templateName!: string;

  @ApiPropertyOptional({ example: { '1': 'Adhil', '2': "Meera's Cuts" } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
