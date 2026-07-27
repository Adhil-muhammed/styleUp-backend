import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import { CustomerEntity } from '@/infra/persistence/postgres/auth/customer.entity';
import { RoleEntity } from '@/infra/persistence/postgres/auth/role.entity';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { UserIdentityEntity } from '@/infra/persistence/postgres/auth/user-identity.entity';
import { UserRoleEntity } from '@/infra/persistence/postgres/auth/user-role.entity';
import { IdentityProvider } from '@/infra/persistence/postgres/auth/auth.enums';
import { UniqueContactConflictError } from '@/modules/auth/domain/unique-contact-conflict.error';
import { User } from '@/modules/auth/domain/types';
import {
  CreateCustomerUserInput,
  UserRepositoryPort,
} from '@/modules/auth/ports/user.repository.port';

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

@Injectable()
export class TypeOrmUserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(UserIdentityEntity)
    private readonly identities: Repository<UserIdentityEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.users.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (!row) {
      return null;
    }
    return this.toDomain(row);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const row = await this.users.findOne({
      where: { phone, deletedAt: IsNull() },
    });
    if (!row) {
      return null;
    }
    return this.toDomain(row);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.users.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!row) {
      return null;
    }
    return this.toDomain(row);
  }

  async findByIdentity(provider: string, providerId: string): Promise<User | null> {
    const identity = await this.identities.findOne({
      where: { provider: provider as IdentityProvider, providerId },
    });
    if (!identity) {
      return null;
    }
    return this.findById(identity.userId);
  }

  async createCustomerUser(input: CreateCustomerUserInput): Promise<User> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const now = new Date();
        const user = manager.create(UserEntity, {
          email: input.email,
          phone: input.phone,
          passwordHash: null,
          emailVerifiedAt: input.emailVerifiedAt ?? null,
          phoneVerifiedAt: input.phoneVerifiedAt ?? null,
          isActive: true,
        });
        const savedUser = await manager.save(user);

        const customer = manager.create(CustomerEntity, {
          userId: savedUser.id,
          displayName: input.displayName,
          avatarUrl: null,
          nickname: null,
          dateOfBirth: null,
          gender: null,
          country: null,
          xpPoints: 0,
          membershipLevel: 1,
        });
        await manager.save(customer);

        const customerRole = await manager.findOne(RoleEntity, {
          where: { name: 'customer' },
        });
        if (!customerRole) {
          throw new Error('System role "customer" is not seeded');
        }

        const userRole = manager.create(UserRoleEntity, {
          userId: savedUser.id,
          roleId: customerRole.id,
          shopId: null,
          assignedAt: now,
        });
        await manager.save(userRole);

        return {
          id: savedUser.id,
          email: savedUser.email,
          phone: savedUser.phone,
          displayName: customer.displayName,
          avatarUrl: customer.avatarUrl,
          isActive: savedUser.isActive,
          createdAt: savedUser.createdAt.toISOString(),
        };
      });
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error)) {
        throw new UniqueContactConflictError(input.email ?? input.phone ?? undefined);
      }
      throw error;
    }
  }

  async markEmailVerified(userId: string, at: Date): Promise<void> {
    await this.users.update({ id: userId }, { emailVerifiedAt: at });
  }

  async markPhoneVerified(userId: string, at: Date): Promise<void> {
    await this.users.update({ id: userId }, { phoneVerifiedAt: at });
  }

  async linkIdentity(userId: string, provider: string, providerId: string): Promise<void> {
    const existing = await this.identities.findOne({
      where: { provider: provider as IdentityProvider, providerId },
    });
    if (existing) {
      return;
    }
    const row = this.identities.create({
      userId,
      provider: provider as IdentityProvider,
      providerId,
    });
    await this.identities.save(row);
  }

  private async toDomain(user: UserEntity): Promise<User> {
    const customer = await this.customers.findOne({ where: { userId: user.id } });
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: customer?.displayName ?? '',
      avatarUrl: customer?.avatarUrl ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
