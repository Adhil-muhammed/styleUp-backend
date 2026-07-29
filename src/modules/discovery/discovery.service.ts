import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DISCOVERY_REPOSITORY,
  DiscoveryRepositoryPort,
} from '@/modules/discovery/ports/discovery.repository.port';
import {
  DiscoveryGeoPoint,
  HomeBanner,
  MapPin,
  PaginatedSalons,
  PopularArtist,
  QuickBookService,
  SalonCard,
  SalonSearchFilters,
  ServiceAreaCircle,
} from '@/shared/types';

export interface HomeData {
  categories: { id: string; label: string; imageUri: string }[];
  promo: HomeBanner | null;
  nearestSalons: SalonCard[];
  popularSalons: SalonCard[];
  userLocationLabel: string;
  currency: string;
}

export interface DiscoverMapData {
  pins: MapPin[];
  serviceAreaCircles: ServiceAreaCircle[];
  currency: string;
}

export interface QuickBookServicesData {
  services: QuickBookService[];
  currency: string;
}

export interface SearchSalonsData extends PaginatedSalons {
  currency: string;
}

export interface PopularArtistsData {
  artists: PopularArtist[];
}

export interface CategorySalonsData extends PaginatedSalons {
  category: { id: string; label: string; imageUri: string };
  currency: string;
}

@Injectable()
export class DiscoveryService {
  private static readonly DEFAULT_CURRENCY = 'INR';
  private static readonly POPULAR_LIMIT = 10;
  private static readonly NEAREST_LIMIT = 10;
  private static readonly DEFAULT_MAP_RADIUS_KM = 10;

  constructor(
    @Inject(DISCOVERY_REPOSITORY)
    private readonly repo: DiscoveryRepositoryPort,
  ) {}

  async getHome(geo: DiscoveryGeoPoint | null): Promise<HomeData> {
    const [categories, promo, nearestSalons, popularSalons] = await Promise.all([
      this.repo.findActiveCategories(),
      this.repo.findActiveBanner(),
      this.repo.findNearestSalons(geo, DiscoveryService.NEAREST_LIMIT),
      this.repo.findPopularSalons(geo, DiscoveryService.POPULAR_LIMIT),
    ]);

    const userLocationLabel = nearestSalons[0]?.address.split(',').at(-1)?.trim() ?? '';

    return {
      categories: categories.map((c) => ({
        id: c.id,
        label: c.name,
        imageUri: c.iconUrl ?? '',
      })),
      promo,
      nearestSalons,
      popularSalons,
      userLocationLabel,
      currency: DiscoveryService.DEFAULT_CURRENCY,
    };
  }

  async getDiscoverMap(
    geo: DiscoveryGeoPoint,
    radiusKm: number = DiscoveryService.DEFAULT_MAP_RADIUS_KM,
  ): Promise<DiscoverMapData> {
    const radiusMeters = radiusKm * 1000;

    const [pins, serviceAreaCircles] = await Promise.all([
      this.repo.findMapPins(geo, radiusMeters),
      this.repo.findServiceAreaCircles(geo, radiusMeters),
    ]);

    return {
      pins,
      serviceAreaCircles,
      currency: DiscoveryService.DEFAULT_CURRENCY,
    };
  }

  async getQuickBookServices(
    geo: DiscoveryGeoPoint,
    shopId?: string,
  ): Promise<QuickBookServicesData> {
    if (shopId) {
      const exists = await this.repo.shopExists(shopId);
      if (!exists) {
        throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Shop not found' });
      }
      const services = await this.repo.findQuickBookServices(shopId);
      return { services, currency: DiscoveryService.DEFAULT_CURRENCY };
    }

    const services = await this.repo.findQuickBookServicesNearby(geo);
    return { services, currency: DiscoveryService.DEFAULT_CURRENCY };
  }

  async searchSalons(filters: SalonSearchFilters): Promise<SearchSalonsData> {
    const paginated = await this.repo.searchSalons(filters);
    return { ...paginated, currency: DiscoveryService.DEFAULT_CURRENCY };
  }

  async getPopularArtists(
    geo: DiscoveryGeoPoint | null,
    limit: number,
  ): Promise<PopularArtistsData> {
    const artists = await this.repo.findPopularArtists(geo, limit);
    return { artists };
  }

  async getCategorySalons(
    categoryId: string,
    filters: Omit<SalonSearchFilters, 'categoryId'>,
  ): Promise<CategorySalonsData> {
    const category = await this.repo.findCategoryById(categoryId);
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    const paginated = await this.repo.searchSalons({ ...filters, categoryId });

    return {
      category: { id: category.id, label: category.name, imageUri: category.iconUrl ?? '' },
      ...paginated,
      currency: DiscoveryService.DEFAULT_CURRENCY,
    };
  }
}
