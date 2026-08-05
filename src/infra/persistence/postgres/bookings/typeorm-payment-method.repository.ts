import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity } from '@/infra/persistence/postgres/transactions/payment-method.entity';
import { PaymentMethodRepositoryPort } from '@/modules/bookings/ports/payment-method.repository.port';
import { PaymentMethodItem, PaymentMethodsResult } from '@/shared/types';

@Injectable()
export class TypeOrmPaymentMethodRepository implements PaymentMethodRepositoryPort {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  async listForUser(userId: string): Promise<PaymentMethodsResult> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const methods: PaymentMethodItem[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      label: r.label,
      ...(r.lastFour ? { lastFour: r.lastFour } : {}),
    }));

    const defaultRow = rows.find((r) => r.isDefault);
    const defaultMethodId = defaultRow?.id ?? rows[0]?.id ?? '';

    return { methods, defaultMethodId };
  }

  async findById(id: string): Promise<PaymentMethodItem | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      kind: row.kind,
      label: row.label,
      ...(row.lastFour ? { lastFour: row.lastFour } : {}),
    };
  }
}
