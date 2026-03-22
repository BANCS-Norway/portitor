# ADR-012: Order Ingestion and Lifecycle

**Status:** Proposed **Date:** 2026-03-22

## Context

Orders are the primary aggregate in Portitor. The platform must receive an
order from a source adapter, validate it, map it to the warehouse model, and
dispatch it — while maintaining a full audit trail at every step and providing
a recovery path when things go wrong.

Several failure modes must be handled explicitly:

- Structurally invalid orders (JSON Schema validation failure)
- Semantically invalid orders (AI validation failure — see ADR-011, e.g.
  malformed HS codes, invalid customs data)
- Orders that fail validation but are known to be correct by the operator
  (override required without data loss)

Some integrations require orders to flow regardless of validation findings —
for example during migration cutover, or when a trusted partner's data has
known quirks that do not affect fulfilment. These orders must still surface
their issues visibly, never silently.

The source system (webshop, ERP) must always be informed of the order status
so it can reflect the correct state to the merchant.

## Decision

**Order ingestion is a two-step operation: store first, then validate
asynchronously. Validation failure is a recoverable state, not a rejection.**

### Step 1 — Ingest

```
POST /{company}/order
```

1. Payload written to S3 at the canonical key path (ADR-001 pointer pattern)
2. `OrderReceived` event fired
3. Lightweight pointer enqueued for the validation worker
4. **Returns 201 immediately** — the order is accepted as received regardless
   of what validation will find

The platform never rejects an inbound order at the HTTP layer for business
logic reasons. Network-level errors (malformed JSON, missing required envelope
fields) return 400. Everything else is accepted and validated asynchronously.

### Step 2 — Validate

The validation worker processes the pointer:

1. Fetches the payload from S3
2. Resolves the effective validation mode (see Validation Mode below)
3. Runs JSON Schema validation against the order model (ADR-010)
4. Runs AI semantic validation (ADR-011) — HS codes, VAT numbers, customs data
5. In **strict mode**: findings are errors — on any finding, fires
   `OrderValidationFailed` and halts
6. In **lenient mode**: findings are warnings — fires `OrderValidated` with
   a populated `warnings` array and proceeds to mapping

### Step 3 — Map and Dispatch (happy path)

1. Mapper transforms the webstore model to the warehouse model (ADR-009)
2. `OrderSentToWarehouse` event fired
3. Order added to the **unhandled orders projection** — orders awaiting
   warehouse confirmation

### Failure Path

On `OrderValidationFailed`:

1. Source adapter is notified — updates the order status in the webshop
2. If a BC (Business Central) plugin is configured for the tenant, it updates
   the order in BC
3. Order appears in the **failed orders queue** in the dashboard with the
   full validation error detail

The order payload remains in S3 — nothing is discarded. The failure is a
state, not a deletion.

### Override Path

An operator can force an order past validation from:

- The dashboard failed orders queue (force button per order)
- `POST /{company}/order/{id}/force` — API endpoint for programmatic override

The force action:

1. Requires the `platform-operator` role (see ADR-006) — source adapters
   cannot self-override
2. Fires `OrderValidationOverridden` event (unconditional audit trail)
3. Proceeds to mapping and dispatch as if `OrderValidated` had fired

The override is always recorded. There is no silent bypass.

## Validation Mode

Every order is processed in either **strict** or **lenient** mode.

**Lenient mode** — validation findings become warnings. The order is validated
and proceeds to dispatch. Warnings are attached to the `OrderValidated` event
and visible in the dashboard on the order detail.

**Strict mode** — validation findings are errors. The order blocks on
`OrderValidationFailed` and requires operator action to proceed.

### Mode Resolution

The effective mode is resolved in order of precedence (highest first):

1. **Order-level flag** — `"validationMode": "strict" | "lenient"` in the
   order envelope. Overrides everything.
2. **Source adapter configuration** — the adapter declares its default mode.
   Applied when the order carries no flag.
3. **Platform default** — strict. Applied when neither the order nor the
   adapter specifies a mode.

This means:
- A lenient source adapter can have individual high-risk orders run strict
  by setting `"validationMode": "strict"` on the order
- A strict source adapter can have individual known-quirky orders run lenient
  by setting `"validationMode": "lenient"` on the order

### When to Use Lenient Mode

- **Migration cutover** — data quality is imperfect but orders must flow
- **Trusted partners** — integration partner has known, harmless data quirks
- **Development / staging** — test orders with incomplete data

Lenient mode is never silent. Warnings are always recorded on the event and
always visible in the dashboard.

## Event Shapes

All validation events carry a shared `findings` structure:

```json
{
  "findings": [
    {
      "field": "lineItems[2].hsCode",
      "value": "6101.20",
      "severity": "warning" | "error",
      "message": "HS code may be incorrect for declared product category"
    }
  ]
}
```

`OrderValidated` carries `findings` with `severity: "warning"` when in
lenient mode. The array is empty when there are no findings.

`OrderValidationFailed` carries `findings` with `severity: "error"`.

Both events use the same shape — implementations handle one array, not two
different event types.

## Domain Events

| Event | Fired when |
|---|---|
| `OrderReceived` | Payload accepted and written to S3 |
| `OrderValidated` | Validation complete — order proceeds (findings array may contain warnings) |
| `OrderValidationFailed` | Validation failed in strict mode — order blocked |
| `OrderValidationOverridden` | Operator forced the order past validation |
| `OrderSentToWarehouse` | Order successfully dispatched to warehouse adapter |

## Projections

| Projection | Contents |
|---|---|
| Unhandled orders | Orders in `OrderValidated` or `OrderValidationOverridden` state not yet in `OrderSentToWarehouse` |
| Failed orders queue | Orders in `OrderValidationFailed` state, with validation errors, visible in dashboard |

Both projections are rebuildable from the event log at any time (ADR-010).

## API Surface

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/{company}/order` | POST | `source-adapter` | Ingest an order |
| `/{company}/order/{id}/force` | POST | `platform-operator` | Override validation and dispatch |

## Consequences

**Positive:**

- 201 on ingest means the source system never times out waiting for
  validation — decoupled by design
- No order payload is ever lost — S3 is written before anything else happens
- Validation failure is recoverable — operators can correct and force without
  re-submitting from the source
- Lenient mode allows orders to flow during migration or with trusted partners
  without hiding issues — warnings are always visible
- Order-level flag gives source adapters fine-grained control without removing
  the operator safety net
- Full audit trail: every state transition is an immutable event in S3
- The dashboard failed orders queue gives operators direct visibility and
  a clear recovery action

**Negative:**

- Asynchronous validation means the source system must poll or subscribe for
  the final order status — a 201 is not a confirmation of successful dispatch
- The force endpoint requires operator access — a misconfigured or unavailable
  operator role blocks the recovery path
- Lenient mode requires discipline — left on permanently it masks data quality
  problems that should be fixed at the source

## Alternatives Considered

- **Synchronous validation on ingest (return 422 on failure)**: Rejected —
  ties the source system's HTTP request to the full validation pipeline;
  timeouts on complex AI validation would cause order loss at the source
- **Discard failed orders**: Rejected — loses the payload and forces
  re-submission from the source, which may no longer have the original data
- **Allow source adapters to self-override**: Rejected — creates an audit gap;
  override must be an explicit operator action with a recorded event
- **Separate `OrderValidatedWithWarnings` event**: Rejected — introduces a
  distinct state with no behavioural difference from `OrderValidated`; the
  warnings array on `OrderValidated` carries the same information without
  requiring implementations to handle an additional event type
