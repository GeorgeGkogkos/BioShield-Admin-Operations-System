# BioShield Admin Operations System

Independent BioShield admin operations application hosted in the DST Render workspace. Dedicated source code repository for public-demand discovery, lead qualification and compliant call-center handoff.

**Status: real public-source discovery preview.** Official EU TED procurement discovery is enabled, alongside a separate RLS-protected read-only Supabase demo. No synthetic request datasets remain in the running app or source-code fixture corpus. External company Supabase, private candidate intake, commercial Reddit automation and call-center handoff remain disabled.

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


## Previous synthetic lab (removed from running app)

The BIO-08/BIO-09 fabricated request examples, API routes, UI and mock benchmark files were removed by BIO-14. Historical technical notes remain under `docs/` as archival design context only. Production-quality real-world precision cannot be inferred from any synthetic testing.

## BIO-10 — Real public evidence, not CRM leads

One-time snapshot from **real** public sites, dated 2026-11-16: 7 public institutional pest-control tenders and 5 forum discussions, with independent source URLs, timestamps where published, evidence-level labels and no contacts. The old static API `/api/bioshield/pilot/evidence` was removed by BIO-14; real public evidence is read from the separate Supabase demo. **Zero confirmed current contactable private leads**. This is NOT an automatic discovery feed, nor confirmation that tenders remain open. Three Firecrawl accounts had zero credits, and some official sources blocked automation. No Supabase connection, provider automation or customer data. Full methods: [docs/BIO10_REAL_SOURCE_PILOT.md](docs/BIO10_REAL_SOURCE_PILOT.md).

## BIO-11 — separate Individuals, Public-Sector Tenders and Businesses

The **Πραγματικά ευρήματα** dashboard now displays three distinct **customer/buyer groups**: **Ιδιώτες** (private/residential), **Έργα Δημοσίου** (public buyers and procurement notices) and **Επιχειρήσεις** (private-company buyers). Cases without enough evidence remain explicitly **Αδιευκρίνιστα**, never forced into one of the three categories. The current real snapshot has 4 individually contextualized public threads, 7 public tenders, 0 proven business requests, and 1 unresolved post. These are **source classifications, not contactable leads**. Business-vs-public-vs-private behavior has offline regression tests. [Classification and future database contract](docs/BIO11_CUSTOMER_SEGMENTS.md).


## BIO-12 — Isolated Supabase live demo (second account)

The **BioShield — Live Demo Sandbox** project in the user's second Supabase account (project ref `lbavrwknupfhdyelevto`, Frankfurt, free project with quoted cost 0/month) was **initially seeded with 12 real, public-source-only evidence summaries** and no personal contact details: 7 institutional procurement notices, 4 historical public posts in an individual context, 1 source requiring buyer review, and 0 substantiated B2B buyer requests. The new live endpoint `GET /api/bioshield/demo/evidence` reads this database over a read-only, RLS-protected Supabase Data API; the admin preview shows **last live fetch**, manual refresh and 30-second conditional refresh. The publishable key is stored only in Render environment variables. The company-owned production Supabase and lead/contact routes stay disconnected/HTTP 403. See [security and setup notes](docs/BIO12_SUPABASE_LIVE_DEMO.md). No false claims that saved historical evidence means live crawler discovery.


## BIO-13 — Fresh Reddit discussions first (30 days)

The user requests **more recent Reddit findings**, not older historical threads shown as opportunities. BioShield now sorts community posts by original posting date, defaults to **last 30 days**, offers **last 7 days** or historical archive, and exposes separate recent/historical counts. Two inspected primary Reddit threads dated **2026-10-27 (Athens)** and **2026-11-02 (AskGreece)** were added as public, no-contact discussion metadata; neither constitutes a confirmed current service-order request. Historical older Reddit posts remain in the archive only; comments or re-crawls cannot reset freshness. This feature does not activate automatic Reddit crawling or customer outreach. See [the BIO-13 freshness policy](docs/BIO13_REDDIT_FRESHNESS.md).


## BIO-14 — Company logo, no synthetic requests, automatic official discovery

- The uploaded BioShield company emblem (resized/optimized but not redrawn) is installed as the website icon and the visible brand logo under `static/bioshield-company-logo.png`.
- Synthetic request fixture corpus, synthetic lab UI/REST endpoints and mock benchmark/source outputs were removed from production source. Pure unit tests still use isolated test objects and never present them as real leads.
- `GET /api/bioshield/discovery/tenders` queries the **official EU TED Search API** automatically on dashboard entry, with a 15-minute per-instance cache. The bounded 30-day, Greece-only query covers CPV 90921000/90922000/90923000/90924000. It displays only official public procurement metadata, source URLs and review requirements; it does not infer a current bid opportunity or buyer contact eligibility.
- `.github/workflows/discovery.yml` schedules an official TED scan every six hours on GitHub Actions and writes a nonpersonal `data/ted-current.json` snapshot only if the provider returns a valid response. The Render frontend also reads the live TED API independently; the action is not a Supabase CRM ingestion worker.
- Reddit commercial automated retrieval stays **disabled** until Reddit gives written approval. As of November 13, 2026 Reddit's RSS support ended; no RSS bypass or unauthorized scraping is used. See [Reddit official data-access rules](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data) and [October 2026 changelog](https://support.reddithelp.com/hc/en-us/articles/54353370049684-Changelog-October-8-2026).
- `GET /api/bioshield/discovery/providers` gives a truthful capability status. Private `/candidates`, `/discover` and `/handoff` remain HTTP 403; real commercial lead workflows require verified admin authentication, lawful basis and explicit review.
- [Detailed operating and safety guide](docs/BIO14_REAL_DISCOVERY_AND_BRANDING.md).

## BIO-16 — Five services, official plumbing/drain search, social/forum permission gates

- Added **Υδραυλικός (plumbing)** and **Αποφράξεις (drain unblocking)** as independent service categories alongside pest control, rodent control and disinfection. Official TED searches corresponding published CPVs for all five and attaches matched source tags to notices. Dashboard filters by service.
- `GET /api/bioshield/services` returns service labels. `GET /api/bioshield/discovery/sources` exposes permission/readiness for **Facebook, Instagram, TikTok, Reddit and independent Greek forums**.
- User expressly rejects Reddit RSS: **NO Reddit RSS is used**. Firecrawl/TinyFish do not bypass official Reddit, Meta or TikTok permission conditions. All 3 Firecrawl accounts had zero credits on 2026-11-16.
- Indexed Greek independent forum [HowToFixIt — Υδραυλικά & Θέρμανση](https://www.howtofixit.gr/forum/forumdisplay.php?f=358) was found but fresh original hiring posts and automated crawl permissions could not be verified, so it is source-review only, not an active lead feeder.
- Company Supabase, marketing outreach and private contact collection remain disabled. The private candidate schema extension is an UNAPPLIED proposal.
- [Detailed BIO-16 source policy and CPV reference](docs/BIO16_SERVICES_MULTIPLATFORM_SOURCE_POLICY.md).

## BIO-17 — Hourly discovery, geographic coverage and X platform policy

- Official TED searches are now scheduled every **hour at :17** in GitHub Actions (GitHub scheduler can delay). On-open Render API retains bounded **15-minute** cache.
- The fourth ChatGPT-connected Firecrawl account was verified with **1,400 credits** on 2026-11-16 (prior 3: 0 credits each), but its credentials were NOT copied to Render. No in-server Firecrawl account rotation/crawling is claimed. Only authorized sources can be crawled.
- **X (Twitter)** appears in the research source-readiness registry. X's current terms prohibit crawling/scraping without express written permission. No automated X crawling, Reddit RSS, unsolicited contact or private customer collection.
- New read-only `GET /api/bioshield/discovery/map` reports official TED geographies with **administrative-center markers**, explicit precision/buyer-only labels and zero-coverage-region research hints. Two ambiguous Attica buyer-office references are deliberately unlocated rather than falsely mapped as jobs. The responsive `Χάρτης / Κάλυψη` tab uses Leaflet and OSM with visible attribution and service/region/time filters.
- [BIO-17 implementation and limitations](docs/BIO17_HOURLY_COVERAGE_MAP_X.md).
