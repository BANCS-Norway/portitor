# Introduction

Portitor is an open-source, event-sourced integration platform that connects e-commerce webshops to warehouse management systems.

## The Problem

Swapping a warehouse provider — or adding a second webshop — should be a configuration change. In practice it usually means a rewrite, because the integration layer couples the source system directly to the destination.

Portitor solves this by placing an event-sourced domain core between the two, where both sides are plugins implementing a defined contract.

## Core Concepts

### Event Sourcing

Every order state change is recorded as an immutable event. Current state is derived by replaying those events — never stored directly. This means:

- Complete audit trail from order received to delivery
- Replay any order through a new warehouse adapter without touching the original data
- Rebuild projections from scratch at any time

### The S3 Key Schema

Events are stored in S3-compatible object storage. The object key encodes all metadata:

```
events/{company}/{group}/{warehouse}/source/{source}/{type}/{id}/{version}/{EventType}
```

A `LIST` + prefix query replaces most database reads. The key path itself is the index.

### Hexagonal Architecture

The domain core defines port interfaces. Adapters outside implement them. The domain has zero infrastructure imports — it is fully testable with an in-memory event store and no cloud credentials.

### Plugins

Every integration point is a plugin:

- **Source adapters** — WooCommerce, Shopify, Magento, custom
- **Warehouse adapters** — Ongoing WMS, nShift, Logistra, custom
- **Customs plugins** — fire only when `applies(order)` returns true
- **Event store** — S3, Postgres, in-memory
- **Infrastructure** — AWS, Scaleway, Hetzner, local

## Next Steps

- [Architecture deep-dive](./architecture)
- [Local development setup](./local-development)
- [Writing a source adapter](./source-adapters)
