# ADR-003: Hexagonal Architecture with Port Interfaces

**Status:** Proposed
**Date:** 2026-03-20

## Context

The domain logic (order routing, customs policy, event handling) must not be coupled to infrastructure (AWS SDK, HTTP clients, specific WMS APIs). Coupling was the root cause of the integration failures this platform is designed to prevent.

## Decision

Apply hexagonal architecture (Ports & Adapters). The domain package defines port interfaces. All infrastructure, source, warehouse, and customs implementations live outside the domain and implement those interfaces via dependency injection.

The domain package has zero runtime dependencies on infrastructure libraries.

## Consequences

**Positive:**
- Domain logic is fully testable with in-memory adapters — no cloud credentials, no network
- Infrastructure can be swapped without touching domain code
- Each language implementation enforces the same boundary, making the architecture portable
- New warehouse or source integrations are isolated to their adapter package

**Negative:**
- More boilerplate than a direct implementation — each integration requires an interface + adapter
- Developers unfamiliar with hexagonal architecture may find the indirection confusing initially

## Ports Defined

- `IEventStore` — append, read, list aggregates
- `IObjectStorage` — put, get, head, list, delete
- `ISourcePort` — verify webhook, parse order, update order status
- `IWarehousePort` — submit order, parse shipment callback
- `ICustomsPort` — applies, build declaration, submit declaration, check status
- `IProjectionStore` — upsert, get, list projections
