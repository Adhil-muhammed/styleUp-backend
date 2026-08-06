import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UniqueContactConflictError } from '@/modules/auth/domain/unique-contact-conflict.error';
import {
  CUSTOMER_PROFILE_REPOSITORY,
  CustomerProfileRepositoryPort,
} from '@/modules/users/ports/customer-profile.repository.port';
import { AVATAR_STORAGE, AvatarStoragePort } from '@/modules/users/ports/avatar-storage.port';
import { PatchUsersMeDto } from '@/modules/users/dto/patch-users-me.dto';
import { AvatarUploadResult, CustomerProfile } from '@/shared/types';

@Injectable()
export class UsersService {
  constructor(
    @Inject(CUSTOMER_PROFILE_REPOSITORY)
    private readonly profiles: CustomerProfileRepositoryPort,
    @Inject(AVATAR_STORAGE)
    private readonly avatarStorage: AvatarStoragePort,
  ) {}

  async getMe(userId: string): Promise<{ profile: CustomerProfile }> {
    const profile = await this.profiles.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
    }
    return { profile };
  }

  async patchMe(userId: string, dto: PatchUsersMeDto): Promise<{ profile: CustomerProfile }> {
    try {
      const profile = await this.profiles.updateProfile(userId, dto);
      return { profile };
    } catch (error: unknown) {
      if (error instanceof UniqueContactConflictError) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email or phone is already in use',
        });
      }
      if (error instanceof Error && error.message === 'User not found') {
        throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
      }
      throw error;
    }
  }

  async createAvatarUpload(userId: string): Promise<AvatarUploadResult> {
    const profile = await this.profiles.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
    }

    const { uploadUrl, avatarUrl } = await this.avatarStorage.createUploadUrl(userId);
    if (!uploadUrl || !avatarUrl) {
      throw new BadRequestException({
        code: 'INVALID_FILE',
        message: 'Unable to create avatar upload URL',
      });
    }

    await this.profiles.setAvatarUrl(userId, avatarUrl);
    return { avatarUrl, uploadUrl };
  }
}
