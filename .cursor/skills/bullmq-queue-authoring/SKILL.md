---
name: bullmq-queue-authoring
description: Scaffold and wire a new BullMQ async queue in this NestJS backend. Use when adding a new queue, job processor, or producer service — e.g. rating recompute, push notifications, email dispatch, report generation. Covers constants, producer, processor, module wiring, and AppModule integration.
---

# BullMQ Queue Authoring

## Steps

1. **Create `src/modules/<domain>/<domain>.constants.ts`**
   - Export a `SCREAMING_SNAKE_CASE` queue name constant.
   - Export a `<Domain>JobData` interface (no `any`).

2. **Create `<domain>-producer.service.ts`**
   - `@Injectable()` + `@InjectQueue(QUEUE_NAME)` in constructor.
   - One public method per job type, named `enqueue<Action>`.
   - Set `jobId` to the primary entity key when deduplication is needed.
   - Always include `removeOnComplete: true`, `removeOnFail: 5`, `attempts: 3`, `backoff`.

3. **Create `<domain>.processor.ts`**
   - Extend `WorkerHost`, annotate `@Processor(QUEUE_NAME)`.
   - Implement `async process(job: Job<JobData>): Promise<void>`.
   - Prefer raw `manager.query(sql, [params])` for aggregates.
   - Log outcome at `logger.log` level.

4. **Create `<domain>.module.ts`**
   ```typescript
   @Module({
     imports: [
       BullModule.registerQueue({ name: QUEUE_NAME }),
       TypeOrmModule.forFeature([RelevantEntity]),
     ],
     providers: [ProducerService, Processor],
     exports: [ProducerService],
   })
   ```

5. **Wire into `AppModule`** (only if `BullModule.forRootAsync` is not already present)
   ```typescript
   BullModule.forRootAsync({
     inject: [ConfigService],
     useFactory: (config: ConfigService) => {
       const url = config.get<string>('redis.url');
       return url ? { connection: { url } } : { connection: { host, port, password } };
     },
   }),
   ```
   Then add the new module to `imports`.

6. **Run verification**
   ```bash
   pnpm run build   # must exit 0
   pnpm run lint    # must exit 0
   ```

## Call site pattern

Import the domain module in any feature module that needs to trigger the job, then inject the producer:

```typescript
// In the feature module imports:
RatingModule,   // ← exposes RatingProducerService

// In the feature service:
constructor(private readonly ratingProducer: RatingProducerService) {}
await this.ratingProducer.enqueueShopRatingRecompute(shopId);
```

## Checklist

- [ ] Queue name constant defined and used everywhere (no inline strings)
- [ ] `JobData` interface has no `any`
- [ ] Producer uses `jobId` when deduplication is required
- [ ] Processor extends `WorkerHost` (not implements `Processor`)
- [ ] `BullModule.registerQueue` is in the domain module, not `AppModule`
- [ ] Producer exported from module so other modules can inject it
- [ ] `pnpm run build` exits 0
