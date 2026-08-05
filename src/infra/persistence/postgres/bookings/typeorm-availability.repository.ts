import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleEntity } from '@/infra/persistence/postgres/scheduling/schedule.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { ScheduleType } from '@/infra/persistence/postgres/scheduling/scheduling.enums';
import { StaffWorkflowStatus } from '@/infra/persistence/postgres/merchant/merchant.enums';
import { BookingItemStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';
import {
  AvailabilityRepositoryPort,
  GetTimeSlotsInput,
} from '@/modules/bookings/ports/availability.repository.port';
import { TimeSlot } from '@/shared/types';

/** Default slot length in minutes. */
const SLOT_DURATION_MINUTES = 30;
/** Look-ahead window for available dates. */
const DEFAULT_AVAILABILITY_DAYS = 30;

@Injectable()
export class TypeOrmAvailabilityRepository implements AvailabilityRepositoryPort {
  constructor(
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
    @InjectRepository(BookingItemEntity)
    private readonly bookingItemRepo: Repository<BookingItemEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  async getAvailableDates(
    shopId: string,
    fromDateYmd: string,
    days: number = DEFAULT_AVAILABILITY_DAYS,
  ): Promise<string[]> {
    const openSchedules = await this.scheduleRepo.find({
      where: {
        shopId,
        scheduleType: ScheduleType.SHOP_OPERATING_HOURS,
        isClosed: false,
      },
      select: { dayOfWeek: true },
    });

    const openDays = new Set(openSchedules.map((s) => s.dayOfWeek));
    const result: string[] = [];

    const from = this.parseDate(fromDateYmd);
    for (let i = 0; i < days; i++) {
      const date = new Date(from);
      date.setDate(from.getDate() + i);
      // ISO day: 1=Monday, 7=Sunday; JS getDay: 0=Sunday, 1=Monday
      const isoDow = date.getDay() === 0 ? 7 : date.getDay();
      if (openDays.has(isoDow)) {
        result.push(this.formatDateYmd(date));
      }
    }

    // schedule_exceptions intentionally not checked in v1 (known gap — flagged in plan §6)
    return result;
  }

  async getTimeSlots(input: GetTimeSlotsInput): Promise<TimeSlot[]> {
    const { shopId, dateYmd, specialistId } = input;
    const targetDow = this.getIsoDayOfWeek(this.parseDate(dateYmd));

    const schedule = await this.scheduleRepo.findOne({
      where: {
        shopId,
        scheduleType: ScheduleType.SHOP_OPERATING_HOURS,
        dayOfWeek: targetDow,
        isClosed: false,
      },
    });

    if (!schedule || !schedule.startTime || !schedule.endTime) {
      return [];
    }

    const slots = this.generateSlots(dateYmd, schedule.startTime, schedule.endTime);
    if (!specialistId || slots.length === 0) {
      return slots;
    }

    const dayStart = this.toIstMidnight(dateYmd);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const bookedItems = await this.bookingItemRepo
      .createQueryBuilder('bi')
      .select(['bi.scheduledStart', 'bi.scheduledEnd'])
      .where('bi.staffId = :staffId', { staffId: specialistId })
      .andWhere('bi.scheduledStart >= :dayStart', { dayStart })
      .andWhere('bi.scheduledEnd <= :dayEnd', { dayEnd })
      .andWhere('bi.itemStatus NOT IN (:...excluded)', {
        excluded: [BookingItemStatus.CANCELLED, BookingItemStatus.NO_SHOW],
      })
      .getMany();

    return slots.filter((slot) => {
      const slotStart = this.slotIdToDate(dateYmd, slot.id);
      const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60_000);
      return !bookedItems.some((bi) => bi.scheduledStart < slotEnd && bi.scheduledEnd > slotStart);
    });
  }

  async specialistBelongsToShop(shopId: string, specialistId: string): Promise<boolean> {
    const count = await this.staffRepo.count({
      where: {
        id: specialistId,
        shopId,
        workflowStatus: StaffWorkflowStatus.ACTIVE,
      },
    });
    return count > 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseDate(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!));
  }

  private formatDateYmd(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private getIsoDayOfWeek(date: Date): number {
    const jsDay = date.getUTCDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  /** Midnight IST (UTC+5:30) for the given date string, returned as UTC. */
  private toIstMidnight(dateYmd: string): Date {
    return new Date(`${dateYmd}T00:00:00+05:30`);
  }

  /** Convert slot id (HHmm) on dateYmd to a UTC Date. */
  slotIdToDate(dateYmd: string, slotId: string): Date {
    const hh = slotId.slice(0, 2);
    const mm = slotId.slice(2, 4);
    return new Date(`${dateYmd}T${hh}:${mm}:00+05:30`);
  }

  private generateSlots(dateYmd: string, startTime: string, endTime: string): TimeSlot[] {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startTotalMins = startH! * 60 + startM!;
    const endTotalMins = endH! * 60 + endM!;

    const slots: TimeSlot[] = [];
    for (
      let t = startTotalMins;
      t + SLOT_DURATION_MINUTES <= endTotalMins;
      t += SLOT_DURATION_MINUTES
    ) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const id = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
      const label = this.formatSlotLabel(h, m);
      slots.push({ id, label });
    }
    return slots;
  }

  private formatSlotLabel(h: number, m: number): string {
    const period = h < 12 ? 'AM' : 'PM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = String(m).padStart(2, '0');
    return `${displayH}:${displayM} ${period}`;
  }
}
