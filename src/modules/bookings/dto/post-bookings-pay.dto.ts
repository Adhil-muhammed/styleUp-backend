import { IsUUID } from 'class-validator';

export class PostBookingsPayDto {
  @IsUUID()
  paymentMethodId!: string;
}
