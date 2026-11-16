# BIO-36 — Strict recent individual requests (14 days)

## Requirement (2026-11-16)
Show **only genuinely recent individual service-request evidence**, never month-old forum threads in BioShield's main search. Default to a rolling **14-day maximum**, with an optional stricter 7-day filter. The original post publication date, not crawl/read date or newest comment, determines age.

## User-facing behavior
- Search > Ιδιώτες: show only source-opened, original-post-verified entries at most 14 UTC calendar days old that actually requested a professional/service recommendation. Older posts, problem-only discussions, already-served cases and unverified originals are excluded from the results; no historical toggle in the main search.
- If no cases qualify, display an honest empty state, never substitute older posts.
- Secondary evidence/pilot page: display only original posts at most 14 days old, sorted newest first, with 14-day default / 7-day optional age filters; this page labels them **discussion evidence**, not active jobs.
- The overview's individual evidence count reflects the rolling 14-day verified-publication slice, not all accumulated history.
- Public-sector / business search behavior stays unchanged.

## Data & limitations
- Existing rows remain in the isolated second-account Supabase as non-contact historical research for provenance and audit. This PR changes API freshness flags and front-end presentation; it does **not** delete history or enable CRM.
- API `reddit_freshness.window_days=14`, `recent_posts_14d`, and `community_cases[].within_14d`. Already-existing `within_7d` remains.
- Invalid, missing, future-dated or unopened original posts fail closed. A recent comment cannot refresh an old original post.
- There are no confirmed contactable individual leads in the tested demo; only public-safe evidence. Approved Reddit/Meta/X crawling, authentication and outreach remain disabled.
- Do not convert discussion metadata into personal profiles, do not collect contact details, and do not claim the saved records are actively available jobs.

## Regression
- `tests/test_demo_db.py`: 7-, 14-, 15- and 31-day edge cases, old-post-newly-observed, unopened source exclusion.
- `tests/test_recent_individual_results.mjs`: search-only verified recent explicit demand, truthful zero state, no old records in rendered secondary evidence, no 30-day/all-history filter.
- GitHub Actions runs Python and Node regression suites. Actual Render deployment must be separately verified; publishing the PR alone does not deploy.

## Source policy
This supersedes the older BIO-13 30-day **display default**, without changing the underlying historical evidence archive or third-party platform restrictions.
