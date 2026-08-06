import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { BookingTimelineEntity } from '@/infra/persistence/postgres/transactions/booking-timeline.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { PackageEntity } from '@/infra/persistence/postgres/catalog/package.entity';
import { PackageItemEntity } from '@/infra/persistence/postgres/catalog/package-item.entity';
import { CatalogServiceEntity } from '@/infra/persistence/postgres/catalog/catalog-service.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import {
  BookingStatus,
  BookingPaymentStatus,
  BookingItemStatus,
  TimelineEventType,
} from '@/infra/persistence/postgres/transactions/transactions.enums';
import {
  BookingRepositoryPort,
  CreateBookingInput,
} from '@/modules/bookings/ports/booking.repository.port';
import {
  BookingConfirmation,
  BookingCreated,
  BookingQuote,
  ResolvedServiceLine,
} from '@/shared/types';

const CURRENCY = 'INR';
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns true when `err` is a PostgreSQL exclusion constraint violation
 * (SQLSTATE 23P01). This fires when two concurrent inserts both pass the
 * app-level isSlotTaken check but the DB EXCLUDE constraint stops the second
 * one. Without this catch the transaction would surface as a 500.
 */
function isExclusionViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>)['code'] === '23P01'
  );
}

function formatIstDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

@Injectable()
export class TypeOrmBookingRepository implements BookingRepositoryPort {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingItemEntity)
    private readonly bookingItemRepo: Repository<BookingItemEntity>,
    @InjectRepository(ShopServiceEntity)
    private readonly shopServiceRepo: Repository<ShopServiceEntity>,
    @InjectRepository(PackageEntity)
    private readonly packageRepo: Repository<PackageEntity>,
    @InjectRepository(PackageItemEntity)
    private readonly packageItemRepo: Repository<PackageItemEntity>,
    @InjectRepository(CatalogServiceEntity)
    private readonly catalogServiceRepo: Repository<CatalogServiceEntity>,
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  async resolveServiceLines(
    shopId: string,
    shopServiceIds: string[],
    packageId: string | null,
  ): Promise<ResolvedServiceLine[]> {
    const lines: ResolvedServiceLine[] = [];

    if (shopServiceIds.length > 0) {
      const services = await this.shopServiceRepo
        .createQueryBuilder('ss')
        .innerJoinAndSelect('ss.catalogService', 'cs')
        .where('ss.id IN (:...ids)', { ids: shopServiceIds })
        .andWhere('ss.shopId = :shopId', { shopId })
        .andWhere('ss.isActive = true')
        .getMany();

      for (const svc of services) {
        lines.push({
          label: svc.catalogService.name,
          shopServiceId: svc.id,
          packageId: null,
          pricePaise: BigInt(svc.pricePaise),
          durationMinutes: svc.durationMinutes,
        });
      }
    }

    if (packageId) {
      const pkg = await this.packageRepo.findOne({ where: { id: packageId, shopId } });
      if (pkg) {
        lines.push({
          label: pkg.name,
          shopServiceId: null,
          packageId: pkg.id,
          pricePaise: BigInt(pkg.pricePaise),
          durationMinutes: 60,
        });
      }
    }

    return lines;
  }

  async isSlotTaken(staffId: string, start: Date, end: Date): Promise<boolean> {
    const count = await this.bookingItemRepo
      .createQueryBuilder('bi')
      .where('bi.staffId = :staffId', { staffId })
      .andWhere('bi.scheduledStart < :end', { end })
      .andWhere('bi.scheduledEnd > :start', { start })
      .andWhere('bi.itemStatus NOT IN (:...excluded)', {
        excluded: [BookingItemStatus.CANCELLED, BookingItemStatus.NO_SHOW],
      })
      .getCount();
    return count > 0;
  }

  async hasDoubleBooking(customerId: string, start: Date, end: Date): Promise<boolean> {
    const count = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin(BookingItemEntity, 'bi', 'bi.bookingId = b.id')
      .where('b.customerId = :customerId', { customerId })
      .andWhere('bi.scheduledStart < :end', { end })
      .andWhere('bi.scheduledEnd > :start', { start })
      .andWhere('b.bookingStatus NOT IN (:...excluded)', {
        excluded: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      })
      .getCount();
    return count > 0;
  }

  async createBooking(input: CreateBookingInput): Promise<BookingCreated> {
    const { shopId, customerId, scheduledStart, scheduledEnd, totalPricePaise, items } = input;

    try {
      return await this.em.transaction(async (tx) => {
        const booking = tx.create(BookingEntity, {
          shopId,
          customerId,
          bookingStatus: BookingStatus.PENDING,
          paymentStatus: BookingPaymentStatus.PENDING,
          scheduledStart,
          scheduledEnd,
          totalPricePaise: String(totalPricePaise),
        });
        const savedBooking = await tx.save(BookingEntity, booking);

        for (const item of items) {
          const bookingItem = tx.create(BookingItemEntity, {
            bookingId: savedBooking.id,
            staffId: item.staffId,
            shopServiceId: item.shopServiceId,
            packageId: item.packageId,
            scheduledStart: item.scheduledStart,
            scheduledEnd: item.scheduledEnd,
            durationMinutes: item.durationMinutes,
            unitPricePaise: String(item.unitPricePaise),
            itemStatus: BookingItemStatus.PENDING,
          });
          await tx.save(BookingItemEntity, bookingItem);
        }

        const timeline = tx.create(BookingTimelineEntity, {
          bookingId: savedBooking.id,
          eventType: TimelineEventType.CREATED,
          note: null,
        });
        await tx.save(BookingTimelineEntity, timeline);

        return this.buildBookingCreated(savedBooking, input, tx);
      });
    } catch (err: unknown) {
      if (isExclusionViolation(err)) {
        throw new ConflictException({
          code: 'SLOT_ALREADY_BOOKED',
          message: 'This time slot is no longer available',
        });
      }
      throw err;
    }
  }

  async findByIdForCustomer(bookingId: string, customerId: string): Promise<BookingCreated | null> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, customerId },
    });
    if (!booking) return null;

    return this.buildBookingCreated(booking, null, this.em);
  }

  async getConfirmation(
    bookingId: string,
    customerId: string,
  ): Promise<BookingConfirmation | null> {
    type ConfirmationRow = {
      booking_id: string;
      shop_name: string;
      shop_address: string;
      scheduled_start: Date;
      total_price_paise: string;
      booking_status: string;
      service_name: string | null;
    };

    const rows = await this.bookingRepo.manager.query<ConfirmationRow[]>(
      `SELECT
         b.id              AS booking_id,
         s.name            AS shop_name,
         s.address         AS shop_address,
         b.scheduled_start,
         b.total_price_paise,
         b.booking_status,
         cs.name           AS service_name
       FROM bookings b
       JOIN shops s ON s.id = b.shop_id
       LEFT JOIN booking_items bi ON bi.booking_id = b.id
       LEFT JOIN shop_services ss ON ss.id = bi.shop_service_id
       LEFT JOIN catalog_services cs ON cs.id = ss.catalog_service_id
       WHERE b.id = $1 AND b.customer_id = $2`,
      [bookingId, customerId],
    );

    if (rows.length === 0) return null;

    const first = rows[0]!;
    const services = rows.map((r) => r.service_name).filter((n): n is string => n !== null);

    const dateTimeLabel = formatIstDateTime(first.scheduled_start);

    return {
      bookingId: first.booking_id,
      shopName: first.shop_name,
      shopAddress: first.shop_address,
      dateTimeLabel,
      services,
      totalCents: Math.round(Number(first.total_price_paise) / 100),
      currency: CURRENCY,
      status: first.booking_status,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async buildBookingCreated(
    booking: BookingEntity,
    input: CreateBookingInput | null,
    tx: EntityManager,
  ): Promise<BookingCreated> {
    type ItemRow = {
      unit_price_paise: string;
      service_name: string | null;
      package_name: string | null;
    };

    const itemRows = await tx.query<ItemRow[]>(
      `SELECT
         bi.unit_price_paise,
         cs.name  AS service_name,
         pk.name  AS package_name
       FROM booking_items bi
       LEFT JOIN shop_services ss  ON ss.id = bi.shop_service_id
       LEFT JOIN catalog_services cs ON cs.id = ss.catalog_service_id
       LEFT JOIN packages pk ON pk.id = bi.package_id
       WHERE bi.booking_id = $1`,
      [booking.id],
    );

    const lineItems = itemRows.map((r) => ({
      label: r.service_name ?? r.package_name ?? 'Service',
      amountCents: Math.round(Number(r.unit_price_paise) / 100),
    }));

    const totalCents = Math.round(Number(booking.totalPricePaise) / 100);

    const quote: BookingQuote = {
      lineItems,
      totalCents,
      currency: CURRENCY,
    };

    const customer = await this.resolveCustomer(booking.customerId, tx);

    const shop = await tx.findOne(ShopEntity, { where: { id: booking.shopId } });
    const specialist = input
      ? await tx.findOne(StaffEntity, { where: { id: input.staffId } })
      : null;

    const dateTimeLabel = formatIstDateTime(booking.scheduledStart);

    const bookingDetails: { label: string; value: string; emphasizeValue?: boolean }[] = [
      { label: 'Shop', value: shop?.name ?? '' },
      { label: 'Date & Time', value: dateTimeLabel, emphasizeValue: true },
    ];
    if (specialist) {
      bookingDetails.push({ label: 'Specialist', value: specialist.name });
    }

    return {
      bookingId: booking.id,
      status: booking.bookingStatus,
      quote,
      customer,
      bookingDetails,
    };
  }

  private async resolveCustomer(
    customerId: string,
    tx: EntityManager,
  ): Promise<{ name: string; phone: string }> {
    type CustomerRow = { display_name: string; phone: string | null };
    const rows = await tx.query<CustomerRow[]>(
      `SELECT c.display_name, u.phone
       FROM customers c
       JOIN users u ON u.id = c.user_id
       WHERE c.user_id = $1`,
      [customerId],
    );
    const row = rows[0];
    return {
      name: row?.display_name ?? '',
      phone: row?.phone ?? '',
    };
  }
}
