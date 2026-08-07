import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OTP_EMAIL_QUEUE, OtpEmailJobData } from './otp-email.constants';

@Injectable()
export class OtpEmailProducerService {
  private readonly logger = new Logger(OtpEmailProducerService.name);

  constructor(@InjectQueue(OTP_EMAIL_QUEUE) private readonly queue: Queue<OtpEmailJobData>) {}

  async enqueueSendOtp(email: string, otp: string): Promise<void> {
    await this.queue.add(
      'send-otp',
      { email, otp },
      {
        removeOnComplete: true,
        removeOnFail: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    this.logger.debug(`Enqueued OTP email for ${email}`);
  }
}
