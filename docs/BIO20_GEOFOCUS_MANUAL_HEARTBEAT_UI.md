# BIO-20 — Verifiable discovery clocks, geographic priorities, new Greek government sources and UI redesign

## Requested outcome (user screenshots, 2026-11-16)

1. Display **real discovered/checked timestamps** and a verifiable **hourly GitHub Actions scheduled-run status** rather than a static description saying a cron should run.
2. Permanently search near **Ίλιον, Αττική + Εύβοια + Κορινθία**, add a **temporary current area** when traveling without dropping home searches, and reserve faraway results for verified large jobs, where official tender value and geography are actually evidenced. More private business/hotel demand remains blocked until approved provider integrations exist.
3. Investigate other official Greek public procurement sources beyond TED (KIMDIS, ESIDIS services/works, Diavgeia) and show candid connection states.
4. Keep BioShield independent from the DST knowledge archive; create a dedicated Notion project handbook.
5. Allow **manual real search** from UI with service, keyword and geographic filters, rate-limited official source query.
6. Put the shared hero/banner and evidence caveat **inside the Overview route only**, so other pages don't animate a huge shared banner.
7. Brand the initial loading state with the supplied BioShield company logo.
8. Make dark theme literally black/neutral rather than green.

## Independent Notion and working links

- Independent top-level private Notion **BioShield — Independent Project Knowledge Base**: https://app.notion.com/p/41a3740d593381c6899edce2dbbecd15 (NOT a child of DST). Contains the user decisions, architecture, lineage, public provider registry, limitations and release history. Other existing Notion pages are not erased.
- GitHub: https://github.com/GeorgeGkogkos/BioShield-Admin-Operations-System . Render: https://bioshield-admin-operations.onrender.com/admin/operations/overview .

## Verified government procurement sources from their original public sites

| Source | Official URL | Role | Actual automated status |
| --- | --- | --- | --- |
| EU TED | https://docs.ted.europa.eu/api/latest/search.html | Public official notices via POST /v3/notices/search | **Active official API** |
| KIMDIS (ΚΗΜΔΗΣ) | https://portal.eprocurement.gov.gr/esidisportal/ | Greek contract public notices; official portal advertises Open Data API | Verified public page only, **not integrated** |
| ESIDIS Services (ΕΣΗΔΗΣ Προμήθειες & Υπηρεσίες) | https://nepps-search.eprocurement.gov.gr/actSearch/faces/active_search_main.jspx | Procurement search for service contracts | Verified public page only, **not integrated** |
| ESIDIS Public Works | https://portal.eprocurement.gov.gr/esidisportal/ | Works, studies and technical public contract search | Verified public page only, **not integrated** |
| Diavgeia (Διαύγεια) | https://diavgeia.gov.gr/search | Official government decisions and award-related acts | **Partially unavailable** on 2026-11-16; official site said search limited to ADA pending maintenance; not integrated |

The ESIDIS portal itself exposes KIMDIS Open Data API documentation; this does not imply open anonymous extraction without review, compatible rate limit, attribution and primary-source verification. No actual additional Greek government provider currently writes BioShield results. Identical contracts may be present in multiple portals; deduplicate by official notice IDs/ADAM when a connector is eventually developed.

## Geographic policy

Home is stored as **a coarse region ID on the browser only**, default `ilion`. This setting is changeable via the UI. `ilion` triggers an additional **real** official TED search with `place-of-performance IN (EL301 EL302 EL303 EL304 EL305 EL306 EL307 EL642 EL652)`. Region codes are the official 2024 TED/eForms Greek NUTS-3 codes https://docs.ted.europa.eu/eforms/latest/reference/code-lists/nuts-grc-lvl3.html: Attica, Evia, Corinthia.

A second user-selected temporary region from the visible supported list generates its own additional targeted official query if it is not already covered by home; no replacing or deleting the home group. Selection may be manual or via optional device Geolocation API **only after user explicitly clicks 'Χρήση θέσης συσκευής' and accepts browser permission**. Browser GPS is transformed **locally** to an approximate, named region using conservative bounding boxes; only the coarse ID is sent as a first-party query parameter. GPS coords, reverse geocoding, contacts, Wi-Fi or precise addresses are **not** stored, sent or tracked server-side. Watch is stopped by user or on tab hidden; no always-on background agent, no claims about travel while website is closed.

**Known limitation:** coarse bounding rectangles are heuristics, NOT certified NUTS polygons or proof of municipality. Use manual selection when region is not confidently recognized. At launch, supported user-selectable home/temporary zones are Ilion, Attica, Evia, Corinthia, Thessaloniki, Achaia, Heraklion, Larisa and Rhodes. Expansion across all Greece requires official polygon data, explicit privacy review and tested edge cases.

National TED results are shown in the main list **only** if the source contains a NUTS-3 place-of-performance code in the user's union of home/temporary region codes, OR is far and includes a validated explicit official EUR total-value of at least **€100,000** (initial commercial threshold; not legal criterion). Notice metadata with missing/ambiguous value, unknown geography, or a buyer headquarters without worksite NUTS does NOT satisfy the far-deal gate; separate targeted search results may still need reading of the original notice to confirm the worksite. At this stage this gate applies **only to official tenders**. No claim that commercial hotel/private company searches are already live.

## Actual discovery timestamps / scheduled heartbeat

- **TED searched_at_utc** on actual live official response (or checked_at_utc with explicit unavailable state); display converted to `Europe/Athens` with cache status. The `published_on` metadata of the notice is distinct.
- `GET /api/bioshield/discovery/heartbeat` queries the public GitHub Actions REST endpoint for actual scheduled runs of discovery.yml with `event=schedule`. It reports a real `run_started_at`, status and conclusion, or **unknown/unavailable**, never a synthetic run just because the workflow has a cron expression. Cache 300s. GitHub Actions can run late or skip scheduled jobs.
- Hourly `scripts/sync_ted.py` snapshot carries **first_seen_at_utc** and **last_seen_at_utc** for each verified TED publication number since BIO-20 (first seen not backfilled before the feature). New runs retain the original first_seen timestamp from the previous snapshot, rather than replacing it. The live dashboard search time is NOT always the first-seen time. Hourly persistence is via existing data/ted-current.json committed by GitHub Actions; Render remains manually deployed, so one should not confuse live server cache with hourly Git snapshot.

## Manual search and protection

- UI button runs `GET /api/bioshield/discovery/manual?home=...&temporary=...` (only strict whitelist of coarse region IDs, no user-provided URLs). This executes one bounded official TED home query, optional additional travel query and refreshes the national TED query. Maximum 35 source rows per request and fixed CPV set.
- Global in-instance manual force cooldown >=180 seconds, with HTTP 429 and Retry-After. This is not per-user authentication. A production/private internal admin console should eventually require authentication for force-refresh, quotas and audit, but avoids allowing unbounded arbitrary external scraping today.
- UI filters by service and text apply **after** the official response and do not claim the filter creates a new provider query; geography selection genuinely generates a fresh bounded TED `place-of-performance` query. Automatic check on initial load and 15-minute cache remains, hourly GitHub Action remains distinct.
- All public information is source-linked and its location/time/financial precision explicitly qualified. No fabricated new listings, contacts, personal addresses or outreach.

## UI and accessibility

- `/admin/operations/overview` contains the headline and evidence warning. Nav stays outside every route. Overview and discovery show real provider timestamp/GitHub heartbeat.
- `static/index.html` and runtime `brandedLoader()` render supplied official BioShield logo and status while initial official endpoints resolve. Motion respects prefers-reduced-motion.
- Dark palette: `--canvas:#000` black, `--paper:#08080a` near-black neutral, cards #111114 and no green-based background. Accent uses subtle ice blue for control contrast; OSM basemap retains actual map imagery.
- Five existing typed route paths, map and source search remain independent; no common hero across transitions.

## Failure modes and explicit honesty

- The Search API may return no source records or reject unavailable fields; failures display unavailable and no fabricated substitute. The `place-of-performance` query syntax is supported by https://ted.europa.eu/en/help/search-browse, but each deployed runtime must still be tested against the live API.
- KIMDIS Open Data API requires separate integration/research; **official public link alone is not an operational provider**.
- Location can only be watched while the page is open/visible after consent. No background or OS-level tracking has been installed.
- No private/social-platform crawlers are enabled just because Firecrawl/TinyFish connectors exist. No Reddit RSS. No automatic marketing outreach or access to the private corporate Supabase.

## Release evidence

Record GitHub PR, tested SHA, main Actions success, real Render deploy id/status/SHA, live browser checks for five routes and map, exact Linear BioShield issue and independent Notion update. Update this section with actual observed results; never assert deployment without the Render record.