import { UsersController } from './users.controller';
import type { UsersService } from './users.service';

const mockService = {
  getMe: jest.fn(),
  patchMe: jest.fn(),
  createAvatarUpload: jest.fn(),
};

const controller = () => new UsersController(mockService as unknown as UsersService);

const AUTH = { userId: 'user-uuid', jti: 'jti-1', exp: 9999999999 };

describe('UsersController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getMe wraps profile in success envelope', async () => {
    mockService.getMe.mockResolvedValue({
      profile: { id: AUTH.userId, displayName: 'Test User' },
    });

    const result = await controller().getMe(AUTH);

    expect(result.success).toBe(true);
    expect(mockService.getMe).toHaveBeenCalledWith(AUTH.userId);
  });

  it('patchMe passes dto and auth userId', async () => {
    const dto = { displayName: 'Updated' };
    mockService.patchMe.mockResolvedValue({ profile: { displayName: 'Updated' } });

    const result = await controller().patchMe(AUTH, dto);

    expect(result.success).toBe(true);
    expect(mockService.patchMe).toHaveBeenCalledWith(AUTH.userId, dto);
  });

  it('uploadAvatar delegates to service', async () => {
    mockService.createAvatarUpload.mockResolvedValue({
      avatarUrl: 'https://cdn/avatar.jpg',
      uploadUrl: 'https://cdn/upload',
    });

    const result = await controller().uploadAvatar(AUTH);

    expect(result.success).toBe(true);
    expect(mockService.createAvatarUpload).toHaveBeenCalledWith(AUTH.userId);
  });
});
