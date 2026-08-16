export const WHATSAPP_IDEMPOTENCY_STORE = Symbol('WHATSAPP_IDEMPOTENCY_STORE');

export interface WhatsappIdempotencyStorePort {
  /**
   * Atomically claims an idempotency key (Redis SET NX or DB unique insert).
   *
   * @returns `true` when this caller won the claim (first delivery);
   *          `false` when the key already exists (duplicate webhook — skip processing).
   */
  tryClaim(key: string, ttlSeconds: number): Promise<boolean>;
}
