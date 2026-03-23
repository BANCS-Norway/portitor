# CLAUDE.md — Portitor

This file is the primary context document for Claude Code sessions working on
the Portitor repository. Read it fully before taking any action.

---

## What Portitor Is

Portitor is an open-source, event-sourced middleware platform that connects
e-commerce webshops to warehouse management systems through a hexagonal
architecture. Every order event is an immutable, append-only record stored in
S3-compatible object storage.

**The core promise:** swapping a warehouse provider is a replay operation, not
a rewrite. This is not aspirational — it is a hard architectural constraint
that every decision in this repo must preserve.

The name is Latin for the customs officer and ferryman who validated, routed,
and delivered goods across a boundary. The metaphor is precise.

---

## Repository Structure

```
spec/               Machine-readable specification (JSON Schema, OpenAPI, ADRs)
  adr/              Architecture Decision Records
  events/           Domain event JSON schemas
  api/              OpenAPI specifications
  conformance/      Conformance test definitions
apps/docs/          VitePress documentation site → portitor.org
.github/            GitHub Actions, issue templates
CLAUDE.md           This file
```

---

## Active Sessions

Claude Code sessions in this repository are scoped to:

1. **Spec authoring** — ADRs, OpenAPI specs, JSON Schema for domain events,
   conformance test definitions
2. **Documentation** — VitePress content in `apps/docs/`, portitor.org

The TypeScript reference implementation lives in a separate repository
(`portitor-ts`). Do not create implementation code in this repo.

---

## Non-Negotiable Architectural Constraints

These are invariants. Do not work around them, suggest alternatives to them,
or treat them as open questions. They are decided.

### 1. S3 as the event store
Every domain event is one JSON file in S3-compatible object storage. No
database. No EventStoreDB. No Postgres event table. See ADR-001.

### 2. Payload never touches the queue
Inbound API payloads are written to S3 on arrival. Queue messages carry only
a pointer (S3 key). The message broker is a signalling system, not a storage
system. This is not negotiable — it is the fix for the failure mode where
3,500 queued orders flooded a warehouse system during cutover.

### 3. S3 key path as schema
All metadata is encoded in the object key path. LIST + prefix replaces
database queries. Do not suggest adding an index table, a metadata database,
or any secondary store for event lookups. See ADR-002.

### 4. Hexagonal architecture — zero infrastructure imports in domain core
The domain core has no imports from AWS SDK, HTTP libraries, or any
infrastructure package. It defines port interfaces only. Adapters implement
them outside. This must be true of every spec and every implementation.

### 5. Plugin everything
Source adapters, warehouse adapters, customs plugins, infrastructure, auth,
and configuration are all plugins implementing defined interfaces. The domain
core is closed to direct extension. See ADR-003.

### 6. HTTP + OpenAPI as plugin protocol
The plugin protocol is HTTP with JSON payloads defined by the Portitor OpenAPI
specification. gRPC is not used. See ADR-005.

### 7. Pluggable auth for inbound push sources
Authentication for inbound webhooks is delegated to an `AuthPlugin`. JWT is
the default. Do not hardcode JWT or any other auth mechanism into the platform
surface. See ADR-006.

### 8. Push and pull ingestion are distinct plugin shapes
A `PushSourcePlugin` implements an HTTP handler. A `PullSourcePlugin`
implements a polling loop with an S3Cursor. They are not the same interface
with a mode flag. See ADR-007.

### 9. Tenant routing via slug aliases
All tenant endpoints are prefixed with a slug (`/{slug}/resource`). The slug
is a logical alias that resolves to a tenant UUID via the InfrastructurePlugin
configuration backend. Slugs are not hardcoded identities — a tenant may have
multiple aliases. See ADR-008.

### 10. European infrastructure is first-class
The platform must work identically on AWS, Scaleway, Hetzner, and local MinIO
with no code changes. Do not introduce any AWS-specific dependency into the
spec or domain core.

---

## ADR Protocol

Architecture Decision Records live in `spec/adr/`. They are the canonical
record of every significant decision in this project.

**You may:**
- Draft ADR content when explicitly asked
- Suggest that a decision warrants a new ADR
- Add to the Consequences section of an existing ADR when asked

**You may never:**
- Create a new ADR file without explicit instruction
- Modify an existing ADR file without explicit instruction
- Treat an open ADR as decided unless the human confirms it

When referencing ADRs in other documents, always use the format `ADR-NNN`.

Current ADR index:

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | S3-Compatible Object Storage as the Event Store | Proposed |
| ADR-002 | Key Path as Metadata | Proposed |
| ADR-003 | Hexagonal Architecture | Proposed |
| ADR-004 | Multi-Language Spec-First | Proposed |
| ADR-005 | Plugin Protocol — HTTP + OpenAPI | Decided |
| ADR-006 | Pluggable Authentication for Inbound Push Sources | Proposed |
| ADR-007 | Push vs Pull Ingestion Model | Proposed |
| ADR-008 | Tenant Routing and Dynamic OpenAPI Generation | Proposed |
| ADR-009 | Model-Driven OpenAPI Assembly | Proposed |
| ADR-010 | JSON Schema as the System Driver | Proposed |
| ADR-011 | AI-Assisted Configuration Validation | Proposed |
| ADR-012 | Configurable Order Pipeline | Proposed |
| ADR-013 | Order Ingestion and Lifecycle | Proposed |
| ADR-014 | Shipment Return Flow | Proposed |

---

## Spec Protocol

Spec files in `spec/` are the shared contract that all language implementations
must satisfy. They are authoritative.

**You may:**
- Draft spec content when explicitly asked
- Identify gaps or inconsistencies in the spec and flag them
- Suggest additions to the spec

**You may never:**
- Modify any file in `spec/` without explicit instruction
- Add, remove, or rename fields in JSON schemas without explicit instruction
- Change an OpenAPI path, method, or parameter without explicit instruction

When in doubt about a spec decision, surface the question rather than making
a choice.

---

## Documentation Protocol

The documentation site lives in `apps/docs/` and is built with VitePress.
It publishes to portitor.org.

**Structure:**
```
apps/docs/
  guide/          Getting started, architecture, local dev, plugin guides
  spec/           Rendered spec pages (sourced from spec/)
  public/         Static assets
```

**Tone:** technical, precise, direct. The audience is developers integrating
warehouse and webshop systems. No marketing language in the docs. The README
handles positioning.

**When writing docs:**
- Every claim must be traceable to a spec file or ADR
- Code examples must be valid — no pseudocode in spec pages
- If a spec page references a JSON Schema, the example must conform to it
- ADR pages render from `spec/adr/` — do not duplicate content in guide pages,
  link to the ADR instead

---

## Domain Language

Use these terms precisely and consistently:

| Term | Meaning |
|------|---------|
| **event** | An immutable domain fact, one JSON file in S3 |
| **aggregate** | The entity an event belongs to (e.g. `order`) |
| **source adapter** | Plugin that receives events from a webshop |
| **warehouse adapter** | Plugin that sends events to a WMS and receives responses |
| **customs plugin** | Plugin that applies only when `applies(order) → true` |
| **infrastructure plugin** | Plugin that owns storage, config, and scheduling |
| **auth plugin** | Plugin that verifies inbound push source identity |
| **slug** | A logical path alias for a tenant, not a canonical identity |
| **tenant UUID** | The canonical internal identity for a company |
| **S3Cursor** | An opaque pointer to the last processed position in a pull source |
| **pointer pattern** | Queue messages carry S3 keys, never payloads |
| **conformance test** | A language-agnostic test scenario every implementation must pass |

---

## What To Do When Uncertain

1. **Check the ADRs first** — most architectural questions are already decided
2. **Surface the gap** — if the ADRs don't cover it, say so and suggest an ADR
3. **Never guess on spec decisions** — wrong spec content propagates to every
   language implementation
4. **Prefer the smallest change** — spec additions are easier than spec changes;
   spec changes are breaking

---

## GitHub Issues

Every piece of work must be traceable to a GitHub issue. Issues follow the
prefix convention:

| Prefix | Type |
|--------|------|
| `spec:` | Specification change or addition |
| `adr:` | Architecture Decision Record |
| `impl:` | Language implementation |
| `docs:` | Documentation |
| `fix:` | Correction to existing spec or docs |

Phase labels (`phase-1` through `phase-5`) indicate the release milestone.
Do not start work that is not covered by an open issue.
