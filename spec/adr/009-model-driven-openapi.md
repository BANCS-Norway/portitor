# ADR-009: Model-Driven OpenAPI Assembly

**Status:** Proposed **Date:** 2026-03-22

## Context

ADR-008 establishes that each tenant receives a dynamically generated OpenAPI
specification scoped to their active plugins. What it does not define is how
that specification is produced.

Hand-authoring OpenAPI per tenant is impractical and guaranteed to drift from
the actual plugin behaviour over time. The platform needs a mechanism that
derives the API surface from configuration rather than manual definition.

## Decision

**Adapters declare the models they consume and produce. The platform assembles
the tenant's OpenAPI from those declarations at setup time.**

Each adapter registers:

- `inputModel` — a JSON Schema reference describing the payload it expects
  to receive
- `outputModel` — a JSON Schema reference describing the payload it will emit

When a tenant is configured, the mapper links models across adapter boundaries:

```
webstore-model          →  warehouse-mapper (inputModel)
warehouse-shipping-model  →  webstore-mapper (outputModel)
```

The platform walks the mapper configuration, collects all declared model
pairs, and assembles the OpenAPI specification. Both models appear in the
tenant's swagger automatically — no endpoint is defined manually.

The swagger at `GET /{company}/swagger` (see ADR-008) always reflects exactly
what is wired for that tenant. If a plugin is added or removed, the swagger
regenerates.

## Schema Compatibility at Setup Time

Before a tenant goes live, the platform validates all wired model pairs:

- The output model of one adapter must be compatible with the input model of
  the next
- Incompatible pairings are rejected at configuration time, not at runtime

This means misconfiguration is a setup error, not a production incident.
See ADR-010 for the role of JSON Schema as the system driver, and ADR-011
for AI-assisted semantic validation beyond structural compatibility.

## Consequences

**Positive:**

- The API surface is always accurate — it cannot diverge from what is
  actually configured
- No manual OpenAPI authoring — plugin authors only define models
- Incompatible adapter wiring is caught before deployment
- Adding a plugin to a tenant automatically extends their swagger with no
  additional documentation effort

**Negative:**

- The OpenAPI generation algorithm is itself a platform requirement — all
  language implementations must produce equivalent specifications from the
  same model configuration (covered by the conformance test suite)
- Adapters must declare their models formally — informal or undeclared
  models cannot participate in the assembly process

## Alternatives Considered

- **Static per-tenant OpenAPI files**: Rejected — cannot stay in sync with
  plugin configuration without manual maintenance
- **Generated from code annotations**: Rejected — ties the spec to a specific
  language implementation; the spec must be language-agnostic (see ADR-004)
