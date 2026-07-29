import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SHOP_PROFILE_REPOSITORY,
  ShopProfileRepositoryPort,
} from '@/modules/shops/ports/shop-profile.repository.port';
import {
  ServiceVariant,
  ShopPackageDetail,
  ShopProfile,
  ShopProfileGender,
  ShopSpecialist,
} from '@/shared/types';

export interface GetShopByIdResult {
  shop: ShopProfile;
  currency: string;
}

export interface GetShopPackageByIdResult {
  package: ShopPackageDetail['package'];
  shopName: string;
  currency: string;
}

export interface GetShopCategoryVariantsResult {
  variants: ServiceVariant[];
  currency: string;
}

export interface GetShopSpecialistsResult {
  specialists: ShopSpecialist[];
}

@Injectable()
export class ShopsService {
  private static readonly DEFAULT_CURRENCY = 'INR';

  constructor(
    @Inject(SHOP_PROFILE_REPOSITORY)
    private readonly repo: ShopProfileRepositoryPort,
  ) {}

  async getShopById(shopId: string): Promise<GetShopByIdResult> {
    const core = await this.repo.findApprovedShopById(shopId);
    if (!core) {
      throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Shop not found' });
    }

    const [heroImages, specialists, workingHours, isOpen, serviceCategories, packages] =
      await Promise.all([
        this.repo.findHeroImageUrls(core.id, core.coverImageUrl),
        this.repo.findSpecialists(core.id),
        this.repo.findWorkingHours(core.id),
        this.repo.isShopOpenNow(core.id),
        this.repo.findServiceCategories(core.id),
        this.repo.findPackages(core.id),
      ]);

    return {
      shop: {
        id: core.id,
        name: core.name,
        isOpen,
        address: core.address,
        rating: core.avgRating,
        reviewCount: core.reviewCount,
        phone: core.phone,
        about: core.about ?? '',
        heroImages,
        specialists,
        workingHours,
        serviceCategories,
        packages,
        latitude: core.latitude,
        longitude: core.longitude,
      },
      currency: ShopsService.DEFAULT_CURRENCY,
    };
  }

  async getShopPackageById(shopId: string, packageId: string): Promise<GetShopPackageByIdResult> {
    const shop = await this.repo.findApprovedShopById(shopId);
    if (!shop) {
      throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Shop not found' });
    }

    const detail = await this.repo.findPackageById(shopId, packageId);
    if (!detail) {
      throw new NotFoundException({
        code: 'PACKAGE_NOT_FOUND',
        message: 'Package not found for shop',
      });
    }

    return {
      package: detail.package,
      shopName: detail.shopName,
      currency: ShopsService.DEFAULT_CURRENCY,
    };
  }

  async getCategoryVariants(
    shopId: string,
    categoryId: string,
    gender: ShopProfileGender,
  ): Promise<GetShopCategoryVariantsResult> {
    const shop = await this.repo.findApprovedShopById(shopId);
    if (!shop) {
      throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Shop not found' });
    }

    const variants = await this.repo.findVariants(shopId, categoryId, gender);
    if (variants.length === 0) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_SUPPORTED',
        message: 'Category has no variants for shop',
      });
    }

    return {
      variants,
      currency: ShopsService.DEFAULT_CURRENCY,
    };
  }

  async getSpecialists(shopId: string): Promise<GetShopSpecialistsResult> {
    const shop = await this.repo.findApprovedShopById(shopId);
    if (!shop) {
      throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Shop not found' });
    }

    const specialists = await this.repo.findSpecialists(shopId);
    return { specialists };
  }
}
