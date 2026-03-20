# ADR-001: S3-Compatible Object Storage as the Event Store

**Status:** Proposed
**Date:** 2026-03-20

## Context

Portitor needs an event store that is:
- Append-only and immutable
- Durable and highly available
- Portable across cloud providers (AWS, Scaleway, Hetzner, local)
- Operable without database administration
- Replayable from any point in time

## Decision

Use S3-compatible object storage as the primary event store backend, with one JSON file per event and all metadata encoded in the object key path.

## Consequences

**Positive:**
- Works on any S3-compatible provider (AWS S3, Scaleway Object Storage, Hetzner Object Storage, MinIO)
- No schema migrations — the key structure is the schema
- Naturally append-only — existing objects are never modified
- `LIST` + prefix provides a free query engine without a separate index
- Local development requires only MinIO via docker compose — no cloud credentials
- Projections are always rebuildable by replaying the key list

**Negative:**
- No native server-side push/subscribe — the projection worker must poll or use a separate notification mechanism
- `LIST` operations on large buckets can be slow — mitigated by well-structured key prefixes
- No transactions across multiple aggregates — must be handled at the application layer with idempotency

## Alternatives Considered

- **EventStoreDB**: purpose-built but adds an operational dependency and is not S3-compatible
- **PostgreSQL**: excellent for transactions but requires database administration and is not natively multi-cloud
- **DynamoDB**: AWS-only, violates the European portability principle
