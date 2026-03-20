# Portitor

> *Latin: the customs officer and ferryman who carried goods across — validating, routing, and delivering.*

Portitor is an open-source, event-sourced middleware layer that connects e-commerce webshops to warehouse management systems through a clean hexagonal architecture. Every order event is an immutable, append-only record stored in S3-compatible object storage — giving companies a complete audit trail, zero-downtime warehouse migrations, and a plugin SDK that lets the community extend support to any platform.

**European infrastructure is a first-class citizen.** Portitor works equally well on AWS, Scaleway, Hetzner, or a local MinIO instance with no code changes.

## Why Portitor?

Swapping a warehouse provider should be a configuration change, not a rewrite. Portitor makes that true by:

- Storing every order event immutably — replay from any point in time
- Encoding multi-tenancy directly in the S3 key path — no separate index table
- Routing warehouse responses back to the correct webshop through the event log — no routing table needed
- Treating customs handling as a plugin — fires only when it applies

## Architecture

```
[Source Plugin]                          [Warehouse Plugin]
  WooCommerce                              Ongoing WMS
  Shopify           ↘               ↗     nShift
  Magento             DOMAIN CORE          Logistra
  Custom API        ↗               ↘     Custom API

                    [Customs Plugin]
                      applies(order) → bool

                    [Infrastructure Plugin]
                      AWS · Scaleway · Hetzner · Local (MinIO)
```

## Implementations

The [spec](./spec/) is the shared contract. Each language is a first-class implementation:

| Language | Repo | Status |
|---|---|---|
| TypeScript | [portitor-ts](https://github.com/BANCS-Norway/portitor-ts) | Planned |
| Ruby | [portitor-ruby](https://github.com/BANCS-Norway/portitor-ruby) | Planned |
| Go | [portitor-go](https://github.com/BANCS-Norway/portitor-go) | Planned |
| .NET | [portitor-dotnet](https://github.com/BANCS-Norway/portitor-dotnet) | Planned |
| Python | [portitor-python](https://github.com/BANCS-Norway/portitor-python) | Planned |
| PHP | [portitor-php](https://github.com/BANCS-Norway/portitor-php) | Planned |
| Kotlin | [portitor-kotlin](https://github.com/BANCS-Norway/portitor-kotlin) | Planned |
| Clojure | [portitor-clojure](https://github.com/BANCS-Norway/portitor-clojure) | Planned |

## This Repository

```
spec/        Machine-readable specification (JSON Schema, OpenAPI, ADRs)
docs/        Documentation site → https://portitor.org
packages/    Shared tooling and conformance test runner
```

## Documentation

[portitor.org](https://portitor.org)

## License

MIT
