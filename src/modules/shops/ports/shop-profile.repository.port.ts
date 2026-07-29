import {
  ApprovedShopCore,
  ServiceVariant,
  ShopPackageCard,
  ShopPackageDetail,
  ShopProfileGender,
  ShopServiceCategorySummary,
  ShopSpecialist,
  WorkingHoursRow,
} from '@/shared/types';

export const SHOP_PROFILE_REPOSITORY = Symbol('SHOP_PROFILE_REPOSITORY');

export interface ShopProfileRepositoryPort {
  findApprovedShopById(shopId: string): Promise<ApprovedShopCore | null>;

  findHeroImageUrls(shopId: string, coverImageUrl: string | null): Promise<string[]>;

  findSpecialists(shopId: string): Promise<ShopSpecialist[]>;

  findWorkingHours(shopId: string): Promise<WorkingHoursRow[]>;

  isShopOpenNow(shopId: string): Promise<boolean>;

  findServiceCategories(shopId: string): Promise<ShopServiceCategorySummary[]>;

  findPackages(shopId: string): Promise<ShopPackageCard[]>;

  findPackageById(shopId: string, packageId: string): Promise<ShopPackageDetail | null>;

  findVariants(
    shopId: string,
    categoryId: string,
    gender: ShopProfileGender,
  ): Promise<ServiceVariant[]>;
}
