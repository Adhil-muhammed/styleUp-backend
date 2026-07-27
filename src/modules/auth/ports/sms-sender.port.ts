export interface SmsSenderPort {
  sendOtp(phone: string, otp: string): Promise<void>;
}

export const SMS_SENDER = Symbol('SMS_SENDER');
