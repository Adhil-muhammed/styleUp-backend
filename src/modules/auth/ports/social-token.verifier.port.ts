import { SocialIdentity, SocialProvider } from '@/modules/auth/domain/types';

export interface SocialTokenVerifierPort {
  verify(provider: SocialProvider, idToken: string): Promise<SocialIdentity>;
}

export const SOCIAL_TOKEN_VERIFIER = Symbol('SOCIAL_TOKEN_VERIFIER');
