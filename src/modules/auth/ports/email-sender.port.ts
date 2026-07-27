export interface EmailSenderPort {
  sendOtp(email: string, otp: string): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
