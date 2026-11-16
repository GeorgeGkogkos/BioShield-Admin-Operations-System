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
- New read-only `GET /api/bioshield/discovery/map` reports official TED geographies with **administrative-center markers**, explicit precision/buyer-only labels and zero-coverage-region research hints. Two ambiguous Attica buyer-office references are deliberately unlocated rather than falsely mapped as jobs. The responsive `Χάρτης / Κάλυψη` tab now uses a **genuine OpenStreetMap street basemap** with locally hosted Leaflet JS/CSS, real Greek coastlines, towns/roads, pan/zoom, source-linked pins and working service/region/date filters. Approximate administrative points are clearly identified, not alleged worksites.
- [BIO-17 implementation and limitations](docs/BIO17_HOURLY_COVERAGE_MAP_X.md).


### BIO-17 browser fix — local vector map

An actual browser E2E test of PR #10 found that the external Leaflet CDN did not load; the fallback list displayed all points regardless of filters. The follow-up fix replaces external CDN tiles/scripts with a self-hosted interactive SVG Greece map using a simplified Natural Earth public-domain boundary. The map is now independent of external tile providers, and filters redraw both the vector pins and source list from the same verified source rows. This correction makes precise source date, service and area filtering testable, without inventing addresses. Source boundary: https://www.naturalearthdata.com/ .


## BIO-18 — Real geographic basemap replaces the schematic outline

After reviewing the screenshot of the oversimplified geographic silhouette, the bespoke pseudo-map was retired. The application now serves Leaflet JS/CSS locally under `static/vendor/` (BSD-2-Clause licensed) and uses a real OpenStreetMap tile layer for **only the map viewport that a visitor actively views**, with visible © OpenStreetMap contributors attribution. Local Leaflet assets avoid the external-CDN failure from BIO-17. No tile downloads in batch, no pre-fetch, no proxy and browser HTTP caching is preserved. If tile loading fails, an explicit warning and external OSM link are shown while the official TED source list remains usable. Existing source filters, click-through, issuer-only location warnings and admin coverage metrics remain intact. See [BIO-18 basemap engineering notes](docs/BIO18_REAL_OPENSTREETMAP.md).


### Leaflet 1.9.4 reliability correction (2026-11-16)

The original BIO-18 live browser test found no OpenStreetMap tile images after the initial self-hosted Leaflet 1.3.1 release, although pins and filters worked. This is not considered a successful map rendering. A follow-up hotfix upgrades the self-hosted assets to **Leaflet 1.9.4**, removes unnecessary cross-origin anonymous image loading, adds a delayed viewport resize pass and a visible tile-loading failure warning even when no `tileerror` event fires. The dashboard also accepts `?tab=map` for a direct, shareable map view and independent screenshot QA. This changes no source evidence or private data. The real basemap must still be visually tested after deployment; mere loading of attribution or markers is not sufficient.


## BIO-19 — Separate TypeScript pages and PDF-derived public research

The five BioShield sections are now **real, bookmarkable URLs** with typed TypeScript History API navigation and accessible transitions: [Overview](https://bioshield-admin-operations.onrender.com/admin/operations/overview), [New discoveries](https://bioshield-admin-operations.onrender.com/admin/operations/discovery), [Saved evidence](https://bioshield-admin-operations.onrender.com/admin/operations/evidence), [Map](https://bioshield-admin-operations.onrender.com/admin/operations/map) and [Sources & controls](https://bioshield-admin-operations.onrender.com/admin/operations/sources). Back/forward, reload and older `?tab=map` deep links are supported.

The Sources page contains a searchable categorized Greek **Perplexity 28-page PDF-based keyword playbook** (services, pests, professional-request vs problem-only phrases, spaces, Attica localities, ad signals), proposed provider links and example manual search queries. The read-only `/api/bioshield/research/config` endpoint exposes the catalog, explicitly excluding intermediary job marketplaces from public discussion research, and enforcing original-post **7-day freshness** for offline evidence triage; no dated-2021 posts are relabeled as current due to later comments. Existing water/plumbing/drain keywords are kept separately.

**No social/forum commercial crawler, private customer contact intake or unsolicited outreach was activated.** The Perplexity PDF is a proposal, not provider terms approval. Only TED official notices remain live automated discovery.

See [BIO-19 technical source-based design](docs/BIO19_TS_PAGES_PERPLEXITY_RESEARCH.md).


## BIO-20 — Actual discovery clocks, geographic priorities and black UI

- The Overview and Discovery pages display the actual `searched_at_utc` of the last TED API check and a distinct last genuinely observed scheduled GitHub Actions run timestamp/conclusion, not a fabricated hourly success.
- A manual official TED search button supports service, text, permanent base and temporary region options; force refresh is globally rate-limited to one run per 180 seconds per process.
- Home default Ilion triggers additional official NUTS queries across Attica, Evia and Corinthia. An explicitly selected temporary region adds a separate query instead of replacing home. Device location is optional and permission-based, reduced client-side to a coarse zone; exact GPS is not stored or uploaded.
- Distant national tenders enter the actionable list only when official notice NUTS location and EUR total-value >= 100000 have been verified. Unknown tender values/locations remain review-only. No live B2B or hotel social crawler is implied.
- Candidate official Greek sources beyond TED: KIMDIS, ESIDIS services, ESIDIS works and Diavgeia, clearly marked as verified public pages but not yet connected ingestion; Diavgeia has a reported search limitation as of 2026-11-16.
- Hourly verified official TED snapshot now preserves `first_seen_at_utc` and `last_seen_at_utc` for each notice, separate from `published_on` and live server query clocks.
- The oversized shared header/alert was moved into Overview only. The first load shows the real BioShield logo; dark theme now uses black and neutral charcoal surfaces.
- Independent, private [BioShield Project Knowledge Base on Notion](https://app.notion.com/p/41a3740d593381c6899edce2dbbecd15) has its own project history rather than living under DST.

Read [BIO-20 detailed engineering notes](docs/BIO20_GEOFOCUS_MANUAL_HEARTBEAT_UI.md) for official source URLs, permission and location limitations, QA and launch requirements.
