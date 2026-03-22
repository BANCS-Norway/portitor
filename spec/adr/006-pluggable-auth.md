# ADR-006: Pluggable Authentication for Inbound Push Sources

**Status:** Proposed **Date:** 2026-03-22

## Context

Portitor receives events from external systems (webshops, warehouses) via
inbound HTTP webhooks. These callers must be authenticated so the domain core
knows who is sending the event — the JWT payload encodes company, source, and
caller identity, which maps directly onto the S3 key path (see ADR-002).

However, authentication requirements vary by integration:

- **JWT bearer tokens** — the default; caller identity encoded in a signed token
- **HMAC webhook signatures** — common in Shopify, WooCommerce, and other
  platforms that sign their webhook payloads
- **API keys** — simpler integrations or legacy systems
- **IP allowlisting** — some enterprise WMS systems authenticate by network
  origin rather than token

No single auth mechanism covers all realistic plugin authors and warehouse
partners. Hardcoding JWT would exclude valid integration patterns.

## Decision

**Authentication for inbound push sources is a plugin.**

The platform defines an `AuthPlugin` interface:

```
AuthPlugin
  verify(request: InboundRequest) → CallerIdentity | Rejected
```

The default implementation ships with JWT. Plugin authors can replace it with
any mechanism appropriate for their integration partner.

The `CallerIdentity` returned by a successful `verify()` call contains:

- `company` — maps to the S3 key path company segment
- `source` — identifies the calling system (e.g. `woocommerce`, `prime-cargo`)
- `role` — `source-adapter` | `warehouse-adapter` | `customs-plugin`

This identity is the only input the domain core uses for routing — the auth
mechanism that produced it is irrelevant upstream.

## Consequences

**Positive:**

- JWT remains the default — zero config for the common case
- HMAC signatures work without modifying the domain core (Shopify, WooCommerce
  out of the box)
- Enterprise partners with IP-based auth or API keys are supported via a
  simple plugin
- Auth logic is isolated and independently testable

**Negative:**

- Plugin authors must implement the `AuthPlugin` interface for non-default
  auth — a small but real overhead
- Misconfigured auth plugins can silently reject valid callers — mitigation is
  clear error logging and a test harness in the conformance suite

## Scope

This ADR applies **only to inbound push sources** (webhook callers). Pull
sources — systems where Portitor initiates the connection on a schedule — use
outbound credentials stored in plugin configuration. See ADR-007.

## Alternatives Considered

- **JWT only**: Rejected — excludes HMAC-signing platforms (Shopify, WooCommerce)
  and legacy warehouse partners without token infrastructure
- **Per-integration hardcoded handlers**: Rejected — couples auth logic to the
  domain core and requires a core change for each new integration partner
