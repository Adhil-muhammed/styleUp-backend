import { ShopsController } from './shops.controller';
import type { ShopsService } from './shops.service';

describe('ShopsController', () => {
  const mockShopsService = {
    getShopById: jest.fn(),
    getShopPackageById: jest.fn(),
    getCategoryVariants: jest.fn(),
    getSpecialists: jest.fn(),
  };

  const controller = () => new ShopsController(mockShopsService as unknown as ShopsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getShopById wraps service result in success envelope', async () => {
    mockShopsService.getShopById.mockResolvedValue({
      shop: { id: 'shop-1', name: 'Test' },
      currency: 'INR',
    });

    const result = await controller().getShopById('shop-1', {});

    expect(mockShopsService.getShopById).toHaveBeenCalledWith('shop-1');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      shop: { id: 'shop-1', name: 'Test' },
      currency: 'INR',
    });
  });

  it('getShopPackageById passes shopId and packageId', async () => {
    mockShopsService.getShopPackageById.mockResolvedValue({
      package: { id: 'pkg-1' },
      shopName: 'Test',
      currency: 'INR',
    });

    await controller().getShopPackageById('shop-1', 'pkg-1', {});

    expect(mockShopsService.getShopPackageById).toHaveBeenCalledWith('shop-1', 'pkg-1');
  });

  it('getCategoryVariants passes gender from query', async () => {
    mockShopsService.getCategoryVariants.mockResolvedValue({
      variants: [],
      currency: 'INR',
    });

    await controller().getCategoryVariants('shop-1', 'cat-1', { gender: 'woman' });

    expect(mockShopsService.getCategoryVariants).toHaveBeenCalledWith('shop-1', 'cat-1', 'woman');
  });

  it('getSpecialists passes shopId', async () => {
    mockShopsService.getSpecialists.mockResolvedValue({ specialists: [] });

    await controller().getSpecialists('shop-1');

    expect(mockShopsService.getSpecialists).toHaveBeenCalledWith('shop-1');
  });
});
