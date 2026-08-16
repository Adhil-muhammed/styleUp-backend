import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Verifies Meta WhatsApp / Graph webhook `X-Hub-Signature-256`.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyWhatsappSignature(
  rawBody: Buffer,
  signatureHeader: string,
  appSecret: string,
): boolean {
  if (!appSecret || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const receivedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expectedHex = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  try {
    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    const receivedBuf = Buffer.from(receivedHex, 'utf8');
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}
