import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from '@/infra/persistence/postgres/transactions/payment.entity';
import {
  PaymentMethod,
  TransactionStatus,
} from '@/infra/persistence/postgres/transactions/transactions.enums';
import {
  CreatePendingPaymentInput,
  PaymentRecord,
  PaymentRepositoryPort,
} from '@/modules/payments/ports/payment.repository.port';

const GATEWAY = 'razorpay';

function toRecord(entity: PaymentEntity): PaymentRecord {
  return {
    id: entity.id,
    bookingId: entity.bookingId,
    gateway: entity.gateway,
    gatewayOrderId: entity.gatewayOrderId,
    gatewayTransactionId: entity.gatewayTransactionId,
    amountPaise: entity.amountPaise,
    transactionStatus: entity.transactionStatus,
    version: entity.version,
  };
}

@Injectable()
export class TypeOrmPaymentRepository implements PaymentRepositoryPort {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repo: Repository<PaymentEntity>,
  ) {}

  async createPending(input: CreatePendingPaymentInput): Promise<PaymentRecord> {
    const entity = this.repo.create({
      bookingId: input.bookingId,
      gateway: GATEWAY,
      gatewayOrderId: null,
      gatewayTransactionId: null,
      paymentMethod: PaymentMethod.UPI,
      amountPaise: input.amountPaise,
      refundedAmountPaise: '0',
      transactionStatus: TransactionStatus.PENDING,
      rawResponse: null,
      paidAt: null,
    });
    const saved = await this.repo.save(entity);
    return toRecord(saved);
  }

  async findActiveByBookingId(bookingId: string): Promise<PaymentRecord | null> {
    const row = await this.repo.findOne({
      where: [
        { bookingId, transactionStatus: TransactionStatus.PENDING },
        { bookingId, transactionStatus: TransactionStatus.PROCESSING },
      ],
      order: { createdAt: 'DESC' },
    });
    return row ? toRecord(row) : null;
  }

  async findByGatewayOrderId(orderId: string): Promise<PaymentRecord | null> {
    const row = await this.repo.findOne({ where: { gatewayOrderId: orderId } });
    return row ? toRecord(row) : null;
  }

  async findByGatewayTransactionId(transactionId: string): Promise<PaymentRecord | null> {
    const row = await this.repo.findOne({ where: { gatewayTransactionId: transactionId } });
    return row ? toRecord(row) : null;
  }

  async markProcessing(
    id: string,
    gatewayOrderId: string,
    version: number,
  ): Promise<PaymentRecord> {
    const result = await this.repo.update(
      { id, version },
      {
        gatewayOrderId,
        transactionStatus: TransactionStatus.PROCESSING,
      },
    );
    if (result.affected === 0) {
      throw new Error('PAYMENT_VERSION_CONFLICT');
    }
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return toRecord(updated);
  }

  async markSuccess(
    id: string,
    gatewayTransactionId: string,
    rawResponse: Record<string, unknown>,
    paidAt: Date,
    version: number,
  ): Promise<PaymentRecord> {
    const entity = await this.repo.findOne({ where: { id, version } });
    if (!entity) {
      throw new Error('PAYMENT_VERSION_CONFLICT');
    }

    entity.gatewayTransactionId = gatewayTransactionId;
    entity.transactionStatus = TransactionStatus.SUCCESS;
    entity.rawResponse = rawResponse;
    entity.paidAt = paidAt;

    const updated = await this.repo.save(entity);
    return toRecord(updated);
  }

  async markFailed(
    id: string,
    rawResponse: Record<string, unknown>,
    version: number,
  ): Promise<PaymentRecord> {
    const entity = await this.repo.findOne({ where: { id, version } });
    if (!entity) {
      throw new Error('PAYMENT_VERSION_CONFLICT');
    }

    entity.transactionStatus = TransactionStatus.FAILED;
    entity.rawResponse = rawResponse;

    const updated = await this.repo.save(entity);
    return toRecord(updated);
  }
}
