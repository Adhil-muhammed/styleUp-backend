import { TimeSlot } from '@/shared/types';

export const AVAILABILITY_REPOSITORY = Symbol('AVAILABILITY_REPOSITORY');

export interface GetTimeSlotsInput {
  shopId: string;
  /** ISO date string YYYY-MM-DD in Asia/Kolkata. */
  dateYmd: string;
  specialistId?: string;
}

export interface AvailabilityRepositoryPort {
  /**
   * Returns the list of YYYY-MM-DD date strings (up to `days` days starting
   * from `fromDateYmd`) on which the shop has open operating-hours schedules.
   * schedule_exceptions are not checked here (v1 known gap — flagged).
   */
  getAvailableDates(shopId: string, fromDateYmd: string, days: number): Promise<string[]>;

  /**
   * Returns 30-minute time slots within the shop's operating window for the
   * requested date, minus any windows already occupied in booking_items for
   * the given specialist (when `specialistId` is supplied).
   */
  getTimeSlots(input: GetTimeSlotsInput): Promise<TimeSlot[]>;

  /** Returns true when the staff member is active and belongs to the shop. */
  specialistBelongsToShop(shopId: string, specialistId: string): Promise<boolean>;
}
