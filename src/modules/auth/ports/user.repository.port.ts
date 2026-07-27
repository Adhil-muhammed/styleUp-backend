import { User } from '@/modules/auth/domain/types';

export interface CreateCustomerUserInput {
  email: string | null;
  phone: string | null;
  displayName: string;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
}

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByIdentity(provider: string, providerId: string): Promise<User | null>;
  createCustomerUser(input: CreateCustomerUserInput): Promise<User>;
  markEmailVerified(userId: string, at: Date): Promise<void>;
  markPhoneVerified(userId: string, at: Date): Promise<void>;
  linkIdentity(userId: string, provider: string, providerId: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
