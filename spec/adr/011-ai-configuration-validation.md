# ADR-011: AI-Assisted Configuration Validation

**Status:** Proposed **Date:** 2026-03-22

## Context

JSON Schema validation (ADR-010) catches structural misconfigurations —
missing required fields, wrong types, malformed formats. It cannot catch
semantic misconfigurations, where a value is structurally valid but
meaningfully wrong.

A concrete production example: in the predecessor integration platform
(NewTonic GT), HS codes on products were periodically malformed. An HS code
is a string — it passes type validation. But an incorrect HS code causes
customs declarations to be rejected by the Norwegian Customs Authority
(Tolletaten), holding shipments at the border. The error surfaced at
clearance time, not at the point where the bad value was introduced.

Other examples of semantic errors that JSON Schema cannot catch:

- An HS code that is structurally valid but does not exist in the current
  tariff schedule
- An HS code that exists but is wrong for the declared product category
  (e.g. a textile code applied to electronics)
- A VAT number that passes format validation but is inactive or belongs to
  a different company
- A carrier code that is valid in one country's customs system but unknown
  to the destination country's authority
- Two adapter schemas that are structurally compatible but use different
  conventions for the same field (e.g. both have `weight` but one is grams,
  the other kilograms)

## Decision

**An AI validation layer runs at setup time and optionally at runtime,
reasoning about semantic compatibility and domain correctness beyond what
JSON Schema can express.**

### Setup-Time Validation

When a tenant configuration is saved, the AI validator:

1. Receives the full wired adapter configuration and all referenced schemas
2. Analyses each schema pair for semantic compatibility — not just structural
3. Checks domain-specific fields against known constraints:
   - HS codes against the current tariff schedule
   - VAT number formats against country-specific rules
   - Carrier codes against known carrier registries
   - Unit conventions across schema boundaries (weight, dimensions, currency)
4. Reports findings before the tenant goes live — as warnings (suspicious
   but not blocking) or errors (known incorrect)

### Runtime Validation

For high-risk fields (customs codes, VAT numbers, carrier identifiers),
the AI validator can be configured to check incoming payloads in real time
and report anomalies to the operations dashboard before they reach the
customs plugin or warehouse adapter.

This is opt-in per field and per tenant — not all deployments require
real-time validation overhead.

### Reporting

Validation findings are reported through the operations dashboard with:

- The specific field and value that triggered the finding
- The rule or knowledge that flagged it
- The likely correct value or correction guidance where determinable
- A severity level: `info` | `warning` | `error`

The AI validator never silently drops or modifies a payload. It reports
and flags — the operator decides whether to block or pass through.

## Consequences

**Positive:**

- Semantic errors are caught at configuration time, not at customs clearance
- HS code mismatches, unit convention mismatches, and VAT errors are
  surfaced before they cause shipment delays or compliance failures
- The validation layer improves over time as it learns from corrections
  made in the system
- Operators have real-time visibility into configuration health

**Negative:**

- AI validation introduces a dependency on an inference service — this must
  be available at setup time and optionally at runtime
- False positives are possible — the system must make it easy to review and
  dismiss warnings without blocking legitimate configurations
- Tariff schedules and carrier registries change — the AI validator's
  knowledge must be kept current

## Scope

The AI validator is an optional platform component. It does not replace
JSON Schema validation (ADR-010) — it runs after structural validation
passes. A deployment without the AI validator still functions correctly;
it simply lacks the semantic safety net.

## Alternatives Considered

- **Rule-based semantic validation**: Rejected — tariff schedules have
  thousands of codes and change annually; maintaining a rule set is
  equivalent to maintaining a customs database, which is out of scope
- **Validate at customs submission time**: Rejected — this is the failure
  mode the system is designed to eliminate; errors must surface before
  goods are in transit
