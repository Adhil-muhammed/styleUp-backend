import { IsBoolean, IsIn, ValidateIf } from 'class-validator';
import { ReminderOption } from '@/modules/bookings/domain/reminder-option';

export class PatchBookingsReminderDto {
  @IsBoolean()
  reminderEnabled!: boolean;

  @ValidateIf((dto: PatchBookingsReminderDto) => dto.reminderEnabled === true)
  @IsIn(Object.values(ReminderOption))
  reminderOptionId?: ReminderOption;
}
