# BioShield Admin Operations System

Independent BioShield admin operations application hosted in the DST Render workspace. Dedicated source code repository for public-demand discovery, lead qualification and compliant call-center handoff.

**Status: initial setup only.** The external BioShield Supabase database is not connected, Firecrawl/TinyFish are not configured for recurring operation, and no leads or telephone numbers are collected or exposed.

## First-stage goals

- Dedicated web interface for administrators, with filtered candidate, source, provider and execution views.
- Truthful empty states (unknown counts are not reported as zero).
- Server-side boundaries for future Supabase, Firecrawl and TinyFish integrations.
- Explicit human and legal approval before any sales outreach; a publicly accessible post is not consent to unsolicited contact.
- No dependencies on the private GeorgeGkogkos/DST codebase.

## Environment

The existing Render workspace is **My Workspace**. Target is the DST project; its project/environment assignment must be confirmed on Render because the service-creation connector cannot specify a project ID.

Linear project: https://linear.app/gkg/project/bioshield-admin-operations-system-79b033ffab9a (DST team, issues DST-265 through DST-270).

## Repository and security

This repository is currently PUBLIC. Never commit Supabase secrets, Firecrawl/TinyFish API keys, contacts, discovered personal information or customer data. All integrations will use server-side environment secrets and reviewed access controls. Production data endpoints remain disabled by default until proper administrator authentication and data policies are implemented.

## Verified initial deployment — 2026-11-16

- Admin setup preview: https://bioshield-admin-operations.onrender.com/admin/operations
- Health check: https://bioshield-admin-operations.onrender.com/health
- Render service: https://dashboard.render.com/web/srv-dbt4minf3r2c73bu08e0
- Workspace: My Workspace; region: Frankfurt; plan: free; auto-deploy: disabled.
- First live deployment: dep-dbt4mjff3r2c73bu0b40, commit aeaeef10a18447a681f1ccd228c50c98bf176be1 (GitHub PR #1), status LIVE.
- GitHub Actions checks passed; actual health, page and read-only overview were fetched from the deployed service.
- Render DST project assignment is still unverified because the connected service-creation tool has no project/environment argument. Track as Linear DST-271; use the Render Dashboard's Move control to group this service under the existing DST project without modifying dst-web.

The page is a PUBLIC setup preview and MUST NOT contain any personal/contact data until proper admin authentication and the external business database are verified.


## Performance lab (before external Supabase)

BIO-08/BIO-09: a deterministic 30-case synthetic Greek corpus, conservative request classifier, URL dedupe and Firecrawl/TinyFish mock failover. No external network requests or PII. Test CPU-only throughput via `python -m bioshield.benchmark --iterations 10000 --check` (also GitHub Actions artifact). Details: [docs/PRE_SUPABASE_TESTING.md](docs/PRE_SUPABASE_TESTING.md). This is NOT real-world precision or provider/backend load testing.
