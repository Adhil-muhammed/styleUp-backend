# WhatsApp Messaging (MSG91)

StyleUp outbound WhatsApp uses a provider-swappable hexagonal design under `src/modules/messaging/`.

## Architecture

| Layer | Path | Role |
|---|---|---|
| Transport port | `ports/message-sender.port.ts` | `MESSAGE_SENDER.sendTemplate()` — MSG91 or console |
| Dispatch port | `ports/messaging-dispatch.port.ts` | Semantic booking methods (`sendBookingConfirmation`, etc.) |
| Audit | `ports/message-log.repository.port.ts` | `message_logs` row lifecycle |
| Adapters | `src/infra/messaging/msg91-whatsapp.sender.ts` | MSG91 HTTP bulk API |
| Async | `messaging-dispatch` BullMQ queue | Retries + idempotent send by logId |

**Inbound Meta webhook** stays in `src/modules/whatsapp/` — separate from outbound MSG91.

**Email OTP** (`otp-email-*`, `AuthService`, `EMAIL_SENDER`) is out of scope — never wire MSG91 into auth.

## Module hierarchy (critical)

`MessagingModule` is a low-level utility module. It **must not** import `BookingsModule`, `PaymentsModule`, or `NotificationsModule`.

Callers hydrate dispatch inputs before calling `MESSAGING_DISPATCH`:

1. Query booking context via `BOOKING_REPOSITORY.findMessagingContext()` or `BOOKING_PAYMENT.findMessagingContext()`
2. Build template variables with `buildBookingMessageVariables()` in `src/modules/bookings/domain/`
3. Pass `SendBookingMessageInput` `{ shopId, bookingId, recipient, variables }` to dispatch

## Provider selection

Env: `MESSAGING_WHATSAPP_PROVIDER=console|msg91`

Factory in `messaging.module.ts` (Razorpay pattern):

- `msg91` + `MSG91_AUTH_KEY` set → `Msg91WhatsappSender`
- otherwise → `ConsoleMessageSender`

When `MESSAGING_WHATSAPP_PROVIDER=msg91`, Joi requires:

- `MSG91_AUTH_KEY`
- `MSG91_WHATSAPP_INTEGRATED_NUMBER`
- `MSG91_NAMESPACE`

## Adding a new booking template type

1. Add enum value to `MessageTemplateType` in `ports/messaging-dispatch.port.ts`.
2. Add env key under `msg91.templates` in `configuration.ts` + `.env.example`.
3. Implement method on `MessagingDispatchService` (accepts pre-built `SendBookingMessageInput`).
4. Create and approve template in MSG91 dashboard (Meta utility category).
5. Wire trigger in caller module: hydrate context + variables, inject `MESSAGING_DISPATCH`.
6. Add unit test in `messaging-dispatch.service.spec.ts`.

## MSG91 dashboard setup

1. Complete Meta Business verification.
2. Connect WhatsApp number in MSG91.
3. Create utility templates (examples):
   - `booking_confirmation` — customer name, shop, date/time, payment ref
   - `booking_reminder` — customer name, shop, appointment time
   - `booking_cancellation` — customer name, shop, refund note
4. Copy `namespace` + template names to env.
5. Configure outbound webhook URL: `https://<host>/api/webhooks/msg91/whatsapp`
6. Optional: set `MSG91_WEBHOOK_SECRET` and send as header `x-msg91-webhook-secret`.

## Swapping provider

1. Implement `MessageSenderPort` in `src/infra/messaging/<provider>-whatsapp.sender.ts`.
2. Register provider class in `MessagingModule`.
3. Extend `MESSAGING_WHATSAPP_PROVIDER` enum + factory branch.
4. No changes needed in booking/payment/notification code — they use `MessagingDispatchService` only.

## Delivery status webhook

`POST /api/webhooks/msg91/whatsapp` (version-neutral)

Maps `message_uuid` / `request_id` → `message_logs.provider_message_id`:

| Webhook status | DB status |
|---|---|
| `delivered` | `delivered` + `delivered_at` |
| `read` | `read` + `read_at` |
| `failed` | `failed` + `failure_reason` |

Updates use **monotonic status ranks** — never downgrade (e.g. `read` is not overwritten by late `delivered` webhook):

`queued(1) → sent(2) → delivered(3) → read(4)` | `failed` terminal

Phone numbers sent to MSG91 are sanitized via `sanitizePhoneForMsg91()` (trim + strip leading `+`).

Template variables are transformed to MSG91 `body_N` components via `toMsg91Components()`.

## Testing checklist

```bash
pnpm run build
pnpm run lint
pnpm test
pnpm migrate   # applies V18+ if pending
```

Unit tests:

- `sanitize-phone-for-msg91.spec.ts` — phone sanitization
- `msg91-template-variables.spec.ts` — variable → body_N mapping
- `typeorm-message-log.repository.spec.ts` — monotonic status rank updates
- `messaging-dispatch.service.spec.ts` — template mapping + enqueue
- `msg91-webhook.service.spec.ts` — status mapping
- `messaging-dispatch.processor.spec.ts` — send + failure paths

Local dev: `MESSAGING_WHATSAPP_PROVIDER=console` logs templates to stdout.

## Admin manual send

`POST /api/v1/shops/:shopId/messaging/send` (JWT) — uses same BullMQ queue and `MESSAGE_SENDER` factory.
