import { CustomerGender } from '@/infra/persistence/postgres/auth/auth.enums';

export interface CustomerProfile {
  id: string;
  email: string;
  phoneNumber: string;
  displayName: string;
  avatarUrl: string | null;
  xpPoints: number;
  level: number;
  createdAt: string;
  updatedAt: string;
  nickname: string | null;
  dateOfBirth: string | null;
  country: string | null;
  gender: CustomerGender | null;
  address: string | null;
}

export interface AvatarUploadResult {
  avatarUrl: string;
  uploadUrl: string;
}
