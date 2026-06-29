---
status: draft
---

# Event: [EventName]

## Event Name

`[domain].[entity].[action]` (e.g. `orders.order.placed`)

## Producer

| Service | Repository | Topic / Exchange |
|---------|-----------|------------------|
|         |           |                  |

## Consumers

| Service | Purpose |
|---------|---------|
|         |         |

## Payload Schema

```json
{
  "eventId": "string (UUID)",
  "occurredAt": "string (ISO 8601)",
  "payload": {}
}
```

## Ordering Guarantees

[Describe ordering guarantees: unordered / per-partition-key / global. Include any idempotency requirements.]

## Retention

| Setting        | Value |
|----------------|-------|
| Retention days |       |
| Max message size |     |
