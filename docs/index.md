---
layout: home

hero:
  name: Portitor
  text: E-commerce ↔ Warehouse Integration
  tagline: Event-sourced, hexagonal, plugin-based. Swap your warehouse without touching your webshop.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View Spec
      link: /spec/overview
    - theme: alt
      text: GitHub
      link: https://github.com/BANCS-Norway/portitor

features:
  - title: Event Sourced
    details: Every order event is immutable and append-only. Replay from any point in time to rebuild state, test new adapters, or audit history.
  - title: S3 Key as Schema
    details: The object key path encodes company, group, warehouse, source, aggregate, version, and event type. LIST + prefix replaces most database queries.
  - title: Plugin Everything
    details: Sources, warehouses, customs handling, infrastructure, and dashboard panels are all plugins. The domain core has zero infrastructure imports.
  - title: Multi-Language
    details: The spec is the contract. TypeScript, Ruby, Go, Python, PHP, Kotlin, .NET, and Clojure implementations all follow the same spec and pass the same conformance tests.
  - title: European First
    details: Works equally on AWS, Scaleway, Hetzner, or a local MinIO instance. No vendor lock-in.
  - title: Zero-Downtime Migration
    details: Switching warehouses is a replay operation. Old events stay intact and queryable. New events write to the new prefix. No data migration needed.
---
