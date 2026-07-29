# styleUp-backend

## Testing Foundation

This repo uses Jest for unit and e2e tests.

### Unit Tests

- Run: `pnpm test`
- Watch mode: `pnpm test:watch`
- Coverage: `pnpm test:cov`

Unit suites should test service-layer business logic and mock hexagonal port tokens.

### E2E Tests (Real Local Stack)

E2E tests run against real HTTP endpoints and use local Postgres + Redis.

1. Start dependencies and migrate schema:
   - `pnpm run test:e2e:prep`
2. Run e2e suite:
   - `pnpm run test:e2e`
3. Stop local e2e dependencies when done:
   - `pnpm run test:e2e:down`

### Test Environment Notes

- E2E config lives in `test/jest-e2e.json`.
- Shared helpers live in `test/helpers`.
- `NODE_ENV=test` is enforced by `test/setup-env.ts`.
- `AUTH_OTP_TEST_CODE` is test-only and used for deterministic OTP verification in e2e.
- Never run destructive test helpers outside `NODE_ENV=test`.

### Troubleshooting

- If e2e fails on DB connectivity, ensure Docker services are healthy (`docker compose ps`).
- If migrations fail, verify `.env` Postgres values used by Flyway.
- If rate-limit tests fail intermittently, ensure Redis was cleared between tests and rerun with `--runInBand`.
