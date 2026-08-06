import { CustomerGender } from '@/infra/persistence/postgres/auth/auth.enums';
import { CustomerProfile } from '@/shared/types';

export const CUSTOMER_PROFILE_REPOSITORY = Symbol('CUSTOMER_PROFILE_REPOSITORY');

export interface UpdateCustomerProfileInput {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  nickname?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  gender?: CustomerGender | null;
  address?: string | null;
}

export interface CustomerProfileRepositoryPort {
  findProfileByUserId(userId: string): Promise<CustomerProfile | null>;

  updateProfile(userId: string, input: UpdateCustomerProfileInput): Promise<CustomerProfile>;

  setAvatarUrl(userId: string, avatarUrl: string): Promise<string>;
}
