# BIO-13 — Recent-first Reddit research (2026-11-16)

## User requirement
The user does not want old Reddit discussions to count as fresh search results. New default: **original Reddit posts from the past 30 days**; prioritize past **7 days**. Older source records remain available only in a clearly labeled archive.

Use the **original post creation date**, not the last comment, crawling timestamp, or database insertion date. Inspect/open actual public source pages before saving evidence. Prefer Greece-local subreddits r/athina, r/AskGreece, r/greece and r/thessaloniki. Exclude r/Athens, which primarily refers to Athens in Georgia, USA, unless post itself proves Greece.

## Verified original posts

| Evidence ID | Original created UTC | Subreddit | Source | Meaning |
| --- | --- | --- | --- | --- |
| FORUM-007 | 2026-11-02 19:23 | r/AskGreece | https://www.reddit.com/r/AskGreece/comments/1xm6rsv/ | Discussion about bedbug experiences in homes/workplaces; NOT actively hiring a crew |
| FORUM-006 | 2026-10-27 22:40 | r/athina | https://www.reddit.com/r/athina/comments/1xh76lo/ | Athens resident describing cockroach sightings and asking how to manage them; NOT actively seeking a service quote |

The original primary Reddit pages were opened and inspected on 16 Nov 2026. Public source summaries only; no Reddit names, usernames, phone numbers or email addresses saved. Both records have contact_eligible=false and case_status=not_hiring.

## Live demo database and filtering

- Supabase second-account isolated free demo project: lbavrwknupfhdyelevto.
- Table public.bioshield_demo_evidence has 2 new source-linked rows FORUM-006 and FORUM-007 alongside older historical samples.
- Read-only backend endpoint GET /api/bioshield/demo/evidence exposes each community case's post_age_days, within_7d and within_30d plus reddit_freshness aggregate counts.
- Date calculations are UTC-current and boundary-tested at 7 and 30 days. A missing, malformed or future original post date fails closed.
- The dashboard defaults to Reddit posts within 30 days, sorted by newest original publication date. A selector offers 7 days or historical+recent.
- The separate public-procurement results remain visible and subject to their own timing/eligibility verification.
- 30-second automatic refresh reads SAVED DATABASE DATA; it does not automatically search Reddit. Continuous source discovery and ingestion are not implemented by this change.

## Safety and data-quality rules

- Recent discussion means topical signal, not verified buying intent, consent or contact eligibility.
- No individual outreach, account profiling, private contact collection or false lead promotion.
- Store exact primary URLs, original publication dates and review status. Comments do not reset an old post's freshness.
- If there are no recent explicit service requests, report zero. Preserve older posts only as historical context, never active leads.

## Release and evidence

Linear issue DST-277 (BIO-13). GitHub PR, CI, Render LIVE deployment and direct browser verification are recorded on that issue when deployment is completed.