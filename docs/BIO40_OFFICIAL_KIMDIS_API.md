# BIO-40 — Official Greek KΗΜΔΗΣ Open Data, read-only discovery

## Primary source and real evidence (17 November 2026)

Official API documentation: https://cerpp.eprocurement.gov.gr/khmdhs-opendata/help

The Greek KΗΜΔΗΣ / ESIDIS Open Data API allows free retrieval of public procurement notices (CC BY 4.0) and updates stored data approximately every 24 hours. Its documented rate limit is 350 requests/minute. BioShield calls only the public, read-only search action POST /khmdhs-opendata/notice?page=N. The separate authenticated submission API /khmdhs-api is NEVER called.

- Verified POST with referenceNumber 26PROC020176714: HTTP 200, exactly one Municipality of Peristeri notice, with submissionDate 2026-11-12T09:33:29, finalSubmissionDate 2026-11-17T15:00:00, cancelled=false.
- Official record: https://cerpp.eprocurement.gov.gr/upgkimdis/unprotected/home.xhtml?referenceNumber=26PROC020176714
- 2026-11-01 through 2026-11-17 source query (CPVs 90922000-6, 90923000-3, 90921000-9 and 90470000-2) returned 57 official records across two pages. A separate title search for απεντόμωση returned 21 possibly overlapping records. These are NOT 78 distinct offers or automatically confirmed opportunities.

## Behavior and gates

- GET /api/bioshield/discovery/kimdis provides 30-day public notice metadata only, filtered with official CPV and title queries (three CPV groups and one Greek-title query).
- Fixed queries, ≤2 pages per search, ≤8 provider requests per cache refresh, 8-second timeout per request, ≤1.2MB response per request and 1-hour in-process successful cache.
- Registry records normalized/deduplicated by exact official ADAM and by no other invented identity. Results include only title, government buyer, original submission date, recorded final-submission deadline, CPVs, publicly posted budget when valid, official links, source type, service codes and non-eligibility warning.
- Canceled and expired items are not promoted to the current search list. Missing deadlines require review. A future registered deadline does NOT prove tender remains open, accepts general bids, or is a client lead. Original issuer document controls.
- Any authorEmail, VAT, signer, private contact or CRM fields are excluded by a field allowlist. No write to production Supabase, contacts or call center.
- On partial responses, hard page limits or source outage, API displays incomplete/unavailable status, never stale records labelled live.
- Unified Search Δημόσιο includes KΗΜΔΗΣ as a SECOND official procurement source beside TED; TED tab remains TED-only. Search and service filters apply equally. Async load does not block the existing app shell.
- No scheduled KΗΜΔΗΣ importer is claimed; the current new source is cached on-demand. Source attribution: KΗΜΔΗΣ official public procurement Open Data API, CC BY 4.0.
- TED and KΗΜΔΗΣ can publish records referring to one procurement. Never sum provider counts into distinct opportunities without original-source reconciliation.

## Release evidence

Source tests: tests/test_kimdis_discovery.py and tests/test_kimdis_results.mjs; GitHub quality-gate CI. Record actual merged PR, Render deploy ID, exact Git SHA, LIVE API/browser checks in Linear DST-303 and the independent BioShield Notion Knowledge Base: https://app.notion.com/p/41a3740d593381c6899edce2dbbecd15.
