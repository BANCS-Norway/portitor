# ADR-001: S3-Compatible Object Storage as the Event Store

**Status:** Proposed **Date:** 2026-03-20 **Updated:** 2026-03-22

## Context

Portitor needs an event store that is:

- Append-only and immutable
- Durable and highly available
- Portable across cloud providers (AWS, Scaleway, Hetzner, local)
- Operable without database administration
- Replayable from any point in time

## Decision

Use S3-compatible object storage as the primary event store backend, with one
JSON file per event and all metadata encoded in the object key path.

**Every inbound API payload is written to S3 immediately on arrival, before
any queue message is dispatched. Queue messages carry only a pointer to the
S3 key — never the payload itself.**

## The Pointer Pattern

When an event arrives at a Portitor endpoint (e.g. `POST /comfyballs/order`),
the platform:

1. Writes the full payload to S3 at the canonical key path
2. Enqueues a lightweight pointer message:

```json
{
  "key": "comfyballs/orders/prime-cargo/woocommerce/order/v1/OrderPlaced/2024-11-14T10:23:11Z.json",
  "company": "comfyballs",
  "event": "OrderPlaced"
}
```

Downstream workers read the pointer, fetch the payload from S3, and process
it. The queue never holds order data.

This pattern has direct consequences for reliability, performance, and replay
— see below.

## Consequences

**Positive:**

- Works on any S3-compatible provider (AWS S3, Scaleway Object Storage,
  Hetzner Object Storage, MinIO)
- No schema migrations — the key structure is the schema
- Naturally append-only — existing objects are never modified
- `LIST` + prefix provides a free query engine without a separate index
- Local development requires only MinIO via docker compose — no cloud
  credentials
- Projections are always rebuildable by replaying the key list
- **Queue messages are trivially small** — payload size has no impact on
  message broker memory, throughput, or size limits (e.g. SQS 256KB cap)
- **Replay is a pointer re-enqueue** — the S3 object is already the source of
  truth; replaying from any point means re-queuing the S3 keys for that
  prefix, no data movement required
- **Exactly-once processing is achievable** — if a queue message is delivered
  twice, both processing attempts read the same immutable S3 object; the
  payload cannot diverge
- **Audit trail is unconditional** — every payload that ever arrived is in S3
  regardless of whether the queue message was consumed, lost, or requeued
- **Warehouse migration is a pointer operation** — switching warehouse plugins
  means replaying S3 key pointers against the new plugin; the payloads never
  move

**Negative:**

- No native server-side push/subscribe — the projection worker must poll or
  use a separate notification mechanism
- `LIST` operations on large buckets can be slow — mitigated by well-structured
  key prefixes
- No transactions across multiple aggregates — must be handled at the
  application layer with idempotency
- Two-step write (S3 then queue) introduces a small latency overhead compared
  to queue-only ingestion — acceptable given the reliability benefits

## Why Not Queue-First?

Storing payloads in the queue rather than S3 causes compounding problems at
scale:

- Message brokers hit size limits on large order payloads (line items,
  addresses, customs data)
- 3,500 queued orders during a warehouse cutover means 3,500 full payloads
  held in broker memory — a resource spike that can destabilise the broker
- A lost or expired queue message loses the payload permanently with no
  recovery path
- Replay requires re-ingesting from the source system, which may no longer
  have the original data

The pointer pattern eliminates all of these failure modes. The broker becomes
a signalling system, not a storage system.

## Alternatives Considered

- **EventStoreDB**: purpose-built but adds an operational dependency and is
  not S3-compatible
- **PostgreSQL**: excellent for transactions but requires database
  administration and is not natively multi-cloud
- **DynamoDB**: AWS-only, violates the European portability principle
- **Queue-first with S3 as backup**: Rejected — the backup becomes the source
  of truth anyway; better to make S3 primary from the start
