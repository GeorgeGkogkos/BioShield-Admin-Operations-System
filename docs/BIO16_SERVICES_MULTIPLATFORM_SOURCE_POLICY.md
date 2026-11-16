# BIO-16 — Plumbing, drain unblocking, and multi-platform public source discovery

Date: 2026-11-16 (Europe/Athens). Scope is real-source public research preview, not an authenticated CRM.

## Added services

| Service | Key | Official TED CPVs |
| --- | --- | --- |
| Απεντόμωση | `pest_control` | 90922000, 90924000 |
| Μυοκτονία | `rodent_control` | 90923000 |
| Απολύμανση | `disinfection` | 90921000 |
| Υδραυλικός | `plumbing` | 45330000, 45332000, 45332200, 45332400 |
| Αποφράξεις | `drain_unblocking` | 90470000, 45332300, 90460000 |

Reference: https://docs.ted.europa.eu/eforms/latest/reference/code-lists/cpv.html. These are procurement classifications, not proof of an open contract; building plumbing/drain-laying notices may refer to major infrastructure rather than domestic callouts.

`bioshield/ted_discovery.py` now queries all service CPVs together and attaches each official notice's exact matched category labels and codes, with a hard result cap, 30-day original publication freshness and no-contact defaults. Dashboard provides distinct service filter. `bioshield/engine.py` conservatively recognizes Greek requests for plumbing and drain clearing, but does not turn them into contactable leads. Existing private SQL **design proposal only** includes the new service keys; NO real company Supabase schema was modified.

## Source research findings, not fabricated clients

Public search-index exploration on Nov 16 found an independent Greek forum [HowToFixIt — Υδραυλικά & Θέρμανση](https://www.howtofixit.gr/forum/forumdisplay.php?f=358), with original index snippets displaying dated Oct 1, 2026 and older discussions. No independent original new (past 30 days), explicitly hiring post has been verified, and its robots.txt / commercial crawler permissions could not be verified. Therefore it is recorded only as a **candidate source requiring policy review**, not a currently running crawler and not as a lead.

Indexed Facebook/Instagram/TikTok search leads were explored but no original dated Greek service-buying request was corroborated from those platforms. Their access status remains blocked pending platform permission. Browsable search snippets alone are not evidence of current hiring or permission to contact a poster.

## Platform policy (read before enabling any crawler)

| Source | Current production state | Required prior to Firecrawl / TinyFish |
| --- | --- | --- |
| Reddit | `blocked_pending_written_commercial_approval` | Reddit express written commercial use approval and robots/terms clearance. User requested **NO RSS** and no RSS is used. |
| Facebook | `blocked_pending_platform_permission` | Meta express authorization and correctly scoped platform/API rights, no unapproved scraping. |
| Instagram | `blocked_pending_platform_permission` | Same Meta authorization rules as Facebook. |
| TikTok | `blocked_pending_eligible_api_access` | Approved API eligible for this exact commercial use; Research API is not available to commercial lead generation. |
| Independent public forums | `candidate_sources_found_policy_review_required` | Review original site terms/robots, allowed paths and rate limits, verify original posting date and actual hiring request. |
| TED | `enabled_official_api` | Open official public source, no login/crawl of social posts. |

Reddit policy: https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy and https://support.reddithelp.com/hc/en-us/articles/360043512931-Don-t-break-the-site.
Meta terms: https://www.facebook.com/legal/automated_data_collection_terms and https://developers.facebook.com/docs/content-library-and-api/content-library.
TikTok eligibility: https://developers.tiktok.com/docs/en/research-api-faq.

**Provider capacity:** all THREE linked Firecrawl accounts had 0 remaining credits at the exact check on Nov 16, 2026 (primary, backup 2, backup 3). This is a snapshot, not a permanent balance. No paid credits were purchased. TinyFish is not permission to scrape platforms whose commercial collection is restricted. The `permitted_to_crawl` function provides a deterministic fail-closed consent/credit/policy readiness gate but does NOT schedule an unauthorized crawler, bypass login, harvest usernames or execute remote fetches.

## Operating guarantees

- `GET /api/bioshield/services`: five service labels, no fake requests.
- `GET /api/bioshield/discovery/tenders`: actual EU TED official live search, sorted by original official publication date; expanded 11 CPVs, per-service count and source link.
- `GET /api/bioshield/discovery/sources`: original URL/policy information, actual blocked statuses, point-in-time Firecrawl capacity, and service coverage; no fake social-media posts.
- No RSS for Reddit, no unsolicited DMs/calls, no private-person identity or contact scraping.
- Only relevant public source metadata; a homeowner describing a blocked sink is not automatically an explicit request for a paid plumber.
- Real automatic *social/forum post* discovery is **not yet enabled** until written API/platform permission, eligible provider credits and original-source/robots verification are present.

## QA and release

- Offline tests in `tests/test_services_sources.py`: classification, five services, CPV source tagging, contact eligibility zero, Reddit/Meta/TikTok permissions and fail-closed no-credit checks.
- GitHub PR and CI run, actual Render LIVE deploy, direct TED API verification and Notion/Linear links must be recorded on DST-279.