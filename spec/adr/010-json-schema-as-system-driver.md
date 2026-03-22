# ADR-010: JSON Schema as the System Driver

**Status:** Proposed **Date:** 2026-03-22

## Context

Portitor is a multi-language platform (see ADR-004). Every language
implementation must produce and consume the same event shapes, validate
the same payloads, and generate equivalent OpenAPI specifications. A single
source of truth is needed that all implementations, all tools, and the
platform runtime can rely on without translation.

The platform also assembles OpenAPI dynamically from adapter model
declarations (see ADR-009). For this to work across language boundaries,
model definitions must be expressed in a language-agnostic format.

## Decision

**JSON Schema definitions in `spec/` are the canonical source of truth for
the entire platform. Every contract — domain events, adapter models, API
payloads — is a JSON Schema file. Nothing else is authoritative.**

All platform artefacts derive from these schemas:

| Artefact | Derives from |
|---|---|
| Domain event validation | `spec/events/{EventType}.json` |
| Adapter input/output models | `spec/models/{model-name}.json` |
| OpenAPI assembly (ADR-009) | Schema references in adapter declarations |
| Conformance tests | Schema files as the expected shape |
| Code generation (all languages) | Schema files as the source |

The S3 key path (ADR-002) identifies which schema applies to any given
object in the event store — the event type segment in the key maps directly
to a schema file in `spec/events/`.

## Schema Pairing and Early Validation

When two adapters are wired together (ADR-009), the platform performs a
**schema pairing check** at setup time:

1. Retrieve the `outputModel` schema of the upstream adapter
2. Retrieve the `inputModel` schema of the downstream adapter
3. Validate structural compatibility — required fields, types, formats
4. Reject the configuration if incompatible

This makes misconfiguration a setup-time error. A warehouse adapter that
emits a shape the webstore mapper cannot consume is rejected before the
tenant goes live, not discovered when the first order arrives.

Structural compatibility is necessary but not sufficient — see ADR-011 for
the AI-assisted semantic validation layer that catches mismatches JSON Schema
cannot express.

## Consequences

**Positive:**

- One schema change propagates to all language implementations, OpenAPI,
  and conformance tests simultaneously
- Language implementations can be generated or validated directly from
  `spec/` without manual translation
- Schema pairing at setup time eliminates a class of runtime failures
- The event store is self-describing — given any S3 key, the applicable
  schema is deterministic

**Negative:**

- All schema changes are potentially breaking — implementations that have
  already generated code or built against a schema must be updated
- JSON Schema cannot express all semantic constraints (valid HS codes,
  active VAT numbers, carrier-specific tracking formats) — these require
  the AI layer in ADR-011

## Versioning

Schema files follow semantic versioning. Breaking changes (field removal,
type change, required field addition) require a major version bump and a
migration path for existing implementations. Additive changes (optional
fields) are minor version bumps.

The spec version is declared in every schema file and in the `spec/`
root manifest.
