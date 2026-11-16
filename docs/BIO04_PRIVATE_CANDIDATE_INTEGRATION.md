# BIO-04 / BIO-15 — Private candidate model and deployment plan

**Status:** Complete DDL/RLS design only. SQL at `sql/BIO04_PRIVATE_SCHEMA_PROPOSAL.sql` has **NOT been executed** on the company's production Supabase or the separate Demo Supabase. This is deliberately not a live CRM.

## Isolation and source-of-truth requirements
- `bioshield_private` unexposed Postgres schema; never put candidate contact fields into public demo `public.bioshield_demo_evidence`.
- 7 tables: `discovery_runs`, `sources`, `candidates`, `evidence`, `reviews`, `suppression`, `activities`; IDs UUID, foreign-key provenance, original publication times, unique canonical URLs; exact original source URL required.
- Each candidate identifies requested service, actual audience (`individual`, `public_sector`, `business`, `needs_review`), separate request-kind and review state. Evidence always links to source and claim.
- No direct personal data fields, no phone or email columns, no synthetic leads. Contact eligibility constrained to `false` at DB layer pending a separately designed human/legal consent workflow.
- Intake logs `source_permission_record`, inspected timestamp, content hash and provider. Do not promote Reddit commercial ingestion before official approval.
- `suppression` stores HMAC-SHA256 digests only, not unhashed identifiers; HMAC key must remain server-side, not in public GitHub.

## Roles and RLS
- All 7 tables have RLS enabled. Anonymous roles have **no schema or table privileges**; `authenticated` can read only if trusted, server-managed JWT `app_metadata.bioshield_role` is `bioshield_admin` or `bioshield_reviewer`.
- Only `bioshield_admin` may create/update permitted records and `created_by` / `reviewer_id` / `actor_id` ties a new record to `auth.uid()`.
- No direct DELETE privilege; explicit reviewed retention and suppression lifecycle is a separate requirement.
- Never base authorization on user-editable `user_metadata`; `authenticated` alone is insufficient, and service-role keys MUST NEVER appear in public clients.
- If a member loses access, revoke sessions and/or refresh expired JWTs; JWT app metadata can become stale. This plan does not claim revocation is instantaneous.

## Exact deployment sequence (DO NOT skip)
1. Obtain business-owner approval, identify the **actual target BioShield project**, and read the active schema, all RLS policies, Auth staff/role contract, Data API exposed-schema settings, APK/EXE integration and current CRM source semantics.
2. Obtain authorization, legal/privacy review of source types, redaction, retention, marketing consent, and firm rules for automatic source-use. Determine whether live candidate data is even allowed in this instance.
3. Run DDL in a **separate empty test database** first, preferably via a versioned migration. Check no existing schema/table name conflicts, verify all foreign keys and constraints, inspect `auth.jwt()` role claims from actual configured auth. Do not run SQL on the company's production Supabase until approvals.
4. Test as `anon`, authenticated user with no BioShield role, reviewer, admin, and service actor (separate credentials). Assert zero anon reads/writes; reviewer read-only; admin scoped INSERT/UPDATE only; invalid source/outreach states fail; unconnected third-party projects remain untouched.
5. Run Supabase database security advisors and independent integration, RLS, data-retention and backup checks before any candidate data.
6. Add authenticated staff API routes server side, explicit membership/role check, rate limits and audit events, no service-role key in browsers. Implement idempotent source canonical URL and content SHA256 verification before candidate write.
7. Keep call-center handoff 403 until reviewed legal basis, suppression-check rules and explicit human approval; company must approve separately.

## Source discovery and acceptance
- TED official automated discovery already LIVE and yields public-government procurement data only. It does not constitute private-client data, consent or open tender eligibility.
- Reddit automated commercial collection remains blocked pending Reddit permission; no unlicensed scraping.
- The public demo read-only table and TED website can run even while private candidate workflows remain disabled.

## Design-only validation
- CI static contract tests check the proposal includes seven private RLS-enabled tables, named role constraints, zero anon grants, immutable no-contact flag, source canonicalization and no destructive operations.
- This is **not a database migration execution test**. The first real RLS integration test is a future required gate after exact project and auth workflow confirmation.

## Issue linkage
- BIO-04 / DST-268: the requested **design SQL migration and integration plan** is delivered here; actual company database implementation requires separate issue and authorization.
- BIO-01/DST-265: actual admin authentication pending.
- BIO-02/DST-266: private candidate review UI, backend and persistence pending.
- BIO-05/DST-269: lawful outreach and call-center handoff pending.

## Release
See PR #8 and Linear DST-268 for review, plus actual CI results. No Render redeploy is needed for this docs-only/unapplied design proposal.