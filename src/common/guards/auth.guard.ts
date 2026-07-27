import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TOKEN_SERVICE, TokenServicePort } from '@/modules/auth/ports/token.service.port';

export interface AuthenticatedRequest extends Request {
  authUser: {
    userId: string;
    jti: string;
    exp: number;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid access token',
      });
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = await this.tokens.verifyAccessToken(token);
      const blocked = await this.tokens.isAccessTokenBlocked(claims.jti);
      if (blocked) {
        throw new UnauthorizedException({
          code: 'TOKEN_REVOKED',
          message: 'Access token has been revoked',
        });
      }
      request.authUser = {
        userId: claims.sub,
        jti: claims.jti,
        exp: claims.exp,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid access token',
      });
    }
  }
}
