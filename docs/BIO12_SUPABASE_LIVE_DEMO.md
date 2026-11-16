# BIO-12 — Isolated live Supabase demo

## Project
- User-authorized second connected Supabase account, organization lgapybiraacvxjgwoctx.
- **BioShield — Live Demo Sandbox**, project ref **lbavrwknupfhdyelevto**.
- Region: eu-central-1 (Frankfurt); Free plan with quoted project cost **0 per month**.
- Dashboard: https://supabase.com/dashboard/project/lbavrwknupfhdyelevto
- The existing VELAUNE INFRA-11 project in that account was not modified.
- The business-owned external BioShield production Supabase remains **disconnected**.

## Seeded real-source demo data
Table: **public.bioshield_demo_evidence**. Seeded on November 16, 2026
with 12 nonpersonal, public-source evidence summaries:
- **7** public-sector tenders, public eligibility/status still unverified.
- **4** historic individual-context public discussion posts, none a
  verified currently contactable individual.
- **1** source with insufficient buyer evidence; review required.
- **0** independently corroborated business requests.

All rows are marked real-public-source, demo-only and noncontactable.
No usernames, phone numbers, private addresses or email addresses have
been stored. Original source URLs and evidence levels remain attached.
This is **not** a live discovery/crawler feed: the public-source research
was performed previously, and the separate database is now queried live.

## Security
- A dedicated constrained demo table, with RLS enabled.
- Read-only SELECT for anonymous and authenticated Supabase roles.
- No anonymous INSERT, UPDATE or DELETE privileges.
- RLS SELECT policy requires demo_only=true and contact_eligible=false.
- CHECK constraints prevent contact eligibility, non-demo records and
  certain inconsistent buyer-segment/source-type combinations.
- The Render application uses an environment-supplied **publishable**
  Supabase key, not a service-role key or database password. Its project
  hostname is allowlisted in application code. No key is committed to GitHub.
- The app validates every returned row for incorrect classifications,
  contact-like data and unsafe source URLs; it responds 503 on failure
  rather than exposing bad data.
- All production candidates/discover/handoff endpoints remain HTTP 403.
- The main BioShield admin UI remains a *public research/setup preview*;
  authentication and access-control must precede any private CRM data.

## Live read and refresh
- Backend route: GET /api/bioshield/demo/evidence
- An actual HTTP GET to the second account's Supabase REST Data API is
  executed on each call with explicit column selection and a bounded limit.
- The dashboard's **Πραγματικά ευρήματα** tab shows the three buyer
  categories and the historical-source cutoff separately from the
  most recent fetch timestamp (Greece time).
- Users can click **Ανανέωση τώρα**. An automatic 30-second refresh runs
  only while that tab is visible and the browser is foregrounded.
- On a connection failure, the UI displays an explicit error, **not**
  outdated static source numbers misrepresented as live.
- Adding another properly documented, nonpersonal business request in
  the second account's Supabase Table Editor will show it at the next
  refresh without a new GitHub commit.
- The synthetic performance lab is independent and unchanged.

## Validation
Verify SQL counts, read-only role grants, active RLS and security advisors
in the second Supabase project. Verify GitHub CI, Render LIVE deploy and
a real-browser UI refresh/filter smoke test after release.
Track implementation under BIO-12 / DST-276 in Linear, with actual
GitHub PR, Render deployment and runtime status links.

No paid resources or production database changes were introduced.
