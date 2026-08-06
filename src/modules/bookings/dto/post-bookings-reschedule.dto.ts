import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class PostBookingsRescheduleDto {
  @IsDateString()
  selectedDateYmd!: string;

  @IsString()
  selectedTimeId!: string;

  @IsOptional()
  @IsUUID()
  selectedSpecialistId?: string;
}
