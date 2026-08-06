import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@/modules/auth';
import { CustomerEntity } from '@/infra/persistence/postgres/auth/customer.entity';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { TypeOrmCustomerProfileRepository } from '@/infra/persistence/postgres/users/typeorm-customer-profile.repository';
import { MockAvatarStorageAdapter } from '@/infra/storage/mock-avatar-storage.adapter';
import { CUSTOMER_PROFILE_REPOSITORY } from '@/modules/users/ports/customer-profile.repository.port';
import { AVATAR_STORAGE } from '@/modules/users/ports/avatar-storage.port';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([UserEntity, CustomerEntity])],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: CUSTOMER_PROFILE_REPOSITORY, useClass: TypeOrmCustomerProfileRepository },
    { provide: AVATAR_STORAGE, useClass: MockAvatarStorageAdapter },
  ],
})
export class UsersModule {}
