/** Fixed reminder offsets stored on bookings.reminder_option_id. */
export enum ReminderOption {
  MIN_30 = '30_min',
  HOUR_1 = '1_hour',
  HOUR_2 = '2_hour',
  DAY_1 = '1_day',
}

const REMINDER_LABELS: Record<ReminderOption, string> = {
  [ReminderOption.MIN_30]: '30 minutes before',
  [ReminderOption.HOUR_1]: '1 hour before',
  [ReminderOption.HOUR_2]: '2 hours before',
  [ReminderOption.DAY_1]: '1 day before',
};

const REMINDER_OFFSET_MS: Record<ReminderOption, number> = {
  [ReminderOption.MIN_30]: 30 * 60_000,
  [ReminderOption.HOUR_1]: 60 * 60_000,
  [ReminderOption.HOUR_2]: 2 * 60 * 60_000,
  [ReminderOption.DAY_1]: 24 * 60 * 60_000,
};

export function isReminderOption(value: string): value is ReminderOption {
  return Object.values(ReminderOption).includes(value as ReminderOption);
}

export function reminderLabel(optionId: ReminderOption | string | null): string {
  if (!optionId || !isReminderOption(optionId)) {
    return '';
  }
  return REMINDER_LABELS[optionId];
}

/** Milliseconds before scheduled_start when the reminder job should fire. */
export function reminderOffsetMs(optionId: ReminderOption): number {
  return REMINDER_OFFSET_MS[optionId];
}

export function computeReminderFireAt(scheduledStart: Date, optionId: ReminderOption): Date {
  return new Date(scheduledStart.getTime() - reminderOffsetMs(optionId));
}
