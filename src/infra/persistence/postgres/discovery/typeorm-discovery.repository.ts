import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscoveryRepositoryPort } from '@/modules/discovery/ports/discovery.repository.port';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { ServiceCategoryEntity } from '@/infra/persistence/postgres/catalog/service-category.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { HomeBannerEntity } from '@/infra/persistence/postgres/merchant/home-banner.entity';
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

/** Default nearby radius used when caller doesn't supply one (50 km). */
const NEARBY_RADIUS_METERS = 50_000;

@Injectable()
export class TypeOrmDiscoveryRepository implements DiscoveryRepositoryPort {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shops: Repository<ShopEntity>,

    @InjectRepository(StaffEntity)
    private readonly staff: Repository<StaffEntity>,

    @InjectRepository(ServiceCategoryEntity)
    private readonly categories: Repository<ServiceCategoryEntity>,

    @InjectRepository(ShopServiceEntity)
    private readonly shopServices: Repository<ShopServiceEntity>,

    @InjectRepository(HomeBannerEntity)
    private readonly banners: Repository<HomeBannerEntity>,
  ) {}

  async findActiveCategories(): Promise<{ id: string; name: string; iconUrl: string | null }[]> {
    const rows = await this.categories
      .createQueryBuilder('sc')
      .select(['sc.id', 'sc.name', 'sc.iconUrl'])
      .where('sc.status = :status', { status: 'active' })
      .orderBy('sc.name', 'ASC')
      .getMany();

    return rows.map((r) => ({ id: r.id, name: r.name, iconUrl: r.iconUrl }));
  }

  async findActiveBanner(): Promise<HomeBanner | null> {
    const now = new Date();
    const banner = await this.banners
      .createQueryBuilder('b')
      .where('b.isActive = TRUE')
      .andWhere('b.validFrom <= :now', { now })
      .andWhere('b.validUntil > :now', { now })
      .orderBy('b.sortOrder', 'ASC')
      .getOne();

    if (!banner) return null;

    return {
      discountLabel: banner.discountLabel,
      subtitle: banner.subtitle,
      imageUri: banner.imageUrl,
      ctaLabel: banner.ctaLabel,
    };
  }

  async findNearestSalons(geo: DiscoveryGeoPoint | null, limit: number): Promise<SalonCard[]> {
    const qb = this.shops
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.address', 's.avgRating', 's.coverImageUrl'])
      .where("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL')
      .limit(limit);

    if (geo) {
      qb.addSelect(
        `ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0`,
        'distance_km',
      )
        .setParameter('lat', geo.lat)
        .setParameter('lng', geo.lng)
        .orderBy('distance_km', 'ASC');
    } else {
      qb.addSelect('NULL', 'distance_km').orderBy('s.avgRating', 'DESC');
    }

    const raw = await qb.getRawAndEntities();
    return this.toSalonCards(raw.entities, raw.raw);
  }

  async findPopularSalons(geo: DiscoveryGeoPoint | null, limit: number): Promise<SalonCard[]> {
    const qb = this.shops
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.address', 's.avgRating', 's.coverImageUrl'])
      .where("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL')
      .orderBy('s.avgRating', 'DESC')
      .addOrderBy('s.reviewCount', 'DESC')
      .limit(limit);

    if (geo) {
      qb.addSelect(
        `ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0`,
        'distance_km',
      )
        .setParameter('lat', geo.lat)
        .setParameter('lng', geo.lng);
    } else {
      qb.addSelect('NULL', 'distance_km');
    }

    const raw = await qb.getRawAndEntities();
    return this.toSalonCards(raw.entities, raw.raw);
  }

  async findMapPins(geo: DiscoveryGeoPoint, radiusMeters: number): Promise<MapPin[]> {
    const rows = await this.shops
      .createQueryBuilder('s')
      .select([
        's.id          AS id',
        's.name        AS name',
        's.isFeatured  AS is_featured',
        's.coverImageUrl AS avatar_uri',
        's.avgRating   AS avg_rating',
        `ST_X(s.location::geometry) AS longitude`,
        `ST_Y(s.location::geometry) AS latitude`,
        `COALESCE((
          SELECT MIN(ss.price_paise)
            FROM shop_services ss
           WHERE ss.shop_id = s.id AND ss.is_active = TRUE
        ), 0) AS min_price_paise`,
      ])
      .where("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL')
      .andWhere(
        `ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
      )
      .setParameters({ lat: geo.lat, lng: geo.lng, radius: radiusMeters })
      .getRawMany<{
        id: string;
        name: string;
        is_featured: boolean;
        avatar_uri: string | null;
        avg_rating: string;
        longitude: number;
        latitude: number;
        min_price_paise: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUri: r.avatar_uri ?? '',
      label: null,
      priceCents: r.min_price_paise ? Math.round(Number(r.min_price_paise) / 100) : null,
      variant: r.is_featured ? 'primary' : 'accent',
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      size: this.ratingToSize(Number(r.avg_rating)),
    }));
  }

  async findServiceAreaCircles(
    geo: DiscoveryGeoPoint,
    radiusMeters: number,
  ): Promise<ServiceAreaCircle[]> {
    const rows = await this.shops
      .createQueryBuilder('s')
      .select([
        's.id                  AS id',
        `ST_X(s.location::geometry) AS longitude`,
        `ST_Y(s.location::geometry) AS latitude`,
        's.serviceRadiusMeters AS radius_meters',
      ])
      .where("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL')
      .andWhere('s.serviceRadiusMeters IS NOT NULL')
      .andWhere(
        `ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
      )
      .setParameters({ lat: geo.lat, lng: geo.lng, radius: radiusMeters })
      .getRawMany<{ id: string; longitude: number; latitude: number; radius_meters: number }>();

    return rows.map((r) => ({
      id: r.id,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      radiusMeters: r.radius_meters,
    }));
  }

  async findQuickBookServices(shopId: string): Promise<QuickBookService[]> {
    return this.buildQuickBookQuery(shopId);
  }

  async findQuickBookServicesNearby(geo: DiscoveryGeoPoint): Promise<QuickBookService[]> {
    const nearest = await this.shops
      .createQueryBuilder('s')
      .select('s.id')
      .where("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL')
      .andWhere(
        `ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
      )
      .setParameters({ lat: geo.lat, lng: geo.lng, radius: NEARBY_RADIUS_METERS })
      .orderBy(
        `ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)`,
        'ASC',
      )
      .getOne();

    if (!nearest) return [];
    return this.buildQuickBookQuery(nearest.id);
  }

  async shopExists(shopId: string): Promise<boolean> {
    const count = await this.shops
      .createQueryBuilder('s')
      .where('s.id = :id', { id: shopId })
      .andWhere("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL')
      .getCount();
    return count > 0;
  }

  async searchSalons(filters: SalonSearchFilters): Promise<PaginatedSalons> {
    const { q, geo, serviceIds, minRating, gender, maxDistanceKm, categoryId, page, perPage } =
      filters;

    const qb = this.shops
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.address', 's.avgRating', 's.coverImageUrl'])
      .where("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL');

    if (q) {
      qb.andWhere('s.name ILIKE :q', { q: `%${q}%` });
    }

    if (minRating !== undefined) {
      qb.andWhere('s.avgRating >= :minRating', { minRating });
    }

    if (geo && maxDistanceKm !== undefined) {
      qb.andWhere(
        `ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :maxRadius)`,
      )
        .setParameter('lat', geo.lat)
        .setParameter('lng', geo.lng)
        .setParameter('maxRadius', maxDistanceKm * 1000);
    }

    // Gender / service-id / category filters require a sub-select to avoid duplicates.
    const needsServiceJoin =
      (serviceIds && serviceIds.length > 0) || gender !== undefined || categoryId !== undefined;

    if (needsServiceJoin) {
      const sub = this.shopServices
        .createQueryBuilder('ss')
        .innerJoin('ss.catalogService', 'cs')
        .select('ss.shopId')
        .where('ss.isActive = TRUE');

      if (serviceIds && serviceIds.length > 0) {
        sub.andWhere('cs.id IN (:...serviceIds)', { serviceIds });
      }

      if (gender && gender !== 'all') {
        const genderValues = gender === 'man' ? ["'male'", "'unisex'"] : ["'female'", "'unisex'"];
        sub.andWhere(`cs.target_gender IN (${genderValues.join(',')})`);
      }

      if (categoryId) {
        sub.andWhere('cs.categoryId = :categoryId', { categoryId });
      }

      qb.andWhere(`s.id IN (${sub.getQuery()})`).setParameters(sub.getParameters());
    }

    if (geo) {
      qb.addSelect(
        `ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:sLng, :sLat), 4326)::geography) / 1000.0`,
        'distance_km',
      )
        .setParameter('sLat', geo.lat)
        .setParameter('sLng', geo.lng)
        .orderBy('distance_km', 'ASC');
    } else {
      qb.addSelect('NULL', 'distance_km').orderBy('s.avgRating', 'DESC');
    }

    const total = await qb.getCount();

    const offset = (page - 1) * perPage;
    const raw = await qb.limit(perPage).offset(offset).getRawAndEntities();

    const data = this.toSalonCards(raw.entities, raw.raw);
    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findPopularArtists(geo: DiscoveryGeoPoint | null, limit: number): Promise<PopularArtist[]> {
    const qb = this.staff
      .createQueryBuilder('st')
      .innerJoin('st.shop', 'sh')
      .select(['st.id', 'st.name', 'st.jobTitle', 'st.avatarUrl', 'st.shopId'])
      .where("st.workflowStatus = 'active'")
      .andWhere('st.deletedAt IS NULL')
      .andWhere("sh.status = 'approved'")
      .andWhere('sh.deletedAt IS NULL')
      .limit(limit);

    if (geo) {
      qb.addOrderBy(
        `ST_Distance(sh.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)`,
        'ASC',
      )
        .setParameter('lat', geo.lat)
        .setParameter('lng', geo.lng);
    } else {
      qb.addOrderBy('sh.avgRating', 'DESC');
    }

    const rows = await qb.getMany();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.jobTitle,
      imageUri: r.avatarUrl,
      shopId: r.shopId,
    }));
  }

  async findCategoryById(
    categoryId: string,
  ): Promise<{ id: string; name: string; iconUrl: string | null } | null> {
    const row = await this.categories
      .createQueryBuilder('sc')
      .select(['sc.id', 'sc.name', 'sc.iconUrl'])
      .where('sc.id = :id', { id: categoryId })
      .getOne();

    if (!row) return null;
    return { id: row.id, name: row.name, iconUrl: row.iconUrl };
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  private async buildQuickBookQuery(shopId: string): Promise<QuickBookService[]> {
    const rows = await this.shopServices
      .createQueryBuilder('ss')
      .innerJoinAndSelect('ss.catalogService', 'cs')
      .where('ss.shopId = :shopId', { shopId })
      .andWhere('ss.isActive = TRUE')
      .orderBy('ss.sortOrder', 'ASC')
      .getMany();

    return rows.map((r) => ({
      id: r.id,
      title: r.catalogService.name,
      subtitle: r.catalogService.description,
      badge: r.catalogService.badge,
      priceCents: Math.round(Number(r.pricePaise) / 100),
      imageUri: r.catalogService.imageUrl,
    }));
  }

  private toSalonCards(entities: ShopEntity[], rawRows: Record<string, unknown>[]): SalonCard[] {
    return entities.map((e, i) => ({
      shopId: e.id,
      name: e.name,
      address: e.address,
      rating: Number(e.avgRating),
      imageUri: e.coverImageUrl ?? '',
      distanceKm: rawRows[i]?.['distance_km'] != null ? Number(rawRows[i]?.['distance_km']) : null,
    }));
  }

  /** Map avg_rating (0–5) to a discrete display size (1–3). */
  private ratingToSize(rating: number): number {
    if (rating >= 4.5) return 3;
    if (rating >= 3.5) return 2;
    return 1;
  }
}
