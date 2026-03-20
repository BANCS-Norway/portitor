# ADR-002: S3 Key Path as Event Metadata

**Status:** Proposed
**Date:** 2026-03-20

## Context

Events need to carry metadata: which tenant, which warehouse group, which source system, which aggregate, which version, which event type. This metadata must be queryable without deserializing event payloads.

## Decision

Encode all event metadata in the S3 object key path. The event payload (JSON file body) contains only the business data of what happened. All structural metadata lives in the key.

```
events/{company-id}/{group-id}/{warehouse-id}/source/{source-id}/{aggregate-type}/{aggregate-id}/{version}/{event-type}
```

## Consequences

**Positive:**
- `LIST` operations return event type, aggregate ID, version, and full scope without reading file contents
- Filtering by event type, aggregate, or scope requires only key prefix matching
- Routing warehouse responses back to the source system requires reading one key (version 0000000001) — no routing table
- The key is naturally ordered — lexicographic sort of version segment equals chronological order
- Multi-tenancy is structurally enforced — a credential scoped to one company prefix cannot access another

**Negative:**
- Key length is significant — implementations must not exceed S3's 1,024-byte key limit
- Renaming a segment (e.g. changing a warehouse ID) is not possible without migrating events
- Key structure must be treated as a stable public API — breaking changes require a major spec version bump

## Alternatives Considered

- **Metadata in file body only**: requires deserializing every event to filter — too slow for projection rebuilds
- **Separate metadata index**: adds complexity and risks divergence from the actual event log
