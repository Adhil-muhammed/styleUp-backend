import { createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SocialIdentity, SocialProvider } from '@/modules/auth/domain/types';
import { SocialTokenVerifierPort } from '@/modules/auth/ports/social-token.verifier.port';

/**
 * Dev stub: accepts non-empty idTokens and derives a stable provider id + synthetic email.
 * emailVerified is false so auto-link against OTP accounts cannot happen via the stub.
 * Replace with real Google/Apple verifiers before production.
 */
@Injectable()
export class StubSocialTokenVerifier implements SocialTokenVerifierPort {
  async verify(provider: SocialProvider, idToken: string): Promise<SocialIdentity> {
    const trimmed = idToken.trim();
    if (!trimmed) {
      throw new UnauthorizedException({
        code: 'SOCIAL_AUTH_FAILED',
        message: 'Invalid provider token',
      });
    }

    const providerId = createHash('sha256')
      .update(`${provider}:${trimmed}`)
      .digest('hex')
      .slice(0, 32);

    return {
      provider,
      providerId,
      email: `${provider}.${providerId.slice(0, 12)}@social.local`,
      displayName: `${provider} user`,
      emailVerified: false,
    };
  }
}
