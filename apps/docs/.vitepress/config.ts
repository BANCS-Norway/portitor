import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Portitor',
  description: 'Open-source e-commerce ↔ warehouse integration platform',
  base: '/',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Spec', link: '/spec/overview' },
      { text: 'ADRs', link: '/spec/adr/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Local Development', link: '/guide/local-development' },
          ],
        },
        {
          text: 'Plugins',
          items: [
            { text: 'Source Adapters', link: '/guide/source-adapters' },
            { text: 'Warehouse Adapters', link: '/guide/warehouse-adapters' },
            { text: 'Customs Plugins', link: '/guide/customs-plugins' },
          ],
        },
      ],
      '/spec/': [
        {
          text: 'Specification',
          items: [
            { text: 'Overview', link: '/spec/overview' },
            { text: 'Key Schema', link: '/spec/key-schema' },
            { text: 'Domain Events', link: '/spec/events' },
            { text: 'Plugin Protocol', link: '/spec/plugin-protocol' },
            { text: 'HTTP API', link: '/spec/api' },
            { text: 'Conformance Tests', link: '/spec/conformance' },
          ],
        },
        {
          text: 'ADRs',
          items: [
            { text: 'Index', link: '/spec/adr/' },
            { text: 'ADR-001: S3 as Event Store', link: '/spec/adr/001-s3-as-event-store' },
            { text: 'ADR-002: Key Path as Metadata', link: '/spec/adr/002-key-path-as-metadata' },
            { text: 'ADR-003: Hexagonal Architecture', link: '/spec/adr/003-hexagonal-architecture' },
            { text: 'ADR-004: Multi-Language Spec-First', link: '/spec/adr/004-multi-language-spec-first' },
            { text: 'ADR-005: Plugin Protocol', link: '/spec/adr/005-plugin-protocol' },
            { text: 'ADR-006: Pluggable Auth', link: '/spec/adr/006-pluggable-auth' },
            { text: 'ADR-007: Push vs Pull Ingestion', link: '/spec/adr/007-push-pull-ingestion' },
            { text: 'ADR-008: Tenant Routing', link: '/spec/adr/008-tenant-routing' },
            { text: 'ADR-009: Model-Driven OpenAPI', link: '/spec/adr/009-model-driven-openapi' },
            { text: 'ADR-010: JSON Schema as System Driver', link: '/spec/adr/010-json-schema-as-system-driver' },
            { text: 'ADR-011: AI Configuration Validation', link: '/spec/adr/011-ai-configuration-validation' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/BANCS-Norway/portitor' },
    ],

    footer: {
      message: 'Released under the MIT License.',
    },

    search: {
      provider: 'local',
    },
  },
})
