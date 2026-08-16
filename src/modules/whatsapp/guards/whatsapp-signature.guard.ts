import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verifyWhatsappSignature } from '@/infra/meta/whatsapp-signature.util';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Cryptographically verifies `X-Hub-Signature-256` on WhatsApp POST webhooks.
 *
 * Must run BEFORE any payload parsing or business logic. Requires `rawBody: true`
 * on NestFactory.create (see main.ts) so the HMAC is computed over the exact
 * bytes Meta signed — re-serialized JSON will fail verification.
 *
 * Apply only to POST routes; GET verification uses hub.verify_token instead.
 */
@Injectable()
export class WhatsappSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    const signatureHeader = request.headers['x-hub-signature-256'];
    const rawBody = request.rawBody;
    const appSecret = this.config.get<string>('whatsapp.appSecret') ?? '';

    if (
      !rawBody ||
      typeof signatureHeader !== 'string' ||
      !verifyWhatsappSignature(rawBody, signatureHeader, appSecret)
    ) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid WhatsApp webhook signature',
      });
    }

    return true;
  }
}
