import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CustomerEntity } from '@/infra/persistence/postgres/auth/customer.entity';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { CustomerGender } from '@/infra/persistence/postgres/auth/auth.enums';
import { UniqueContactConflictError } from '@/modules/auth/domain/unique-contact-conflict.error';
import {
  CustomerProfileRepositoryPort,
  UpdateCustomerProfileInput,
} from '@/modules/users/ports/customer-profile.repository.port';
import { CustomerProfile } from '@/shared/types';

function isPostgresUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driver = error.driverError;
  return (
    typeof driver === 'object' &&
    driver !== null &&
    'code' in driver &&
    (driver as { code: string }).code === '23505'
  );
}

type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  avatar_url: string | null;
  xp_points: number;
  membership_level: number;
  created_at: Date;
  updated_at: Date;
  nickname: string | null;
  date_of_birth: string | null;
  country: string | null;
  gender: CustomerGender | null;
  address: string | null;
};

@Injectable()
export class TypeOrmCustomerProfileRepository implements CustomerProfileRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
  ) {}

  async findProfileByUserId(userId: string): Promise<CustomerProfile | null> {
    const rows = await this.users.manager.query<ProfileRow[]>(
      `SELECT
         u.id,
         u.email,
         u.phone,
         c.display_name,
         c.avatar_url,
         c.xp_points,
         c.membership_level,
         c.created_at,
         c.updated_at,
         c.nickname,
         c.date_of_birth,
         c.country,
         c.gender,
         c.address
       FROM users u
       JOIN customers c ON c.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId],
    );
    const row = rows[0];
    return row ? this.toProfile(row) : null;
  }

  async updateProfile(userId: string, input: UpdateCustomerProfileInput): Promise<CustomerProfile> {
    try {
      const user = await this.users.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const customer = await this.customers.findOne({ where: { userId } });
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (input.email !== undefined) {
        user.email = input.email;
      }
      if (input.phoneNumber !== undefined) {
        user.phone = input.phoneNumber;
      }
      if (input.displayName !== undefined) {
        customer.displayName = input.displayName;
      }
      if (input.avatarUrl !== undefined) {
        customer.avatarUrl = input.avatarUrl;
      }
      if (input.nickname !== undefined) {
        customer.nickname = input.nickname;
      }
      if (input.dateOfBirth !== undefined) {
        customer.dateOfBirth = input.dateOfBirth;
      }
      if (input.country !== undefined) {
        customer.country = input.country;
      }
      if (input.gender !== undefined) {
        customer.gender = input.gender;
      }
      if (input.address !== undefined) {
        customer.address = input.address;
      }

      await this.users.save(user);
      await this.customers.save(customer);

      const profile = await this.findProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found after update');
      }
      return profile;
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error)) {
        throw new UniqueContactConflictError();
      }
      throw error;
    }
  }

  async setAvatarUrl(userId: string, avatarUrl: string): Promise<string> {
    await this.customers.update({ userId }, { avatarUrl });
    return avatarUrl;
  }

  private toProfile(row: ProfileRow): CustomerProfile {
    return {
      id: row.id,
      email: row.email ?? '',
      phoneNumber: row.phone ?? '',
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      xpPoints: row.xp_points,
      level: row.membership_level,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      nickname: row.nickname,
      dateOfBirth: row.date_of_birth,
      country: row.country,
      gender: row.gender,
      address: row.address,
    };
  }
}
