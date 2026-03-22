# ADR-005: Plugin Protocol — gRPC vs HTTP + OpenAPI

**Status:** Decided **Date:** 2026-03-20 **Updated:** 2026-03-22

## Context

Portitor plugins (source adapters, warehouse adapters, customs plugins) run
out-of-process. A protocol is needed for the platform to call registered
adapters and for adapters to communicate back.

The target plugin author community spans PHP, Ruby, Python, and .NET — not all
of whom are familiar with gRPC toolchains. Portitor also has a proven
production history of HTTP + JWT-authenticated webhooks handling multi-tenant
e-commerce order flows at scale, which informs this decision.

## Options

### gRPC + Protobuf

- Strongly typed — `.proto` files are the canonical interface
- Efficient binary serialization
- Good for high-throughput warehouse adapters
- Language support: excellent (all target languages have gRPC libraries)
- Steeper learning curve for plugin authors
- Harder to test manually (no curl)
- Auth requires channel credentials (mTLS) — different model from inbound webhooks

### HTTP + OpenAPI

- Accessible — any language can implement a REST endpoint
- OpenAPI spec is human-readable and well-tooled
- Easy to test with curl or Postman
- Slightly looser typing than Protobuf
- Better for third-party plugin authors unfamiliar with gRPC
- Auth via JWT is consistent with the inbound webhook model (see ADR-006)

## Decision

**HTTP + OpenAPI.**

The plugin protocol uses HTTP with JSON payloads defined by the Portitor
OpenAPI specification. All platform-to-plugin and plugin-to-platform calls are
standard HTTP requests.

Rationale:

- PHP, Ruby, and Python plugin authors can implement adapters without any gRPC
  toolchain setup
- The OpenAPI spec is the single source of truth, human-readable, and
  compatible with code generation in all target languages
- JWT authentication is consistent across push and platform-initiated calls
  (see ADR-006)
- Manual testing with curl or Postman significantly lowers the barrier for
  plugin development and debugging
- Production history validates HTTP + JWT as sufficient for the throughput
  requirements of e-commerce order flows

## Consequences

**Positive:**

- Any language with an HTTP library can implement a Portitor plugin
- Consistent auth model across the entire surface area (see ADR-006)
- OpenAPI spec drives conformance tests directly
- No binary toolchain required for plugin authors

**Negative:**

- Slightly looser typing than Protobuf — mitigated by JSON Schema validation
  in the conformance test suite
- No native streaming — mitigated by the pull ingestion model for
  high-throughput scenarios (see ADR-007)

## Alternatives Considered

- **gRPC**: Rejected due to toolchain burden for community plugin authors and
  auth model mismatch with the inbound webhook surface
- **Hybrid (HTTP inbound, gRPC platform→adapter)**: Rejected — two protocols
  for one plugin author to implement adds complexity without sufficient benefit
