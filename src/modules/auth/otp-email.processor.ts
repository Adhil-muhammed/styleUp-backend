import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_SENDER, EmailSenderPort } from '@/modules/auth/ports/email-sender.port';
import { OTP_EMAIL_QUEUE, OtpEmailJobData } from './otp-email.constants';

@Processor(OTP_EMAIL_QUEUE)
export class OtpEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(OtpEmailProcessor.name);

  constructor(@Inject(EMAIL_SENDER) private readonly emailSender: EmailSenderPort) {
    super();
  }

  async process(job: Job<OtpEmailJobData>): Promise<void> {
    const { email, otp } = job.data;
    await this.emailSender.sendOtp(email, otp);
    this.logger.log(`OTP email sent to ${email}`);
  }
}
