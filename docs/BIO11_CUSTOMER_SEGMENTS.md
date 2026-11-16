# BIO-11 — Three independent customer types (pre-Supabase)

The application distinguishes **who needs the service** from **what service**,
**whether a request is currently active**, **how reliable the source is**, and
**whether commercial contact would be permitted**. None of these questions may
be answered by the others automatically.

## Category semantics

| Code | Ελληνικά | Definition | Examples | Common false positives |
| --- | --- | --- | --- | --- |
| `individual` | Ιδιώτες | Residential/private requester or public discussion from a person with personal context | flat/home infestation and request for a professional | an educational discussion, a stale post, an already-completed booking |
| `public_sector` | Έργα Δημοσίου | A named public buyer with a procurement/tender source | municipalities, public health organizations, school tenders | private companies mentioning public tenders, suppliers responding to a bid |
| `business` | Επιχειρήσεις | A private organization **requesting** the relevant service | restaurant requesting pest control for its kitchen, hotel seeking quote | pest-control company **advertising** services |
| `null` / `needs_review` | Αδιευκρίνιστα | The buyer cannot be safely determined from current source evidence | generic post lacking business/residential context, unopened forum thread | guessing a business from the word "κατάστημα" alone |

The displayed three categories are **mutually exclusive**. `needs_review` is
a safety state, not a fourth market segment. No category grants permission
to contact anyone. Human verification and privacy/legal review remain required.

## Real static snapshot (16 November 2026)

The stored, non-contactable public-research sample includes **12 records**:
- `public_sector`: **7** institutional notices.
- `individual`: **4** personal-context public forum posts whose original
  pages were opened. These are not verified active clients.
- `business`: **0** independently evidenced company requests in this sample.
- `needs_review`: **1** community record with an unopened original source.
  Do **not** force it into a verified private-client segment.

Business classification is implemented and regression-tested with **fictional**
business-buyer cases, but **no fictional business lead is entered in the real
public-evidence API**.

## Classifier contract (implemented)

`bioshield/audience.py::classify_audience` takes text, a limited source type
and optionally an **explicitly reviewed** buyer role. It returns
`{segment, reason, needs_review, contact_eligible=False}`.

- Procurement must include a specifically named issuing institution; the
  original document may still be unavailable or a direct invitation.
  Institution naming is not proof of current bid eligibility.
- Business text must clearly express the *buyer's* context, for example
  `στο κατάστημά μας` or `για την εταιρεία μας`, unless a reviewed buyer
  role is already given. A seller advertisement is not a buyer.
- Residential private context must be explicit or human-reviewed.
- Conflicting cues return `segment=None`; generic service questions do too.
- Intent classification (`bioshield/engine.py`) and audience classification
  are independent. Neither can approve outreach.
- A public forum post is not consent for cold calls or direct sales messages.

## UI and API

The **Πραγματικά ευρήματα** tab shows three distinct audience cards and
category filters: **Ιδιώτες**, **Έργα Δημοσίου**, **Επιχειρήσεις**;
**Αδιευκρίνιστα** is an additional review filter. The independent public
API `GET /api/bioshield/pilot/evidence` returns per-record
`audience_segment`, `audience_reason`, `audience_needs_review` and
`contact_eligible=False`; the top-level `segment_counts` are computed
from the underlying real sample, not manually invented. `business_requests`
is an empty array when there is no evidence. Old count fields remain
backward compatible.

No external Supabase, provider automation or call-center handoff is enabled.
The dashboard itself remains a public setup/research preview and must not
expose private leads or contacts.

## Future Supabase contract (proposal only; not applied)

After authorized inspection of the external company database, plan
`customer_segment` (one of the three values or NULL),
`buyer_evidence_level`, `source_type`, `demand_status`,
`source_url`, `published_at`, `observed_at`,
`deadline_at` (only procurement), `legal_basis_review`,
`marketing_suppression`, `human_review_status` and an
immutable claim-to-source provenance record. Do not make any migration
until existing tables, APK and EXE contracts are inspected and approved.

## Evidence and tests

`tests/test_audience.py` covers buyer-group distinctions, mixed/ambiguous
contexts, unsupported source types, fixed public-source counts and fail-closed
contact routes. CI also checks browser JavaScript syntax and existing
synthetic performance benchmarks.

The original source ledger remains at
[docs/BIO10_REAL_SOURCE_PILOT.md](BIO10_REAL_SOURCE_PILOT.md).
