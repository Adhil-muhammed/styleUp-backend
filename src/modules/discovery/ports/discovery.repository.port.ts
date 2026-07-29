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

export const DISCOVERY_REPOSITORY = Symbol('DISCOVERY_REPOSITORY');

export interface DiscoveryRepositoryPort {
  /** Active service categories (status = 'active'), ordered by name. */
  findActiveCategories(): Promise<{ id: string; name: string; iconUrl: string | null }[]>;

  /** First active, non-expired banner ordered by sort_order. Returns null if none. */
  findActiveBanner(): Promise<HomeBanner | null>;

  /**
   * Up to `limit` approved shops closest to `geo`, ordered by distance.
   * When `geo` is null, distance values in the returned cards will be null
   * and ordering is by avg_rating DESC.
   */
  findNearestSalons(geo: DiscoveryGeoPoint | null, limit: number): Promise<SalonCard[]>;

  /** Up to `limit` approved shops ordered by avg_rating DESC, review_count DESC. */
  findPopularSalons(geo: DiscoveryGeoPoint | null, limit: number): Promise<SalonCard[]>;

  /** Map pins for all approved shops within radiusMeters of geo. */
  findMapPins(geo: DiscoveryGeoPoint, radiusMeters: number): Promise<MapPin[]>;

  /** Service area circles for shops within radius that have service_radius_meters set. */
  findServiceAreaCircles(
    geo: DiscoveryGeoPoint,
    radiusMeters: number,
  ): Promise<ServiceAreaCircle[]>;

  /**
   * Active shop_services for a specific shop, joined to catalog_services.
   * Throws when the shop does not exist or is not approved.
   */
  findQuickBookServices(shopId: string): Promise<QuickBookService[]>;

  /**
   * Active shop_services for the nearest approved shop to geo.
   * Returns empty array when no approved shops are found within 50 km.
   */
  findQuickBookServicesNearby(geo: DiscoveryGeoPoint): Promise<QuickBookService[]>;

  /** Paginated, filtered salon list for search + category screens. */
  searchSalons(filters: SalonSearchFilters): Promise<PaginatedSalons>;

  /**
   * Active staff members optionally ordered by proximity.
   * When geo is null, ordering is by shop avg_rating DESC.
   */
  findPopularArtists(geo: DiscoveryGeoPoint | null, limit: number): Promise<PopularArtist[]>;

  /**
   * Verify a service_category exists.
   * Returns the category or null if it does not exist.
   */
  findCategoryById(
    categoryId: string,
  ): Promise<{ id: string; name: string; iconUrl: string | null } | null>;

  /**
   * Returns true when an approved, non-deleted shop with the given id exists.
   */
  shopExists(shopId: string): Promise<boolean>;
}
