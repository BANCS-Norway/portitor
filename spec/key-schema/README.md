# Key Schema Specification

The S3 object key encodes all event metadata. No separate index table is needed — `LIST` + prefix is the query engine.

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

## Rules

1. All segments are lowercase except `event-type` which is PascalCase
2. Segments may contain alphanumeric characters and hyphens only — no slashes, dots, or underscores
3. `version` is zero-padded to 10 digits to ensure lexicographic sort order matches chronological order
4. Version numbering starts at `0000000001` — there is no version zero
5. The combination of `aggregate-id` + `version` must be unique within a stream
6. `event-type` is the final segment — it is a filename with no extension

## Example Keys

```
events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/0000000001/OrderReceived
events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/0000000002/OrderValidated
events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/0000000003/OrderSentToWarehouse
events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/0000000004/ShipmentCreated
events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/0000000005/TrackingAssigned
```

## Query Patterns

| Intent | Prefix |
|---|---|
| All events for a tenant | `events/acmecorp/` |
| All events for a warehouse group | `events/acmecorp/nordics/` |
| All events for a warehouse | `events/acmecorp/nordics/ongoing-wms/` |
| All events from a specific source | `events/acmecorp/nordics/ongoing-wms/source/woo-no/` |
| All orders from a source | `events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/` |
| Full history of one order | `events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/{id}/` |
| First event of an order (routing lookup) | `events/acmecorp/nordics/ongoing-wms/source/woo-no/orders/{id}/0000000001/` |

## Optimistic Concurrency

Before appending version N, perform a `HEAD` request on the key for version N. If the key exists, a concurrency conflict has occurred. The writer must reload the aggregate and retry.

## Routing

The `source-id` segment of the first event (`version = 0000000001`) for any order aggregate identifies which source system originated the order. This is how warehouse responses are routed back to the correct webshop — by reading a single known key, not a routing table.
