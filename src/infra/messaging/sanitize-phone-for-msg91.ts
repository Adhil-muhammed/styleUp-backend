export function sanitizePhoneForMsg91(recipient: string): string {
  return recipient.trim().replace(/^\+/, '');
}
