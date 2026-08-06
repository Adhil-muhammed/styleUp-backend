export interface AvatarUploadRequest {
  uploadUrl: string;
  avatarUrl: string;
}

export interface AvatarStoragePort {
  createUploadUrl(userId: string): Promise<AvatarUploadRequest>;
}

export const AVATAR_STORAGE = Symbol('AVATAR_STORAGE');
