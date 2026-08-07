export const OTP_EMAIL_QUEUE = 'otp-email';

export interface OtpEmailJobData {
  email: string;
  otp: string;
}
