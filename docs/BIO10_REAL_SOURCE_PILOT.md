# BIO-10 — Real public-source evidence pilot (16 November 2026)

This is a **REAL** (not synthetic) one-time desk-research snapshot based on public
web search and direct page reads. It is **NOT** an automatically maintained
discovery feed and **NOT** a list of confirmed contactable customer leads.

## Actual results (12 distinct public source records)
- Seven **organizational procurement notices** requesting pest-control and/or
  disinfection services. These are B2G opportunities (tenders), **not posts by
  private consumers**. Several may be direct invitations restricted to invited
  suppliers; publication is NOT evidence that every company may bid.
- Five **public community posts** opened/triaged for relevance. One 2026 post
  requests a recommendation for pest-control service, and one 2021 post also
  explicitly requested a provider but is archived/stale. Three examples are
  discussion, already-booked service or general advice.
- **Zero** verified fresh, contactable private leads and **zero** data handoffs.

The old and discussion examples remain as explicit *negative/expired gates*
because naive keyword matching otherwise creates false CRM candidates.

## Evidence and status conventions
- \`official_issuer_listing\`: issuer's public index was opened, plus
  cross-publisher metadata for deadline and budget.
- \`republished_full_notice\`: the published full notice was read on an
  independent republisher; original TED may be bot-blocked.
- \`indexed_notice_only\`: only search-index/third-party metadata available.
  This does **not** prove current status; inspect the official document before
  any commercial decision or formal proposal.
- \`as_of_date\` 2026-11-16 is the research snapshot date, **not an automatic
  recrawl timestamp**. Published deadlines can be extended/cancelled or a
  contract awarded early. The app displays the *reported* deadline and
  whether the calendar date has passed, **never a confirmed OPEN status**.
- No authentication bypass, no forced scraping of bot-blocked pages.
- No telephone numbers, emails, public forum usernames, personal contact
  information, full text reproductions, or direct marketing/CRM actions.

## Unique procurement notices
| ID | Authority | ADAM / TED | Reported deadline Greece local | Budget excl. VAT EUR | Evidence |
|---|---|---|---|---:|---|
| ORG-001 | Piraeus Municipality | 26PROC020101899 / TED 758868-2026 | Nov 30 14:00 | 483,400 | full TED notice copied by HelloTender; AKEP corroborates |
| ORG-002 | Perama Municipality | 26PROC020089295 | Nov 20 13:00 | 121,257 | official municipality index; corroborated catalogue |
| ORG-003 | Kassandra Municipality | 26PROC020174144 | Nov 16 15:00 | 25,136.40 | two metadata catalogues; KIMDIS blocked |
| ORG-004 | DEPTHE Thessaloniki | 26PROC020167152 | Nov 17 10:00 | 2,419.35 | third-party index only |
| ORG-005 | 6th Health Region / Kato Achaia | 26PROC020167136 | Nov 18 13:00 | 1,700 | third-party index only |
| ORG-006 | Pella Municipality | 26PROC020194253 | Nov 18 15:00 | 367 | third-party index only, mixed supplies/services |
| ORG-007 | Elassona Municipality | 26PROC020162777 | Nov 18, time not confirmed | 1,300 | third-party index only |

Source links exist per record in \`bioshield/real_pilot.py\` and in the public
read-only UI, with no login to the issuing organization. **Check KIMDIS/TED
directly before an offer**. This app cannot submit bids.

## Public discussions and false-positive control
- FORUM-001: Reddit Thessaloniki, 2026-09-10. Explicit recommendation request
  about bedbug service: true historic demand, NOT current confirmed booking.
- FORUM-002: Reddit Greece, 2026-06-02. General advice about effectiveness,
  NOT explicit hiring.
- FORUM-003: Reddit Greece, 2026-06-21. General discussion, NOT explicit hiring.
- FORUM-004: Reddit Greece, 2021-11-09. Old provider recommendation request;
  archived, NOT current.
- FORUM-005: Reddit Greece, 2026-07-12. Describes infestation but notes a
  professional service is already arranged: NOT an unfilled request.
Do not infer active prospective customers, collect usernames, or contact anyone.

## Provider access & costs
On 2026-11-16 the three connected Firecrawl accounts reported **0 credits**.
No Firecrawl searches were run. Public web search discovered sources and TinyFish
read some accessible pages. Some original tender pages responded bot_blocked:
we did not attempt to bypass the restriction. **No platform-wide capture rate,
provider average latency, or qualified-lead production rate can be estimated
from this sample**. TinyFish real reads in this research chat are NOT the
same as integrated app-side source collection.

## What this feature safely deploys
\`GET /api/bioshield/pilot/evidence\` returns a clearly labelled immutable
snapshot of real public procurement listings and anonymized summaries of
public posts. It does not access external systems or expose contact fields.
The source evidence is editable in GitHub, requires CI and an intentional
Render deployment, and should be kept separate from the synthetic lab.

**Before the external company's Supabase is connected:** Establish a reviewed
allowed-source inventory and consent/legal basis for data processing, verify
privileged server authentication, support GDPR objections and retention, and
test a bounded live provider adapter with itemized verified costs.
