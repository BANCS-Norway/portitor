# ADR-007: Push vs Pull Ingestion Model

**Status:** Proposed **Date:** 2026-03-22

## Context

Portitor integrates with external systems that expose fundamentally different
connectivity models:

**Push sources** call Portitor. The external system sends an HTTP webhook when
an event occurs (order placed, order packed, shipment dispatched). Portitor
is the server; the integration partner is the client.

**Pull sources** must be polled. The external system exposes no webhook
capability — it may offer a REST API to query for new records, an FTP/SFTP
drop folder, or a flat file on a schedule. Portitor must initiate the
connection.

This distinction is not theoretical. Production experience with Nordic
e-commerce integrations includes:

- **Bring (FTP):** No API. Order files dropped to an FTP server. Portitor
  polled on an interval, scanning for new or changed files since the last
  cursor position.
- **Prime Cargo (webhook):** HTTP callbacks authenticated via JWT, firing on
  `OrderPacked` events.
- **PostNord, DHL (REST API polling):** Tracking updates retrieved by querying
  their API on a schedule.

Treating these as the same plugin shape would force unnatural abstractions on
both sides.

## Decision

**Push and pull ingestion are distinct plugin shapes with separate interfaces.**

### Push Source Plugin

Implements an HTTP handler. The platform registers it as a webhook endpoint.
Authentication is delegated to the `AuthPlugin` (see ADR-006).

```
PushSourcePlugin
  path() → string                        // e.g. "/webhooks/prime-cargo"
  handle(request, identity) → EventList
```

### Pull Source Plugin

Implements a polling loop. The platform schedules it. Credentials for the
remote system are held in plugin configuration — not in JWT tokens.

```
PullSourcePlugin
  schedule() → CronExpression           // e.g. "*/5 * * * *"
  fetch(cursor: S3Cursor) → EventList
  cursorKey() → string                  // S3 key where cursor is persisted
```

The `S3Cursor` is a pointer to the last successfully processed position —
a timestamp, a filename, a sequence number, or any opaque string the plugin
defines. The platform persists and restores the cursor between executions,
giving the plugin exactly-once-like processing without a database.

## Consequences

**Positive:**

- FTP, SFTP, REST polling, and file-based integrations are first-class citizens
- Push plugins have no polling overhead — they fire on demand
- The S3Cursor pattern replaces ad-hoc "date file" state tracking with a
  durable, replayable position pointer stored in the event store itself
- Auth concerns are cleanly separated: push delegates to `AuthPlugin`,
  pull uses outbound credentials in config

**Negative:**

- Two plugin interfaces instead of one — plugin authors must choose the right
  shape for their integration partner
- Pull plugins introduce scheduler infrastructure as a platform dependency

## Cursor Persistence

The platform stores the cursor at:

```
{company}/cursors/{plugin-id}/cursor.json
```

On each pull execution:
1. Platform reads the cursor from S3 (or initialises to epoch if absent)
2. Plugin receives cursor, fetches events since that position
3. Platform writes each event payload to S3 and enqueues an order pointer
   for the pipeline (ADR-012) — identical to the push ingest path
4. Platform updates the cursor in S3 after all events in the batch are written

If step 3 or 4 fails, the cursor is not advanced — the next execution
reprocesses from the same position. Plugins must be idempotent.

The cursor is updated once per batch, not per event. A mid-batch failure
leaves all fetched orders in the pipeline and the cursor at its previous
position; the next execution will re-fetch the same batch. Idempotency
in step 3 ensures duplicate writes are safe.

## Alternatives Considered

- **Single plugin interface with a `mode` flag**: Rejected — forces pull
  plugins to implement a no-op HTTP handler and push plugins to implement a
  no-op scheduler, obscuring intent
- **Polling as a platform concern (plugin just provides a URL to poll)**:
  Rejected — the polling logic and cursor semantics are too integration-specific
  to abstract at the platform level (FTP scanning differs fundamentally from
  REST pagination)
