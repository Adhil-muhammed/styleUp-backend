/**
 * Domain types for Shop Profile & Service Selection.
 * No framework or ORM imports.
 */

export type ShopProfileGender = 'man' | 'woman';

export interface ShopSpecialist {
  id: string;
  name: string;
  role: string;
  avatarUri: string;
}

export interface WorkingHoursRow {
  label: string;
  hours: string;
}

export interface ShopServiceCategorySummary {
  id: string;
  name: string;
  variantCount: number;
}

export interface ShopPackageCard {
  id: string;
  title: string;
  subtitle: string;
  priceCents: number;
  imageUri: string;
  description: string;
  detailImageUri: string;
  includedServices: string[];
}

export interface ShopProfile {
  id: string;
  name: string;
  isOpen: boolean;
  address: string;
  rating: number;
  reviewCount: number;
  phone: string;
  about: string;
  heroImages: string[];
  specialists: ShopSpecialist[];
  workingHours: WorkingHoursRow[];
  serviceCategories: ShopServiceCategorySummary[];
  packages: ShopPackageCard[];
  latitude: number;
  longitude: number;
}

export interface ShopPackageDetail {
  package: ShopPackageCard;
  shopName: string;
}

export interface ServiceVariant {
  id: string;
  categoryId: string;
  gender: ShopProfileGender;
  title: string;
  imageUri: string;
  bookedCount: number;
  priceCents: number;
}

/** Approved shop row needed to assemble the profile (without nested collections). */
export interface ApprovedShopCore {
  id: string;
  name: string;
  address: string;
  phone: string;
  about: string | null;
  coverImageUrl: string | null;
  avgRating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
}
