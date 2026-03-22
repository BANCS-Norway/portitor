# ADR-008: Tenant Routing and Dynamic OpenAPI Generation

**Status:** Proposed **Date:** 2026-03-22

## Context

Portitor is a multi-tenant platform. Each tenant (company) has their own set
of configured source plugins, warehouse plugins, and optional customs plugins.
The platform needs a routing convention that:

- Isolates tenants from each other without a routing table
- Maps directly onto the S3 key path (see ADR-002)
- Exposes only the endpoints relevant to each tenant
- Is self-documenting at the tenant level
- Provides a degree of security through non-guessable path structure

## Decision

**All tenant endpoints are prefixed with the company slug. The OpenAPI
specification is generated per tenant at setup time and served at a
tenant-scoped path.**

### Path Convention

Every endpoint registered for a tenant follows the pattern:

```
/{company}/{resource}
/{company}/{resource}/{action}
```

Examples for a tenant with slug `comfyballs`:

```
POST /comfyballs/order
POST /comfyballs/shipping
POST /comfyballs/customs
POST /comfyballs/customs/doc
GET  /comfyballs/swagger
```

The path slug is a **logical alias**, not a hardcoded identity. The canonical
tenant identity is an internal UUID. A tenant may have multiple active slug
aliases pointing to the same UUID — useful for rebranding, acquisitions, or
supporting legacy integration partners without forcing a URL change.

The slug-to-UUID mapping is resolved by the `InfrastructurePlugin` at request
time — see the Configuration Backend section below.

The resolved UUID maps directly to the first segment of every S3 key written
for that tenant — no separate routing table is required.

### Plugin Self-Registration

Each plugin declares its own path segments relative to the company prefix.
The platform assembles the full tenant route table at setup time by
collecting registrations from all active plugins:

```
CorePlugin      → /order, /shipping
CustomsPlugin   → /customs, /customs/doc
```

A tenant without a customs plugin simply has no `/customs` paths. Their
swagger reflects this accurately.

### The Swagger Endpoint

Each tenant is automatically provisioned a swagger endpoint:

```
GET /{company}/swagger
```

This serves the generated OpenAPI specification scoped to that tenant's
active plugins only. It is:

- **Tenant-scoped** — no endpoint from another tenant is visible
- **Living** — regenerated when plugins are added or removed
- **The integration contract** — a new warehouse or webshop partner hits
  `/{company}/swagger` to get exactly the surface they need to implement
  against

There is no global `/swagger` endpoint. The full tenant list is never
exposed through the API surface.

### Security Model

The company slug in the path provides a first layer of obscurity — paths
are non-guessable without knowing the company slug. This is not a substitute
for authentication (see ADR-006) but it means:

- A request to `/comfyballs/order` carrying a JWT claiming identity
  `tights-no` is rejected at the routing layer before auth logic runs
- Path and token company must match — mismatch is an immediate 403

## The Customs Doc Endpoint

The customs plugin registers a document generation endpoint that accepts
parameters as either query string or request body — the handler merges both,
with body taking precedence on conflict:

```
POST /{company}/customs/doc
```

**Query string variant** (simple integrations, curl testing):
```
POST /comfyballs/customs/doc?type=PDF&from=2024-11-14&transporter=postnord
```

**Body variant** (batch processing, larger payloads):
```json
POST /comfyballs/customs/doc
{
  "type": "flat",
  "orders": ["ORD-1042", "ORD-1043"],
  "transporter": "dhl"
}
```

Supported `type` values: `PDF` | `flat` | `csv`

Body wins on parameter conflict. This rule must be implemented identically
across all language implementations — it is a conformance test requirement.

All generated documents are written to S3 before being returned to the
caller, providing an unconditional audit trail of every customs document
ever produced.

## Consequences

**Positive:**

- No routing table — the company slug in the path is the only routing
  mechanism needed
- Tenant isolation is structural, not configuration-dependent
- Each tenant's swagger is minimal and accurate — no noise from other
  tenants or inactive plugins
- Plugin authors declare their own paths — the platform assembles the
  route table without central coordination
- Dual input model (query string + body) accommodates both simple curl
  testing and production batch calls on the same endpoint

**Negative:**

- Slug collision must be prevented at onboarding time
- Generated swagger must be invalidated and regenerated when plugins
  change — a stale swagger is a support burden
- Slug alias resolution adds a config lookup per request — must be cached
  to avoid latency impact

## Configuration Backend

The slug-to-tenant mapping, along with all other platform configuration
(plugin credentials, pull source schedules, customs templates), is owned
by the `InfrastructurePlugin`. The domain core accesses configuration
through a uniform interface:

```
InfrastructurePlugin
  getConfig(key) → value
  setConfig(key, value)
```

The backing store depends on the infrastructure in use:

| Infrastructure | Configuration Backend |
|---|---|
| AWS | Parameter Store or Secrets Manager |
| Scaleway / Hetzner | S3 object (no native config service) |
| Local / MinIO | S3 object (MinIO) |

For platforms without a native configuration service, configuration is stored
as a JSON object in S3 at a reserved key:

```
_config/{tenant-uuid}/config.json
```

This covers:
- Slug aliases → tenant UUID mapping
- Plugin credentials (outbound auth for pull sources, see ADR-007)
- Pull source cron schedules (see ADR-007)
- Customs document templates
- Any future configuration concern

The domain core is never aware of which backend is in use. This is consistent
with the European-first principle in ADR-001 — a Hetzner deployment has no
dependency on AWS services.

## Alternatives Considered

- **Header-based tenant routing** (`X-Company: comfyballs`): Rejected —
  headers are invisible in URLs, making links and curl commands less
  self-documenting, and they don't map onto the S3 key path naturally
- **Subdomain routing** (`comfyballs.portitor.example.com`): Valid but adds
  DNS and TLS complexity for self-hosted deployments; path-based routing
  works on any infrastructure
- **Global swagger with tenant filter**: Rejected — exposes the tenant list
  and inflates the spec with irrelevant endpoints for every integration partner
