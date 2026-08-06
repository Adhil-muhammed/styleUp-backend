import { Body, Controller, Get, Patch, Post, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards';
import { CurrentAuth } from '@/common/decorators';
import { AuthenticatedRequest } from '@/common/guards/auth.guard';
import { UsersService } from '@/modules/users/users.service';
import { PatchUsersMeDto } from '@/modules/users/dto/patch-users-me.dto';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

@ApiTags('Mobile Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'mobile/v1/users', version: VERSION_NEUTRAL })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentAuth() auth: AuthenticatedRequest['authUser']): Promise<ApiSuccess<unknown>> {
    const data = await this.usersService.getMe(auth.userId);
    return { success: true, data };
  }

  @Patch('me')
  async patchMe(
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
    @Body() dto: PatchUsersMeDto,
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.usersService.patchMe(auth.userId, dto);
    return { success: true, data };
  }

  @Post('me/avatar')
  async uploadAvatar(
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.usersService.createAvatarUpload(auth.userId);
    return { success: true, data };
  }
}
