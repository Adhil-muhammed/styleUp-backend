import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailSenderPort } from '@/modules/auth/ports/email-sender.port';

@Injectable()
export class NodemailerEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(NodemailerEmailSender.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.getOrThrow<string>('smtp.user');
    const appPassword = this.config.getOrThrow<string>('smtp.appPassword').replace(/\s+/g, '');

    this.from = this.config.get<string>('smtp.from') ?? user;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass: appPassword,
      },
    });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Your StyleUp OTP code',
        text: `Your StyleUp verification code is ${otp}. It expires in 5 minutes.`,
        html: `<p>Your StyleUp verification code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown email transport error';
      this.logger.error(`Failed to send OTP email to ${email}: ${message}`);
      throw new InternalServerErrorException({
        code: 'EMAIL_SEND_FAILED',
        message: 'Unable to send OTP email right now',
      });
    }
  }
}
