import { Injectable, Logger } from '@nestjs/common';
import { EmailSenderPort } from '@/modules/auth/ports/email-sender.port';

@Injectable()
export class ConsoleEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  async sendOtp(email: string, otp: string): Promise<void> {
    this.logger.log(`DEV email OTP to ${email}: ${otp}`);
  }
}
