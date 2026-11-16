# BIO-23 / DST-286 — Automatic official discovery on app entry

**Source of truth:** canonical BioShield repository; public preview currently has **no login/auth handler**.
**Scope:** official TED public procurement; no private/customer contacts, no active Google Alerts feed, no business or individual lead crawler.

## Actual behavior

1. On initial page entry, `renderBioShieldAdmin` calls `/api/bioshield/discovery/tenders`, `/focused` and `/segmented` concurrently with other read-only sources. The official TED collector is server-cached for up to 15 minutes. Nothing is scheduled from each individual browser and the verified separate GitHub Actions hourly workflow remains unchanged.
2. Only after the TED API returns `status=ok` and `notices` does `reconcileEntryDiscovery` compare IDs with the last **successful** visit recorded in browser localStorage. `TED-<official publication number>` must pass a strict public-notice ID format. IDs are deduplicated and bounded at 250; only metadata `{version,ids,checkedAt}` is saved. No contact names, session tokens, user identifiers, or private profiles are written.
3. First successful visit establishes a baseline. A later verified notice absent from the previous successful browser cursor counts as **newly observed by that browser**, not necessarily newly published today and not proof that a tender is still open.
4. The dashboard shows the check time, comparison mode and number of newly observed TED notices. Qualified nearby and distant official rows display a **ΝΕΟ** label. Labels remain during the current browser session even if heartbeat or map/region refresh rerenders UI.
5. Failed official-source checks do not write the cursor. Browser storage denial reports comparison unavailable rather than making up a new count. The existing explicit manual-force search keeps its rate limit.

## Explicit non-goals / future integration

- No customer **login event** exists today. This is triggered by **opening the public app page**, not by successful authentication. When admin auth is actually deployed, the caller and check must be scoped to the authenticated session and cursor stored per user with RLS and least privileges.
- Historical Supabase demo records from the isolated second account are not a live discovery feed; this feature makes no new Supabase writes.
- Google Alerts remains unconfigured unless an authorized feed is supplied. Non-TED public tenders/independent sources and individual/B2B request feeds require individual policy and technical authorization before automatic ingestion.
- A TED record is evidence of a published public notice, NOT evidence of an open tender, lawful direct outreach, or customer eligibility.

## Acceptance checks

- `node --test tests/test_entry_discovery.mjs`: baseline, delta/dedup, provider failure, refused storage, invalid prior cursor, bounded storage.
- `node --input-type=module --check < static/entry-discovery.js` and existing frontend/Python CI.
- Render: after merge, verify the public Overview and Discovery routes, no runtime errors, and unchanged private `/discover` HTTP 403.
- Report **actual CI, SHA and deployment status**; do not treat a PR as released before deployment is observed.

## Links

- [Linear BIO-23 / DST-286](https://linear.app/gkg/issue/DST-286/bio-23-automatic-new-data-check-on-application-entry-and-per-browser)
- [Live BioShield application](https://bioshield-admin-operations.onrender.com/admin/operations)
- [Scheduled official discovery](https://github.com/GeorgeGkogkos/BioShield-Admin-Operations-System/actions/workflows/discovery.yml)
