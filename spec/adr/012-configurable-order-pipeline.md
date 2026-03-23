# ADR-012: Configurable Order Pipeline

**Status:** Proposed **Date:** 2026-03-23

## Context

The order processing lifecycle described in ADR-013 identifies a sequence of
steps: ingest → validate → map → dispatch. In practice, different tenants have
fundamentally different operational requirements:

- A single-warehouse domestic merchant has no need for AI validation of HS
  codes or a warehouse resolver — those steps add latency and operational
  surface with no benefit
- A multi-warehouse cross-border operator needs warehouse resolution before
  customs validation can determine whether a shipment crosses a border
- During migration cutover, a tenant may want to skip validation entirely and
  run in lenient mode throughout
- Future step types (fraud detection, inventory reservation, carrier selection)
  must be addable without changing the platform core

Hardcoding the pipeline sequence couples the platform to a specific operational
model and violates the plugin-everything constraint (ADR-003).

## Decision

**The order processing pipeline between ingest and dispatch is a configurable
sequence of steps. Each step is a plugin. The operator assembles the pipeline
in the dashboard.**

### Fixed Steps

Two steps are always present and cannot be removed:

- **Ingest** — writes payload to S3, fires `OrderReceived`, enqueues the
  pointer. Always first.
- **Dispatch** — sends the mapped order to the warehouse adapter, fires
  `OrderSentToWarehouse`. Always last.

### Fixed Event Handlers

Domain events fired by the fixed steps have fixed handlers that run
asynchronously and independently of the pipeline step sequence:

- **`OrderReceivedNotifierWebshop`** — reacts to `OrderReceived`. Notifies
  the source adapter (webshop, ERP) that the order has arrived at the gateway.
  Runs in parallel with the configurable pipeline steps — the webshop is
  informed immediately without waiting for validation or mapping to complete.
- **`OrderSentToWarehouseNotifier`** — reacts to `OrderSentToWarehouse`.
  Notifies the source adapter that the order has been handed off to the
  warehouse.

These handlers are not pipeline steps. They cannot be removed or reordered.
Additional handlers on `OrderReceived` or `OrderSentToWarehouse` (e.g. a
Business Central sync) are configurable per tenant and run alongside the
fixed handlers.

### Configurable Steps

All steps between ingest and dispatch are optional and operator-configured.
The platform ships with the following built-in step types:

| Step | Description | ADR |
|---|---|---|
| `validate` | JSON Schema validation against the order model | ADR-010 |
| `ai-validate` | AI semantic validation (HS codes, VAT, carrier codes) | ADR-011 |
| `resolve-warehouse` | Selects the fulfilling warehouse; contributes route context to downstream steps | — |
| `map` | Transforms the webshop model to the warehouse model | ADR-009 |

Steps run in the order configured. The `map` step must precede `dispatch`.
Beyond that, the operator decides the sequence.

### Step Interface

Each step plugin receives:

- The order payload (fetched from S3)
- The current pipeline context — accumulated outputs from prior steps,
  including resolved warehouse and route if present
- The effective validation mode (`strict` | `lenient`)

Each step returns:

- A result: `pass` | `fail` | `warn`
- A `findings` array (same shape as defined in ADR-013)
- Any context it contributes to downstream steps

The `resolve-warehouse` step contributes `warehouseId`, `origin_country`, and
`destination_country` to the pipeline context.

### Route-Aware Customs Validation

When `resolve-warehouse` precedes `ai-validate` in the pipeline, the AI
validator receives route context and applies customs checks conditionally:

- `origin_country == destination_country` — skip customs checks (domestic
  shipment, no customs boundary)
- `origin_country != destination_country` — validate HS codes, carrier codes,
  VAT numbers, etc.

When `resolve-warehouse` is not in the pipeline:

- If the tenant has a single configured warehouse, the platform resolves
  `origin_country` from tenant configuration automatically
- If the tenant has multiple warehouses and no resolver step is configured,
  `ai-validate` treats the route as unknown and skips customs checks, reporting
  an `info` finding that route context was unavailable

### Warehouse Resolution Sources

The `resolve-warehouse` step selects a warehouse via one of two paths, in
order of precedence:

1. **Order-provided** — the order envelope carries a `warehouseId` field. The
   step validates it against the tenant's configured warehouses and resolves
   the country.
2. **Plugin-resolved** — a routing plugin selects the warehouse based on
   stock availability, proximity, or tenant-defined rules.

For single-warehouse tenants, `resolve-warehouse` is optional — the origin
is always known from configuration and is injected into the pipeline context
automatically at ingest time.

### Strict / Lenient Mode

The strict/lenient mode defined in ADR-013 applies at the pipeline level.
A `fail` result from any step in strict mode halts the pipeline and fires
`OrderValidationFailed`. In lenient mode, findings are recorded as warnings
and the pipeline continues.

### Dashboard Configuration

The pipeline is configured in the dashboard as an ordered list of steps.
Changes take effect for orders received after the configuration is saved.
In-flight orders complete on the pipeline snapshot that was active when they
were ingested.

## Default Pipeline

The platform ships a sensible default pipeline for new tenants:

```
ingest → validate → map → dispatch
```

Fixed event handlers on `OrderReceived` and `OrderSentToWarehouse` run
in parallel and are not shown in the pipeline — they are always active.
Tenants add configurable steps between ingest and dispatch as their
operational requirements grow. The default is the minimum viable pipeline
that every deployment can run without additional configuration.

## Consequences

**Positive:**

- Tenants only pay the operational cost of steps they actually need
- New step types can be added as plugins without changing the platform core
  or disrupting existing pipelines
- Route-aware customs validation emerges naturally from pipeline composition:
  place `resolve-warehouse` before `ai-validate` and route context flows
  automatically
- The pipeline is explicit and inspectable — operators can see exactly what
  steps an order passes through before it reaches the warehouse

**Negative:**

- Pipeline misconfiguration is a new failure mode: steps in the wrong order
  (e.g. `ai-validate` before `resolve-warehouse`) degrade validation without
  an explicit error — the platform must warn on obviously incorrect orderings
- In-flight order handling requires storing the pipeline snapshot active at
  ingest time, not just the current configuration
- A sensible default pipeline must be provided and clearly documented, or
  operators will under-configure and lose safety checks they did not know
  they needed

## Alternatives Considered

- **Fixed pipeline with feature flags per step**: Rejected — feature flags are
  hidden coupling; a configurable pipeline makes composition explicit and
  inspectable in the dashboard
- **Hardcode all optional steps as no-ops when unconfigured**: Rejected — adds
  latency and operational surface for steps the tenant never uses; violates
  the spirit of plugin-everything (ADR-003)
- **Separate pipeline ADR per step type**: Rejected — the composition model is
  a single decision; individual step behaviour belongs in the ADRs that own
  those concerns (ADR-011 for AI validation, ADR-009 for mapping, etc.)
