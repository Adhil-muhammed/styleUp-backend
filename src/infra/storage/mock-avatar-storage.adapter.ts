import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AvatarStoragePort, AvatarUploadRequest } from '@/modules/users/ports/avatar-storage.port';

@Injectable()
export class MockAvatarStorageAdapter implements AvatarStoragePort {
  constructor(private readonly config: ConfigService) {}

  async createUploadUrl(userId: string): Promise<AvatarUploadRequest> {
    const baseUrl =
      this.config.get<string>('avatar.publicBaseUrl') ?? 'https://cdn.styleup.local/avatars';
    const objectKey = `${userId}/${randomUUID()}.jpg`;
    const avatarUrl = `${baseUrl}/${objectKey}`;
    const uploadUrl = `${avatarUrl}?upload=1`;
    return { uploadUrl, avatarUrl };
  }
}
