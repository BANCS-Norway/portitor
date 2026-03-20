# Key Schema

The S3 object key encodes all event metadata. No separate index table is needed — `LIST` + prefix is the query engine.

For the full machine-readable specification see [`spec/key-schema/`](https://github.com/BANCS-Norway/portitor/tree/main/spec/key-schema).

## Structure

```
events/{company-id}/{group-id}/{warehouse-id}/source/{source-id}/{aggregate-type}/{aggregate-id}/{version}/{event-type}
```

## Segments

| Segment | Description | Example |
|---|---|---|
| `company-id` | Top-level tenant identifier | `acmecorp` |
| `group-id` | Logical warehouse group within a company | `nordics` |
| `warehouse-id` | Specific warehouse integration | `ongoing-wms` |
| `source-id` | Specific webshop or source system | `woo-no` |
| `aggregate-type` | Type of aggregate | `orders` |
| `aggregate-id` | Unique aggregate identifier (UUID v4) | `f47ac10b-58cc-...` |
| `version` | Zero-padded 10-digit version number | `0000000001` |
| `event-type` | PascalCase event type name | `OrderReceived` |

## Query Patterns

| Intent | Prefix |
|---|---|
| All events for a tenant | `events/acmecorp/` |
| All events for a warehouse group | `events/acmecorp/nordics/` |
| All events for a warehouse | `events/acmecorp/nordics/ongoing-wms/` |
| All events from a specific source | `events/acmecorp/nordics/ongoing-wms/source/woo-no/` |
| Full history of one order | `events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/{id}/` |
