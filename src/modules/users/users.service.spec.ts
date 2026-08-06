import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UniqueContactConflictError } from '@/modules/auth/domain/unique-contact-conflict.error';
import {
  CUSTOMER_PROFILE_REPOSITORY,
  CustomerProfileRepositoryPort,
} from '@/modules/users/ports/customer-profile.repository.port';
import { AVATAR_STORAGE, AvatarStoragePort } from '@/modules/users/ports/avatar-storage.port';
import { UsersService } from './users.service';

type ProfileMock = { [K in keyof CustomerProfileRepositoryPort]: jest.Mock };
type AvatarMock = { [K in keyof AvatarStoragePort]: jest.Mock };

const USER_ID = 'user-uuid';

const mockProfile: NonNullable<
  Awaited<ReturnType<CustomerProfileRepositoryPort['findProfileByUserId']>>
> = {
  id: USER_ID,
  email: 'user@test.invalid',
  phoneNumber: '+919999999999',
  displayName: 'Test User',
  avatarUrl: null,
  xpPoints: 10,
  level: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: null,
  dateOfBirth: null,
  country: null,
  gender: null,
  address: null,
};

describe('UsersService', () => {
  let service: UsersService;
  let profileMock: ProfileMock;
  let avatarMock: AvatarMock;

  beforeEach(async () => {
    profileMock = {
      findProfileByUserId: jest.fn(),
      updateProfile: jest.fn(),
      setAvatarUrl: jest.fn(),
    };
    avatarMock = {
      createUploadUrl: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: CUSTOMER_PROFILE_REPOSITORY, useValue: profileMock },
        { provide: AVATAR_STORAGE, useValue: avatarMock },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('getMe returns profile', async () => {
    profileMock.findProfileByUserId.mockResolvedValue(mockProfile);

    const result = await service.getMe(USER_ID);

    expect(result.profile.displayName).toBe('Test User');
  });

  it('getMe throws when profile missing', async () => {
    profileMock.findProfileByUserId.mockResolvedValue(null);

    await expect(service.getMe(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('patchMe maps unique contact conflict to EMAIL_ALREADY_EXISTS', async () => {
    profileMock.updateProfile.mockRejectedValue(new UniqueContactConflictError());

    await expect(service.patchMe(USER_ID, { email: 'taken@test.invalid' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('createAvatarUpload stores avatar URL and returns upload info', async () => {
    profileMock.findProfileByUserId.mockResolvedValue(mockProfile);
    avatarMock.createUploadUrl.mockResolvedValue({
      uploadUrl: 'https://cdn/upload',
      avatarUrl: 'https://cdn/avatar.jpg',
    });
    profileMock.setAvatarUrl.mockResolvedValue('https://cdn/avatar.jpg');

    const result = await service.createAvatarUpload(USER_ID);

    expect(result.avatarUrl).toBe('https://cdn/avatar.jpg');
    expect(profileMock.setAvatarUrl).toHaveBeenCalledWith(USER_ID, 'https://cdn/avatar.jpg');
  });
});
