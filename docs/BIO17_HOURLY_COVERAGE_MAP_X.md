# BIO-17 — Hourly official discovery, geographic map and X source policy

## Source of truth and release scope
- Official **EU TED** discovery workflow `.github/workflows/discovery.yml` now runs hourly at `17 * * * *` (GitHub can delay schedules). The website's **15-minute per-instance cache remains unchanged**; the cached website reads and hourly GitHub snapshot are separate execution paths.
- The fourth connected Firecrawl account was actually queried on 16 Nov 2026 and has **1400 credits**, compared with 0/0/0 for the original three. This is a point-in-time measurement. The connector runs inside ChatGPT, NOT inside Render: exposing an MCP account to the user does not automatically configure a server API key, and no Firecrawl crawling in the deployed server is claimed. No paid credits purchased.
- Added **X (Twitter)** to platform/source board with an explicit permission gate. X current 2026-10-09 Terms prohibit unapproved crawling/scraping, including through third-party scrapers. No X scraping is running. Source: https://x.com/en/tos ; https://help.x.com/en/rules-and-policies/x-automation .

## Map endpoint: real sources only
- `GET /api/bioshield/discovery/map` uses **the exact same verified TED official JSON** returned by `live_ted_report` and never makes a generic geocoder/web fetch from untrusted input.
- First mapped sample is expected to include a **Peloponnese region** from explicit official TED title, **Piraeus municipality** from explicit official title, and **Rhodes issuing authority** from the official buyer name only. These are **NOT verified precise work sites**. Coordinates represent approximate administrative centers, not a facility, address or home.
- The two Attica tender notices mentioning only their economic directorate in the buyer field do **not** confirm actual contract execution place. Do not assign a point to the 'Δυτικός Τομέας Αθηνών' or to arbitrary Athens coordinates.
- The endpoint reports `mapped_notice_count`, `unlocated_notice_count`, 13 Greek administrative-region observation counts and low-coverage flags for **research-source scarcity only**. A region with zero mapped notices in the restricted 30-day TED sample does **not** mean no actual incidents or no demand.
- Public map page uses Leaflet 1.9.4 / OpenStreetMap under visible attribution. The page includes service, administrative region and 7/30 day filters, real source clickthrough, clear approximate-location confidence labels, popup notices and low-observation region list.
- No individual addresses, private accounts, contact details or unverified social posts are placed on the map. Source URLs are canonical official TED notices.

## Firecrawl next steps and credit safety
- Maintain account priority primary → second backup → third backup → fourth backup. Existing three accounts have no credits, fourth verified 1400 as of 2026-11-16.
- To turn that into **Render-executed Firecrawl failover**, operators must supply separate scoped Firecrawl API keys through Render environment variables, verify API/ToS permission for each source, implement bounded rate limits and safe cost caps and inspect actual runtime provider errors. This is **not configured** and no secret/API key is committed.
- No RSS for Reddit. Reddit, X, Facebook, Instagram and TikTok must not be crawled for commercial leads without approved platform access. Firecrawl/TinyFish tools do not override platform restrictions.

## Validation
- Python tests assert 3 mapped / 2 unlocated for the 5 verified 2026-11 TED notices, explicit issuer-only Rhodes marker, Piraeus and Peloponnese title source, marker precision, 13 region counts and 10 unobserved regions. No fake event coordinates.
- Tests enforce hourly schedule, Leaflet/OSM asset, X source policy and 4th-account credit balance and fail-closed crawler gate.
- Confirm PR CI, actual GitHub workflow execution, Render LIVE SHA, `/discovery/map`, `/discovery/sources`, browser map pins/filters, and only then update Linear DST-280 and Notion archive.

## Limited claim
This release is hourly **official public-sector notice discovery** plus a geographic research map. It is not hourly Reddit/X/social discovery, automatically geocoded private-customer events, or a geospatial demand-density model. Observations are conditioned on the source and selected period.

### BIO-17 browser fix — local vector map

An actual browser E2E test of PR #10 found that the external Leaflet CDN did not load; the fallback list displayed all points regardless of filters. The follow-up fix replaces external CDN tiles/scripts with a self-hosted interactive SVG Greece map using a simplified Natural Earth public-domain boundary. The map is now independent of external tile providers, and filters redraw both the vector pins and source list from the same verified source rows. This correction makes precise source date, service and area filtering testable, without inventing addresses. Source boundary: https://www.naturalearthdata.com/ .
