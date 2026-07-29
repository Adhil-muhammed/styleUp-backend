import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { ShopGalleryEntity } from '@/infra/persistence/postgres/merchant/shop-gallery.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import {
  ShopStatus,
  StaffWorkflowStatus,
} from '@/infra/persistence/postgres/merchant/merchant.enums';
import { ScheduleEntity } from '@/infra/persistence/postgres/scheduling/schedule.entity';
import { ScheduleType } from '@/infra/persistence/postgres/scheduling/scheduling.enums';
import { PackageEntity } from '@/infra/persistence/postgres/catalog/package.entity';
import { PackageItemEntity } from '@/infra/persistence/postgres/catalog/package-item.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { CatalogServiceEntity } from '@/infra/persistence/postgres/catalog/catalog-service.entity';
import { ServiceCategoryEntity } from '@/infra/persistence/postgres/catalog/service-category.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { ShopProfileRepositoryPort } from '@/modules/shops/ports/shop-profile.repository.port';
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

const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

@Injectable()
export class TypeOrmShopProfileRepository implements ShopProfileRepositoryPort {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shops: Repository<ShopEntity>,
    @InjectRepository(ShopGalleryEntity)
    private readonly gallery: Repository<ShopGalleryEntity>,
    @InjectRepository(StaffEntity)
    private readonly staff: Repository<StaffEntity>,
    @InjectRepository(ScheduleEntity)
    private readonly schedules: Repository<ScheduleEntity>,
    @InjectRepository(PackageEntity)
    private readonly packages: Repository<PackageEntity>,
    @InjectRepository(PackageItemEntity)
    private readonly packageItems: Repository<PackageItemEntity>,
    @InjectRepository(ShopServiceEntity)
    private readonly shopServices: Repository<ShopServiceEntity>,
    @InjectRepository(CatalogServiceEntity)
    private readonly catalogServices: Repository<CatalogServiceEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private readonly categories: Repository<ServiceCategoryEntity>,
    @InjectRepository(BookingItemEntity)
    private readonly bookingItems: Repository<BookingItemEntity>,
  ) {}

  async findApprovedShopById(shopId: string): Promise<ApprovedShopCore | null> {
    const rows = await this.shops
      .createQueryBuilder('s')
      .select([
        's.id AS id',
        's.name AS name',
        's.address AS address',
        's.phone AS phone',
        's.about AS about',
        's.coverImageUrl AS cover_image_url',
        's.avgRating AS avg_rating',
        's.reviewCount AS review_count',
        'ST_Y(s.location::geometry) AS latitude',
        'ST_X(s.location::geometry) AS longitude',
      ])
      .where('s.id = :shopId', { shopId })
      .andWhere("s.status = 'approved'")
      .andWhere('s.deletedAt IS NULL')
      .getRawOne<{
        id: string;
        name: string;
        address: string;
        phone: string;
        about: string | null;
        cover_image_url: string | null;
        avg_rating: string;
        review_count: number;
        latitude: number;
        longitude: number;
      }>();

    if (!rows) {
      return null;
    }

    return {
      id: rows.id,
      name: rows.name,
      address: rows.address,
      phone: rows.phone,
      about: rows.about,
      coverImageUrl: rows.cover_image_url,
      avgRating: Number(rows.avg_rating),
      reviewCount: Number(rows.review_count),
      latitude: Number(rows.latitude),
      longitude: Number(rows.longitude),
    };
  }

  async findHeroImageUrls(shopId: string, coverImageUrl: string | null): Promise<string[]> {
    const images = await this.gallery.find({
      where: { shopId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const urls = images.map((img) => img.url).filter((url) => url.length > 0);
    if (urls.length > 0) {
      return urls;
    }
    return coverImageUrl ? [coverImageUrl] : [];
  }

  async findSpecialists(shopId: string): Promise<ShopSpecialist[]> {
    const rows = await this.staff.find({
      where: { shopId, workflowStatus: StaffWorkflowStatus.ACTIVE, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.jobTitle,
      avatarUri: row.avatarUrl ?? '',
    }));
  }

  async findWorkingHours(shopId: string): Promise<WorkingHoursRow[]> {
    const rows = await this.schedules.find({
      where: { shopId, scheduleType: ScheduleType.SHOP_OPERATING_HOURS },
      order: { dayOfWeek: 'ASC' },
    });

    return rows.map((row) => {
      const dayLabel = DAY_LABELS[row.dayOfWeek] ?? `Day ${row.dayOfWeek}`;
      const label = row.label?.trim() || dayLabel;
      if (row.isClosed || !row.startTime || !row.endTime) {
        return { label, hours: 'Closed' };
      }
      return {
        label,
        hours: `${this.formatTime(row.startTime)} - ${this.formatTime(row.endTime)}`,
      };
    });
  }

  async isShopOpenNow(shopId: string): Promise<boolean> {
    const result = await this.schedules.manager.query<{ is_open: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1
           FROM schedules sch
          WHERE sch.shop_id = $1
            AND sch.schedule_type = 'shop_operating_hours'
            AND sch.staff_id IS NULL
            AND sch.is_closed = FALSE
            AND sch.start_time IS NOT NULL
            AND sch.end_time IS NOT NULL
            AND sch.day_of_week = EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))::smallint
            AND (sch.effective_from IS NULL OR sch.effective_from <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
            AND (sch.effective_to IS NULL OR sch.effective_to >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
            AND (NOW() AT TIME ZONE 'Asia/Kolkata')::time >= sch.start_time
            AND (NOW() AT TIME ZONE 'Asia/Kolkata')::time < sch.end_time
       ) AS is_open`,
      [shopId],
    );
    return Boolean(result[0]?.is_open);
  }

  async findServiceCategories(shopId: string): Promise<ShopServiceCategorySummary[]> {
    const rows = await this.categories
      .createQueryBuilder('c')
      .innerJoin(CatalogServiceEntity, 'cs', 'cs.categoryId = c.id AND cs.deletedAt IS NULL')
      .innerJoin(
        ShopServiceEntity,
        'ss',
        'ss.catalogServiceId = cs.id AND ss.shopId = :shopId AND ss.isActive = TRUE',
        { shopId },
      )
      .where("c.status = 'active'")
      .select('c.id', 'id')
      .addSelect('c.name', 'name')
      .addSelect('COUNT(ss.id)::int', 'variant_count')
      .groupBy('c.id')
      .addGroupBy('c.name')
      .orderBy('c.name', 'ASC')
      .getRawMany<{ id: string; name: string; variant_count: number }>();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      variantCount: Number(row.variant_count),
    }));
  }

  async findPackages(shopId: string): Promise<ShopPackageCard[]> {
    const pkgs = await this.packages.find({
      where: { shopId, isActive: true },
      order: { name: 'ASC' },
    });
    if (pkgs.length === 0) {
      return [];
    }
    const includedByPackage = await this.loadIncludedServices(pkgs.map((p) => p.id));
    return pkgs.map((pkg) => this.toPackageCard(pkg, includedByPackage.get(pkg.id) ?? []));
  }

  async findPackageById(shopId: string, packageId: string): Promise<ShopPackageDetail | null> {
    const pkg = await this.packages.findOne({
      where: { id: packageId, shopId, isActive: true },
    });
    if (!pkg) {
      return null;
    }
    const shop = await this.shops.findOne({
      where: { id: shopId, status: ShopStatus.APPROVED },
    });
    if (!shop) {
      return null;
    }
    const included = await this.loadIncludedServices([pkg.id]);
    return {
      package: this.toPackageCard(pkg, included.get(pkg.id) ?? []),
      shopName: shop.name,
    };
  }

  async findVariants(
    shopId: string,
    categoryId: string,
    gender: ShopProfileGender,
  ): Promise<ServiceVariant[]> {
    const genderValues = gender === 'man' ? ['male', 'unisex'] : ['female', 'unisex'];

    const rows = await this.shopServices
      .createQueryBuilder('ss')
      .innerJoin(CatalogServiceEntity, 'cs', 'cs.id = ss.catalogServiceId')
      .where('ss.shopId = :shopId', { shopId })
      .andWhere('ss.isActive = TRUE')
      .andWhere('cs.categoryId = :categoryId', { categoryId })
      .andWhere('cs.deletedAt IS NULL')
      .andWhere('cs.isActive = TRUE')
      .andWhere('cs.targetGender IN (:...genderValues)', { genderValues })
      .select([
        'ss.id AS id',
        'cs.categoryId AS category_id',
        'cs.targetGender AS target_gender',
        'cs.name AS title',
        'cs.imageUrl AS image_url',
        'ss.pricePaise AS price_paise',
      ])
      .orderBy('ss.sortOrder', 'ASC')
      .addOrderBy('cs.name', 'ASC')
      .getRawMany<{
        id: string;
        category_id: string;
        target_gender: string;
        title: string;
        image_url: string | null;
        price_paise: string;
      }>();

    if (rows.length === 0) {
      return [];
    }

    const bookedCounts = await this.countBookingsByShopServiceIds(rows.map((r) => r.id));

    return rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      gender: this.mapGenderForResponse(row.target_gender, gender),
      title: row.title,
      imageUri: row.image_url ?? '',
      bookedCount: bookedCounts.get(row.id) ?? 0,
      priceCents: Math.round(Number(row.price_paise) / 100),
    }));
  }

  private async countBookingsByShopServiceIds(
    shopServiceIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (shopServiceIds.length === 0) {
      return map;
    }

    const rows = await this.bookingItems
      .createQueryBuilder('bi')
      .select('bi.shop_service_id', 'shop_service_id')
      .addSelect('COUNT(bi.id)::int', 'cnt')
      .where('bi.shop_service_id IN (:...ids)', { ids: shopServiceIds })
      .andWhere("bi.item_status NOT IN ('cancelled', 'no_show')")
      .groupBy('bi.shop_service_id')
      .getRawMany<{ shop_service_id: string; cnt: number }>();

    for (const row of rows) {
      map.set(row.shop_service_id, Number(row.cnt));
    }
    return map;
  }

  private async loadIncludedServices(packageIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (packageIds.length === 0) {
      return map;
    }

    const items = await this.packageItems.find({
      where: { packageId: In(packageIds) },
    });
    if (items.length === 0) {
      return map;
    }

    const shopServiceIds = [...new Set(items.map((i) => i.shopServiceId))];
    const services = await this.shopServices.find({ where: { id: In(shopServiceIds) } });
    const catalogIds = [...new Set(services.map((s) => s.catalogServiceId))];
    const catalogs = await this.catalogServices.find({ where: { id: In(catalogIds) } });

    const catalogNameById = new Map(catalogs.map((c) => [c.id, c.name]));
    const catalogIdByShopService = new Map(services.map((s) => [s.id, s.catalogServiceId]));

    for (const item of items) {
      const catalogId = catalogIdByShopService.get(item.shopServiceId);
      const name = catalogId ? catalogNameById.get(catalogId) : undefined;
      if (!name) {
        continue;
      }
      const list = map.get(item.packageId) ?? [];
      list.push(name);
      map.set(item.packageId, list);
    }
    return map;
  }

  private toPackageCard(pkg: PackageEntity, includedServices: string[]): ShopPackageCard {
    return {
      id: pkg.id,
      title: pkg.name,
      subtitle: pkg.subtitle ?? '',
      priceCents: Math.round(Number(pkg.pricePaise) / 100),
      imageUri: pkg.imageUrl ?? '',
      description: pkg.description ?? '',
      detailImageUri: pkg.detailImageUrl ?? '',
      includedServices,
    };
  }

  private mapGenderForResponse(
    targetGender: string,
    requestGender: ShopProfileGender,
  ): ShopProfileGender {
    if (targetGender === 'male') {
      return 'man';
    }
    if (targetGender === 'female') {
      return 'woman';
    }
    return requestGender;
  }

  private formatTime(value: string | Date): string {
    if (typeof value === 'string') {
      return value.slice(0, 5);
    }
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
