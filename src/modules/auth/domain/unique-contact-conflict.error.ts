/** Thrown by user repository when a unique email/phone insert races. */
export class UniqueContactConflictError extends Error {
  constructor(readonly contactHint?: string) {
    super('Unique contact constraint violated');
    this.name = 'UniqueContactConflictError';
  }
}
