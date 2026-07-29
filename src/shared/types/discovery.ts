/**
 * Plain domain types for the Home & Discovery feature.
 * These are used as the contracts between the port interface and the service layer.
 * No framework or ORM imports allowed here.
 */

export interface SalonCard {
  shopId: string;
  name: string;
  address: string;
  /** Denormalized avg_rating from shops table (0–5, two decimal places). */
  rating: number;
  imageUri: string;
  /** Computed from PostGIS ST_Distance; null when caller did not provide coordinates. */
  distanceKm: number | null;
}

export interface MapPin {
  id: string;
  name: string | null;
  avatarUri: string;
  label: string | null;
  /** Smallest price_paise / 100 across active shop_services for this shop. */
  priceCents: number | null;
  variant: 'primary' | 'accent';
  latitude: number;
  longitude: number;
  /** Visual size hint; derived from avg_rating tier. */
  size: number;
}

export interface ServiceAreaCircle {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface QuickBookService {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  /** price_paise / 100 — always INR subunits divided by 100 for the client. */
  priceCents: number;
  imageUri: string | null;
}

export interface PopularArtist {
  id: string;
  name: string;
  /** Maps from staff.job_title. */
  role: string;
  imageUri: string | null;
  shopId: string;
}

export interface HomeBanner {
  discountLabel: string;
  subtitle: string;
  imageUri: string;
  ctaLabel: string;
}

export interface DiscoveryGeoPoint {
  lat: number;
  lng: number;
}

export interface SalonSearchFilters {
  q?: string;
  geo?: DiscoveryGeoPoint;
  serviceIds?: string[];
  minRating?: number;
  gender?: 'all' | 'man' | 'woman';
  maxDistanceKm?: number;
  categoryId?: string;
  page: number;
  perPage: number;
}

export interface PaginatedSalons {
  data: SalonCard[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}
