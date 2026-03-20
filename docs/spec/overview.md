# Specification Overview

The Portitor specification defines the contracts that all language implementations must satisfy. An implementation is valid if it passes the [conformance test suite](./conformance).

## Contents

| Section | Description |
|---|---|
| [Key Schema](./key-schema) | S3 object key structure — the foundation of the event store |
| [Domain Events](./events) | JSON Schema for every domain event |
| [Plugin Protocol](./plugin-protocol) | OpenAPI contract for source, warehouse, and customs adapters |
| [HTTP API](./api) | OpenAPI spec for the platform HTTP surface |
| [Conformance Tests](./conformance) | Language-agnostic test scenarios every implementation must pass |
| [ADRs](./adr/) | Architecture Decision Records |

## Versioning

The spec follows [Semantic Versioning](https://semver.org). Breaking changes to the key schema or event contracts require a major version bump. All language implementations declare which spec version they implement.
