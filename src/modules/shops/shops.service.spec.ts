import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  SHOP_PROFILE_REPOSITORY,
  ShopProfileRepositoryPort,
} from '@/modules/shops/ports/shop-profile.repository.port';
import { ShopsService } from './shops.service';
import type {
  ApprovedShopCore,
  ServiceVariant,
  ShopPackageCard,
  ShopPackageDetail,
  ShopSpecialist,
} from '@/shared/types';

type RepoMock = { [K in keyof ShopProfileRepositoryPort]: jest.Mock };

function createRepoMock(): RepoMock {
  return {
    findApprovedShopById: jest.fn(),
    findHeroImageUrls: jest.fn(),
    findSpecialists: jest.fn(),
    findWorkingHours: jest.fn(),
    isShopOpenNow: jest.fn(),
    findServiceCategories: jest.fn(),
    findPackages: jest.fn(),
    findPackageById: jest.fn(),
    findVariants: jest.fn(),
  };
}

const shopCore: ApprovedShopCore = {
  id: 'shop-1',
  name: "Meera's Cuts",
  address: 'Fort Kochi',
  phone: '+914843212345',
  about: 'Local barber shop',
  coverImageUrl: 'https://cdn.example/cover.jpg',
  avgRating: 4.5,
  reviewCount: 12,
  latitude: 9.9312,
  longitude: 76.2673,
};

const packageCard: ShopPackageCard = {
  id: 'pkg-1',
  title: 'Haircut Combo',
  subtitle: 'Wash + cut',
  priceCents: 499,
  imageUri: 'https://cdn.example/pkg.jpg',
  description: 'Full package',
  detailImageUri: 'https://cdn.example/pkg-detail.jpg',
  includedServices: ["Classic Men's Haircut"],
};

describe('ShopsService', () => {
  let service: ShopsService;
  let repo: RepoMock;

  beforeEach(async () => {
    repo = createRepoMock();
    const module = await Test.createTestingModule({
      providers: [ShopsService, { provide: SHOP_PROFILE_REPOSITORY, useValue: repo }],
    }).compile();
    service = module.get(ShopsService);
  });

  it('getShopById throws SHOP_NOT_FOUND when shop is missing', async () => {
    repo.findApprovedShopById.mockResolvedValue(null);

    await expect(service.getShopById('missing')).rejects.toMatchObject({
      status: 404,
      response: { code: 'SHOP_NOT_FOUND' },
    });
  });

  it('getShopById assembles profile with currency INR', async () => {
    const specialists: ShopSpecialist[] = [
      { id: 'staff-1', name: 'Rahul', role: 'Senior Barber', avatarUri: '' },
    ];

    repo.findApprovedShopById.mockResolvedValue(shopCore);
    repo.findHeroImageUrls.mockResolvedValue(['https://cdn.example/hero.jpg']);
    repo.findSpecialists.mockResolvedValue(specialists);
    repo.findWorkingHours.mockResolvedValue([{ label: 'Mon', hours: '09:00 - 20:00' }]);
    repo.isShopOpenNow.mockResolvedValue(true);
    repo.findServiceCategories.mockResolvedValue([
      { id: 'cat-1', name: 'Haircut', variantCount: 1 },
    ]);
    repo.findPackages.mockResolvedValue([packageCard]);

    const result = await service.getShopById('shop-1');

    expect(result.currency).toBe('INR');
    expect(result.shop).toMatchObject({
      id: 'shop-1',
      name: "Meera's Cuts",
      isOpen: true,
      about: 'Local barber shop',
      rating: 4.5,
      reviewCount: 12,
      specialists,
      packages: [packageCard],
    });
  });

  it('getShopPackageById throws PACKAGE_NOT_FOUND when package missing', async () => {
    repo.findApprovedShopById.mockResolvedValue(shopCore);
    repo.findPackageById.mockResolvedValue(null);

    await expect(service.getShopPackageById('shop-1', 'pkg-missing')).rejects.toMatchObject({
      status: 404,
      response: { code: 'PACKAGE_NOT_FOUND' },
    });
  });

  it('getShopPackageById returns package detail', async () => {
    const detail: ShopPackageDetail = {
      package: packageCard,
      shopName: "Meera's Cuts",
    };
    repo.findApprovedShopById.mockResolvedValue(shopCore);
    repo.findPackageById.mockResolvedValue(detail);

    const result = await service.getShopPackageById('shop-1', 'pkg-1');

    expect(result.currency).toBe('INR');
    expect(result.shopName).toBe("Meera's Cuts");
    expect(result.package.id).toBe('pkg-1');
  });

  it('getCategoryVariants throws CATEGORY_NOT_SUPPORTED when empty', async () => {
    repo.findApprovedShopById.mockResolvedValue(shopCore);
    repo.findVariants.mockResolvedValue([]);

    await expect(service.getCategoryVariants('shop-1', 'cat-1', 'man')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(service.getCategoryVariants('shop-1', 'cat-1', 'man')).rejects.toMatchObject({
      response: { code: 'CATEGORY_NOT_SUPPORTED' },
    });
  });

  it('getCategoryVariants returns variants with currency', async () => {
    const variants: ServiceVariant[] = [
      {
        id: 'ss-1',
        categoryId: 'cat-1',
        gender: 'man',
        title: "Classic Men's Haircut",
        imageUri: '',
        bookedCount: 3,
        priceCents: 299,
      },
    ];
    repo.findApprovedShopById.mockResolvedValue(shopCore);
    repo.findVariants.mockResolvedValue(variants);

    const result = await service.getCategoryVariants('shop-1', 'cat-1', 'man');

    expect(result.currency).toBe('INR');
    expect(result.variants).toEqual(variants);
  });

  it('getSpecialists throws SHOP_NOT_FOUND for unknown shop', async () => {
    repo.findApprovedShopById.mockResolvedValue(null);

    await expect(service.getSpecialists('missing')).rejects.toMatchObject({
      response: { code: 'SHOP_NOT_FOUND' },
    });
  });

  it('getSpecialists returns staff list', async () => {
    repo.findApprovedShopById.mockResolvedValue(shopCore);
    repo.findSpecialists.mockResolvedValue([
      { id: 'staff-1', name: 'Rahul', role: 'Senior Barber', avatarUri: '' },
    ]);

    const result = await service.getSpecialists('shop-1');

    expect(result.specialists).toHaveLength(1);
    expect(result.specialists[0]?.name).toBe('Rahul');
  });
});
