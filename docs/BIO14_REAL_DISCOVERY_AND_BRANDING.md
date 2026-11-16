# BIO-14 — Real-only BioShield discovery & official company branding

## Implementation
- The originally uploaded BioShield company emblem is rendered in the top nav and favicon from `static/bioshield-company-logo.png` (64×64 reduced asset, no recreation).
- All user-visible synthetic request sets, fake source adapters, performance-lab routes and fixture modules have been removed. The old `/api/bioshield/lab/cases`, `/api/bioshield/lab/report`, and `/api/bioshield/pilot/evidence` return 404.
- Kept existing real/public-source demo in the second account Supabase (read-only, RLS), with classification to individual, public_sector, business and needs_review.
- Added live official TED public-procurement adapter (`bioshield/ted_discovery.py`). Search is Greece-only, original publication ≤30 days, codes 90921000/90922000/90923000/90924000, limit 35 records, strict title/buyer/country/CPV/date validation. Provider errors return explicit unavailable status with zero fabricated data, with no unsafe URL fetching.
- Discovery GET `/api/bioshield/discovery/tenders` queries the actual TED API on initial dashboard opening, caches for up to 15 minutes, refreshes from dashboard after 15 minutes while open and manually.
- GitHub Actions `.github/workflows/discovery.yml` performs an unattended official TED scan every six hours and on appropriate main pushes; `scripts/sync_ted.py` writes `data/ted-current.json` only after successful original API validation (no customer contacts or secret tokens). Live web API and this durable archival GitHub snapshot are distinct.
- Public provider status `/api/bioshield/discovery/providers` declares Reddit approval needed; code does **not** call Reddit automatically.

## Critical licensing boundary
Official Reddit documentation currently states that commercial Reddit data/API use requires prior written permission, and RSS feeds ended 2026-11-13. Thus Reddit crawler remains DISABLED until proper permission and official token/plan. See:
- https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data
- https://support.reddithelp.com/hc/en-us/articles/54353370049684-Changelog-October-8-2026
- https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy

## Official alternative
European Union TED Search API explicitly permits public notice reuse without authentication and by commercial vendors. API: `POST https://api.ted.europa.eu/v3/notices/search`. CPV reference: official TED CPV list. Source: https://docs.ted.europa.eu/api/latest/search.html
TED only covers its published EU procurement notices, NOT the entire Greece municipal procurement register. Every returned notice still needs a human to check bid status, exact tender conditions, eligibility and whether still available.

## Security and limitations
- No usernames/emails/phones, outreach, automatic marketing or public-source profiling. No private-company production Supabase connection.
- All real lead candidates and contact handoff POST/GET remain forbidden (HTTP 403) pending admin auth, human review and legal compliance.
- Supabase demo publicly readable metadata are not a production CRM.
- GitHub Actions regular runs depend on GitHub scheduler and the official TED API being available; no claim that a scheduled workflow *completed* until a real run has been verified.
- Original user-uploaded logo was downsampled for navigation/favicons, preserving the company emblem.

## Evidence checklist
- [ ] Main branch CI and Python tests pass.
- [ ] Actual GitHub scheduled-discovery workflow run; store run ID/result and nonpersonal dataset.
- [ ] Render release LIVE exact commit and deploy ID.
- [ ] Direct GET to deployed TED source API and evidence status (not fake sample).
- [ ] Browser test actual branding, no synthetic UI, provider status, API and filters.
- [ ] Linear BIO-14 plus BIO-01/02/03/04/05/06/10 statuses updated accurately.