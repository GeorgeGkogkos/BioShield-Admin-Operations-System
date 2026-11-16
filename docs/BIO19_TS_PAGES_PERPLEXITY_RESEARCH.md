# BIO-19 — TypeScript pages and Perplexity research playbook

## User request and source
On 2026-11-16 the user supplied a 28-page Perplexity PDF about detecting recent public discussion of demand for pest control and decontamination in Attica, and a screenshot of BioShield's five tab buttons. They asked to incorporate relevant keywords/source candidates, convert the tabs into separate pages with TypeScript and add transitions.

Source-derived rules here are from the supplied PDF, especially pp. 13–19 (discussion sources, exclusions, recency, Greek intent / pest / Attica vocabulary). These are **suggestions and research hypotheses, not confirmed current offers, commercial access rights, or verified leads**. Previously the user explicitly rejected intermediary marketplaces for public-discussion searches; accordingly the research query registry excludes `douleutaras.gr`, `myconstructor.gr`, `texnitesonline.gr`, `vrisko.gr`, and `xo.gr`. This exclusion does not hide official TED notices.

## Five separate URLs and TypeScript architecture

| Page | Route | Purpose |
| --- | --- | --- |
| Επισκόπηση | `/admin/operations/overview` | Real metadata / current indicators |
| Νέες ανακαλύψεις | `/admin/operations/discovery` | Verified official TED search output and filters |
| Αποθηκευμένα ευρήματα | `/admin/operations/evidence` | Isolated read-only second-account Supabase sample and age filters |
| Χάρτης / Κάλυψη | `/admin/operations/map` | Real OSM map, 3 approximate official geographic markers and coverage table |
| Πηγές & έλεγχοι | `/admin/operations/sources` | Existing provider permissions + new interactive Greek research lexicon |

`app.py` serves the same read-only HTML shell at each of the **five real server routes**, allowing direct bookmarks and browser refreshes. The `src/navigation.ts` TypeScript router handles history.pushState, popstate back/forward, document title, active link and accessible View Transitions respecting prefers-reduced-motion, without losing the currently loaded backend responses. The map's Leaflet instance is properly removed on route exit and recreated on re-entry. Previous `/admin/operations?tab=map` URLs still work.

`src/research-view.ts` and `src/navigation.ts` are strict TypeScript 5.8.3 modules. Browser files are checked in under `static/typed/` because the production Render service is currently a **Python-only runtime** whose build command installs Python requirements. GitHub Actions installs Node/TypeScript and runs `tsc --noEmit`, `tsc` build and JS syntax checks.

## Actual PDF-derived keyword groups

All selected Greek phrases are exposed in the read-only `/api/bioshield/research/config` endpoint and browsable in the Sources page by group and free-text filter. Groups: technical services, insects and rodents (cockroaches, bed bugs, fleas, ants, wood-borers, food moths, silverfish, mosquitoes, wasps, rats), **explicit request** phrases, **problem-only** phrases, property types/spaces and a 60+ municipality/neighborhood Attica lexicon. Plumbing/drain terms are separately labeled as **existing BioShield service scope not sourced from the PDF**.

- Search queries are separately formed by source domain and grammatical context (nine example patterns for Reddit, Insomnia and Facebook). A copy button is a convenience for **manual permitted research** and does not initiate a crawler.
- Candidate providers include Insomnia, local Facebook groups, Greekrentals/Greek Hosts, Reddit r/athina and Google Alerts. All are marked as *proposed, manual, needing appropriate permission, or research-only*; none becomes an active commercial crawler or authorized list of contacts.
- The existing TED open-data API remains the only live automatic discovery channel. All Facebook, Instagram, TikTok, Reddit, X and independent forum crawling gates remain unchanged and fail-closed. Reddit RSS is still disabled.
- The PDF's different date semantics are explicitly enforced in the **offline signal review**: `published_at`, `discovered_at` and `last_reply_at` are not interchangeable. Only a verified initial posting within 7 days can qualify for the main research review list; an old 2021 thread with an updated reply cannot masquerade as new. An explicit new comment, if investigated as an **independent** post with its own date, can be reviewed separately.
- Ranking: verified recent original post → explicit professional request before generic problem → Attica mentioned/verified → actual service relevance; ads are downranked; missing original source date / place are not upgraded. This never grants contact eligibility.
- Greek diacritic/case normalization, documented typo `απολίμανση` and transliterated `katsarides`, `korioi`, `psylloi`, `pontikia` are normalized for detection. These are lexical hints, not a calibrated AI identification of pests.

## Privacy and provenance boundaries

No new external crawler, paid provider integration, private data intake, outreach or CRM/Supabase write is deployed. The PDF's examples are not inserted as active requests. No implied permission to scrape social networks is inferred from search indexing or existing Firecrawl/TinyFish credits. Original-source validation, date verification and consent are separate required phases.

## Verification and release

- CI: Python tests cover route URLs, unknown path 404, read-only catalog API, old-2021 thread not recent, verified 7-day Attica examples, ad flags, excluded intermediaries, no contact eligibility, TypeScript source presence and correct default 7-day filter.
- Node: TypeScript 5.8.3 typecheck/build and JavaScript syntax checks.
- Live Browser: check each route direct, navigation link URLs, Greek searchable keyword chips, copy query, real source statuses and actual OSM tiles, preserved official TED data; do not claim successful QA until observed.
- Record merged GitHub PR, actual main SHA, Actions run, Render LIVE deployment and Notion/Linear DST-282 links.