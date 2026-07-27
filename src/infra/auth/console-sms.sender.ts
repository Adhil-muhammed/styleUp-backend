import { Injectable, Logger } from '@nestjs/common';
import { SmsSenderPort } from '@/modules/auth/ports/sms-sender.port';

@Injectable()
export class ConsoleSmsSender implements SmsSenderPort {
  private readonly logger = new Logger(ConsoleSmsSender.name);

  async sendOtp(phone: string, otp: string): Promise<void> {
    this.logger.log(`DEV SMS OTP to ${phone}: ${otp}`);
  }
}
