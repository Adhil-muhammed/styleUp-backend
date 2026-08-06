import { createHmac, timingSafeEqual } from 'crypto';

export function verifyRazorpaySignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}
