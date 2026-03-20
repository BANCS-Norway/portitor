# ADR-004: Spec-First Multi-Language Implementation Strategy

**Status:** Proposed
**Date:** 2026-03-20

## Context

Portitor aims to serve diverse ecosystems: PHP shops running WooCommerce, Java shops running SAP or Business Central, Ruby teams building on Rails/Shopify, Python teams writing customs logic. A single-language platform would exclude most of these.

## Decision

Define the platform as a specification first. The spec includes:
- S3 key schema
- Domain event JSON schemas
- Plugin protocol (OpenAPI)
- HTTP API contract (OpenAPI)
- Conformance test suite (language-agnostic, HTTP + S3 assertions)

The TypeScript implementation is the reference. All other language implementations (`portitor-ruby`, `portitor-go`, `portitor-python`, etc.) are independent repositories that implement the same spec. An implementation is valid if it passes the conformance suite.

## Language Targets

| Language | Priority | Primary Strength |
|---|---|---|
| TypeScript | Reference | WooCommerce/Shopify ecosystem, monorepo tooling |
| Ruby | High | Elegant DSL, Shopify/Rails, developer joy |
| Go | High | Cloud-native, single binary CLI, European startups |
| .NET | High | Business Central / Nordic enterprise WMS |
| Python | High | Customs logic, data projections |
| PHP | High | Native to WordPress/WooCommerce servers |
| Kotlin | Medium | Sealed class event hierarchies, JVM ecosystem |
| Clojure | Medium | Functional purity, reduce-based projections |

## Consequences

**Positive:**
- Ecosystem reach across every major e-commerce and WMS technology stack
- The spec becomes a stable public API that the community can build against
- Conformance tests prevent drift between implementations
- Language implementations can evolve independently

**Negative:**
- Maintaining multiple implementations is significant ongoing effort
- Spec changes must be coordinated across all implementations
- The conformance test suite must be kept comprehensive to prevent silent divergence
