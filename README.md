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

The existing Render workspace is **My Workspace**. The BioShield and dst-web services have been verified in the same DST Render environment (evm-dattkog93c1s73bvj6rg).

Linear project: https://linear.app/gkg/project/bioshield-admin-operations-system-79b033ffab9a (DST team, issues DST-265 through DST-273).

## Repository and security

This repository is currently PUBLIC. Never commit Supabase secrets, Firecrawl/TinyFish API keys, contacts, discovered personal information or customer data. All integrations will use server-side environment secrets and reviewed access controls. Production data endpoints remain disabled by default until proper administrator authentication and data policies are implemented.

## Verified initial deployment — 2026-11-16

- Admin setup preview: https://bioshield-admin-operations.onrender.com/admin/operations
- Health check: https://bioshield-admin-operations.onrender.com/health
- Render service: https://dashboard.render.com/web/srv-dbt4minf3r2c73bu08e0
- Workspace: My Workspace; region: Frankfurt; plan: free; auto-deploy: disabled.
- First live deployment: dep-dbt4mjff3r2c73bu0b40, commit aeaeef10a18447a681f1ccd228c50c98bf176be1 (GitHub PR #1), status LIVE.
- GitHub Actions checks passed; actual health, page and read-only overview were fetched from the deployed service.
- Render project grouping verified by matching the environment IDs of bioshield-admin-operations and dst-web. BIO-07 / DST-271 has been completed without moving or changing either service.

The page is a PUBLIC setup preview and MUST NOT contain any personal/contact data until proper admin authentication and the external business database are verified.


## Performance lab (before external Supabase)

BIO-08/BIO-09: a deterministic 30-case synthetic Greek corpus, conservative request classifier, URL dedupe and Firecrawl/TinyFish mock failover. No external network requests or PII. Test CPU-only throughput via `python -m bioshield.benchmark --iterations 10000 --check` (also GitHub Actions artifact). Details: [docs/PRE_SUPABASE_TESTING.md](docs/PRE_SUPABASE_TESTING.md). This is NOT real-world precision or provider/backend load testing.

## BIO-10 — Real public evidence, not CRM leads

One-time snapshot from **real** public sites, dated 2026-11-16: 7 public institutional pest-control tenders and 5 forum discussions, with independent source URLs, timestamps where published, evidence-level labels and no contacts. Accessible in the dashboard's `Πραγματικά ευρήματα` tab and `GET /api/bioshield/pilot/evidence`. **Zero confirmed current contactable private leads**. This is NOT an automatic discovery feed, nor confirmation that tenders remain open. Three Firecrawl accounts had zero credits, and some official sources blocked automation. No Supabase connection, provider automation or customer data. Full methods: [docs/BIO10_REAL_SOURCE_PILOT.md](docs/BIO10_REAL_SOURCE_PILOT.md).

## BIO-11 — separate Individuals, Public-Sector Tenders and Businesses

The **Πραγματικά ευρήματα** dashboard now displays three distinct **customer/buyer groups**: **Ιδιώτες** (private/residential), **Έργα Δημοσίου** (public buyers and procurement notices) and **Επιχειρήσεις** (private-company buyers). Cases without enough evidence remain explicitly **Αδιευκρίνιστα**, never forced into one of the three categories. The current real snapshot has 4 individually contextualized public threads, 7 public tenders, 0 proven business requests, and 1 unresolved post. These are **source classifications, not contactable leads**. Business-vs-public-vs-private behavior has offline regression tests. [Classification and future database contract](docs/BIO11_CUSTOMER_SEGMENTS.md).


## BIO-12 — Isolated Supabase live demo (second account)

The **BioShield — Live Demo Sandbox** project in the user's second Supabase account (project ref `lbavrwknupfhdyelevto`, Frankfurt, free project with quoted cost 0/month) was **initially seeded with 12 real, public-source-only evidence summaries** and no personal contact details: 7 institutional procurement notices, 4 historical public posts in an individual context, 1 source requiring buyer review, and 0 substantiated B2B buyer requests. The new live endpoint `GET /api/bioshield/demo/evidence` reads this database over a read-only, RLS-protected Supabase Data API; the admin preview shows **last live fetch**, manual refresh and 30-second conditional refresh. The publishable key is stored only in Render environment variables. The company-owned production Supabase and lead/contact routes stay disconnected/HTTP 403. See [security and setup notes](docs/BIO12_SUPABASE_LIVE_DEMO.md). No false claims that saved historical evidence means live crawler discovery.


## BIO-13 — Fresh Reddit discussions first (30 days)

The user requests **more recent Reddit findings**, not older historical threads shown as opportunities. BioShield now sorts community posts by original posting date, defaults to **last 30 days**, offers **last 7 days** or historical archive, and exposes separate recent/historical counts. Two inspected primary Reddit threads dated **2026-10-27 (Athens)** and **2026-11-02 (AskGreece)** were added as public, no-contact discussion metadata; neither constitutes a confirmed current service-order request. Historical older Reddit posts remain in the archive only; comments or re-crawls cannot reset freshness. This feature does not activate automatic Reddit crawling or customer outreach. See [the BIO-13 freshness policy](docs/BIO13_REDDIT_FRESHNESS.md).
