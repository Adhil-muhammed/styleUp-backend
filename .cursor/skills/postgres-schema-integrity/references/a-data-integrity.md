# A. Data integrity (DB-level, non-negotiable)

**Why:** App checks race; only constraints make corrupt rows impossible.

## FK ON DELETE — always explicit

Soft-delete parents; do not cascade-delete payment/history-linked rows.

```sql
-- BAD: implicit default (NO ACTION) left undocumented / CASCADE without review
customer_id uuid REFERENCES customers(id)

-- GOOD
customer_id uuid NOT NULL
  CONSTRAINT fk_bookings_customer
  REFERENCES customers(id) ON DELETE RESTRICT
```

```typescript
// TypeORM: @JoinColumn + onDelete in relation; still verify migration SQL is explicit
@ManyToOne(() => CustomerEntity, { onDelete: 'RESTRICT' })
@JoinColumn({ name: 'customer_id' })
customer!: CustomerEntity;
```

## Exactly-one-of nullable FKs

```sql
-- BAD: both null or both set possible
staff_id uuid REFERENCES staff(id),
resource_id uuid REFERENCES resources(id)

-- GOOD
CONSTRAINT chk_bookings_staff_xor_resource CHECK (
  (staff_id IS NOT NULL) <> (resource_id IS NOT NULL)
)
```

## Money as integer paise

```sql
-- BAD
price numeric(10,2), amount float

-- GOOD
price_paise integer NOT NULL
  CONSTRAINT chk_bookings_price_paise_nonneg CHECK (price_paise >= 0)
```

```typescript
@Column({ name: 'price_paise', type: 'int' })
pricePaise!: number;
```

## TIMESTAMPTZ everywhere

```sql
-- BAD
scheduled_start timestamp

-- GOOD
scheduled_start timestamptz NOT NULL
```

```typescript
@Column({ name: 'scheduled_start', type: 'timestamptz' })
scheduledStart!: Date;
```

## Enum-like VARCHAR status — CHECK + app enum

```sql
CONSTRAINT chk_bookings_status CHECK (
  status IN ('pending', 'confirmed', 'cancelled', 'completed')
)
```

## NOT NULL and UNIQUE

- Declare `NOT NULL` unless nullability is intentional and documented.
- `UNIQUE` / partial unique indexes must mirror real business rules (e.g. active phone), not only app checks.
