# Domain Events

All events share a common base structure and are stored as JSON files in the event store.

## Base Structure

```json
{
  "eventId": "uuid-v4",
  "occurredAt": "2026-03-20T10:00:00.000Z",
  "aggregateId": "uuid-v4",
  "version": 1
}
```

## Event Catalogue

| Event | Aggregate | Description |
|---|---|---|
| `OrderReceived` | Order | Platform accepted a raw order from a source adapter |
| `OrderValidated` | Order | Order passed all validation rules |
| `OrderValidationFailed` | Order | One or more validation rules failed |
| `OrderSentToWarehouse` | Order | Order successfully submitted to the warehouse adapter |
| `ShipmentCreated` | Shipment | Warehouse confirmed a shipment for this order |
| `TrackingAssigned` | Shipment | Carrier tracking number assigned |
| `SourceStatusUpdated` | Order | Source adapter notified of status change |
| `OrderCompleted` | Order | Full lifecycle complete |
| `OrderFailed` | Order | Non-recoverable failure at any stage |
| `CustomsDeclarationCreated` | Order | Customs plugin created a declaration |
| `CustomsSubmitted` | Order | Declaration submitted to customs authority |
| `CustomsApproved` | Order | Customs authority approved the declaration |
| `CustomsRejected` | Order | Customs authority rejected the declaration |
| `WarehouseAssigned` | Group | Active warehouse changed for a company group |

::: info JSON Schemas
Machine-readable JSON Schema files for each event are in [`spec/events/`](https://github.com/BANCS-Norway/portitor/tree/main/spec/events).
:::
