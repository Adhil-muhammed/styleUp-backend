import { TransactionStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';

const ALLOWED_TRANSITIONS: Readonly<Record<TransactionStatus, readonly TransactionStatus[]>> = {
  [TransactionStatus.PENDING]: [TransactionStatus.PROCESSING],
  [TransactionStatus.PROCESSING]: [TransactionStatus.SUCCESS, TransactionStatus.FAILED],
  [TransactionStatus.SUCCESS]: [],
  [TransactionStatus.FAILED]: [],
  [TransactionStatus.REFUNDED]: [],
  [TransactionStatus.PARTIALLY_REFUNDED]: [],
};

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TransactionStatus, to: TransactionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_PAYMENT_TRANSITION:${from}->${to}`);
  }
}
