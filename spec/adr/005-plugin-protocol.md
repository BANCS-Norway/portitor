# ADR-005: Plugin Protocol — gRPC vs HTTP + OpenAPI

**Status:** Open
**Date:** 2026-03-20

## Context

Portitor plugins (source adapters, warehouse adapters, customs plugins) run out-of-process. A protocol is needed for the platform to call registered adapters and for adapters to communicate back.

## Options

### gRPC + Protobuf
- Strongly typed — `.proto` files are the canonical interface
- Efficient binary serialization
- Good for high-throughput warehouse adapters
- Language support: excellent (all target languages have gRPC libraries)
- Steeper learning curve for plugin authors
- Harder to test manually (no curl)

### HTTP + OpenAPI
- Accessible — any language can implement a REST endpoint
- OpenAPI spec is human-readable and well-tooled
- Easy to test with curl or Postman
- Slightly looser typing than Protobuf
- Better for third-party plugin authors unfamiliar with gRPC

## Decision

::: warning Open
This decision is pending. Community input welcome — open a discussion on [GitHub](https://github.com/BANCS-Norway/portitor/discussions).
:::

## Considerations

- PHP and Ruby plugin authors should be able to implement adapters easily
- Enterprise WMS adapters (Java, .NET) may benefit from gRPC performance
- A hybrid approach is possible: HTTP for inbound webhooks, gRPC for platform→adapter calls
