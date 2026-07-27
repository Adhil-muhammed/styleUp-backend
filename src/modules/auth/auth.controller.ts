import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentAuth } from '@/common/decorators';
import { AuthGuard } from '@/common/guards';
import { AuthService } from '@/modules/auth/auth.service';
import {
  LogoutDto,
  RefreshTokenDto,
  RequestOtpDto,
  SocialAuthDto,
  VerifyOtpDto,
} from '@/modules/auth/dto';
import { SocialProvider } from '@/modules/auth/domain/types';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

@ApiTags('Mobile Auth')
@Controller({ path: 'mobile/v1/auth', version: VERSION_NEUTRAL })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: RequestOtpDto, @Req() req: Request): Promise<ApiSuccess<unknown>> {
    const data = await this.authService.requestOtp({
      contact: body.contact,
      method: body.method,
      clientIp: this.clientIp(req),
      deviceId: body.deviceId,
    });
    return { success: true, data };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto, @Req() req: Request): Promise<ApiSuccess<unknown>> {
    const data = await this.authService.verifyOtp({
      otpSessionId: body.otpSessionId,
      action: body.action,
      otp: body.otp,
      displayName: body.displayName,
      deviceId: body.deviceId,
      clientIp: this.clientIp(req),
    });
    return { success: true, data };
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto): Promise<ApiSuccess<unknown>> {
    const data = await this.authService.refresh(body.refreshToken, body.deviceId);
    return { success: true, data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async logout(
    @CurrentAuth() auth: { userId: string; jti: string; exp: number },
    @Body() body: LogoutDto,
  ): Promise<ApiSuccess<{ success: true }>> {
    const data = await this.authService.logout({
      userId: auth.userId,
      accessJti: auth.jti,
      accessExp: auth.exp,
      refreshToken: body.refreshToken,
    });
    return { success: true, data };
  }

  @Post('social/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'provider', enum: ['google', 'apple'] })
  async social(
    @Param('provider') provider: string,
    @Body() body: SocialAuthDto,
  ): Promise<ApiSuccess<unknown>> {
    if (provider !== 'google' && provider !== 'apple') {
      throw new UnauthorizedException({
        code: 'SOCIAL_AUTH_FAILED',
        message: 'Invalid provider token',
      });
    }
    const data = await this.authService.socialLogin(
      provider as SocialProvider,
      body.idToken,
      body.deviceId,
      body.displayName,
    );
    return { success: true, data };
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim();
    }
    return req.ip;
  }
}
