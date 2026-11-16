-- BIO-04 design proposal: private, empty, role-gated candidate staging schema.
-- DO NOT EXECUTE in an existing company Supabase project without approval,
-- discovery of its schema, auth roles, retention rules, and security review.
-- Never expose bioshield_private in Supabase Data API settings by default.
-- No live customer data, seeded leads, demo requests, or outbound outreach.

begin;
create schema if not exists bioshield_private;
revoke all on schema bioshield_private from public, anon, authenticated;
grant usage on schema bioshield_private to authenticated;

create table if not exists bioshield_private.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('ted', 'approved_reddit', 'approved_firecrawl', 'approved_tinyfish', 'manual_source')),
  run_status text not null check (run_status in ('started', 'success', 'partial', 'failed', 'blocked')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  raw_count integer not null default 0 check (raw_count >= 0),
  unique_count integer not null default 0 check (unique_count >= 0),
  verified_count integer not null default 0 check (verified_count >= 0),
  error_class text,
  source_permission_record text,
  created_by uuid not null references auth.users(id),
  constraint valid_run_window check (finished_at is null or finished_at >= started_at)
);

create table if not exists bioshield_private.sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references bioshield_private.discovery_runs(id) on delete set null,
  canonical_source_url text not null unique,
  publisher text not null,
  provider text not null check (provider in ('ted', 'approved_reddit', 'approved_firecrawl', 'approved_tinyfish', 'manual_source')),
  original_published_at timestamptz,
  inspected_at timestamptz not null default now(),
  source_access text not null check (source_access in ('public_official', 'public_permitted', 'review_required')),
  publisher_reference text,
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  human_review_required boolean not null default true,
  created_by uuid not null references auth.users(id),
  constraint only_https_source check (canonical_source_url ~ '^https://[^ ]+$')
);

create table if not exists bioshield_private.candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references bioshield_private.sources(id) on delete restrict,
  audience_segment text not null check (audience_segment in ('individual', 'public_sector', 'business', 'needs_review')),
  service_code text not null check (service_code in ('pest_control', 'rodent_control', 'disinfection', 'plumbing', 'drain_unblocking', 'other_review')),
  geographic_area text,
  request_kind text not null check (request_kind in ('explicit_service_request', 'discussion_not_hiring', 'procurement_notice', 'advertisement_not_buyer', 'unclear')),
  case_state text not null default 'review_required'
    check (case_state in ('review_required', 'needs_more_evidence', 'verified_source_only', 'rejected', 'archived')),
  contact_eligible boolean not null default false check (contact_eligible = false),
  source_is_private boolean not null default false check (source_is_private = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  unique (source_id, service_code, audience_segment)
);

create table if not exists bioshield_private.evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references bioshield_private.candidates(id) on delete cascade,
  source_id uuid not null references bioshield_private.sources(id) on delete restrict,
  claim_type text not null check (claim_type in ('original_publication', 'buyer_identity', 'stated_service_need', 'public_tender_code', 'explicit_hiring_request', 'no_hiring_request', 'other')),
  redacted_fact text not null,
  original_document_section text,
  observed_at timestamptz not null default now(),
  verification_status text not null check (verification_status in ('verified_original', 'secondary_only', 'conflicted', 'unverified')),
  created_by uuid not null references auth.users(id)
);

create table if not exists bioshield_private.reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references bioshield_private.candidates(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  review_state text not null check (review_state in ('source_verified', 'source_conflicted', 'not_hiring', 'requires_further_review', 'rejected')),
  notes_redacted text,
  reviewed_at timestamptz not null default now(),
  legal_outreach_basis text check (legal_outreach_basis is null or legal_outreach_basis in ('not_assessed', 'requires_counsel_review')),
  constraint no_legal_preapproval check (legal_outreach_basis is null or legal_outreach_basis != 'approved')
);

create table if not exists bioshield_private.suppression (
  id uuid primary key default gen_random_uuid(),
  subject_hmac_sha256 text not null unique check (subject_hmac_sha256 ~ '^[a-f0-9]{64}$'),
  suppression_reason text not null check (suppression_reason in ('objection', 'no_contact', 'retention_expired', 'legal_hold')),
  effective_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  description_redacted text
);

create table if not exists bioshield_private.activities (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references bioshield_private.candidates(id) on delete set null,
  actor_id uuid not null references auth.users(id),
  event_type text not null check (event_type in ('source_discovered', 'source_checked', 'candidate_reviewed', 'candidate_rejected', 'candidate_archived', 'suppression_added')),
  event_at timestamptz not null default now(),
  metadata_redacted jsonb not null default '{}'::jsonb
);

-- RLS even for this unexposed schema: defense in depth.
alter table bioshield_private.discovery_runs enable row level security;
alter table bioshield_private.sources enable row level security;
alter table bioshield_private.candidates enable row level security;
alter table bioshield_private.evidence enable row level security;
alter table bioshield_private.reviews enable row level security;
alter table bioshield_private.suppression enable row level security;
alter table bioshield_private.activities enable row level security;

revoke all on all tables in schema bioshield_private from public, anon, authenticated;

-- JWT app_metadata MUST be assigned on the trusted admin server, never by user_metadata.
-- Refresh/revoke JWTs when revoking staff access; "authenticated" alone is not access control.
-- These are proposed cross-project-scoped reviewer/admin policies for approved admin auth.
grant select on all tables in schema bioshield_private to authenticated;
grant insert, update on bioshield_private.discovery_runs,
  bioshield_private.sources, bioshield_private.candidates,
  bioshield_private.evidence, bioshield_private.reviews,
  bioshield_private.suppression, bioshield_private.activities to authenticated;

create policy bioshield_staff_read_runs on bioshield_private.discovery_runs
 for select to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' in ('bioshield_admin', 'bioshield_reviewer')
 );
create policy bioshield_admin_insert_runs on bioshield_private.discovery_runs
 for insert to authenticated with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and created_by = (select auth.uid())
 );
create policy bioshield_admin_update_runs on bioshield_private.discovery_runs
 for update to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
 ) with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
 );

create policy bioshield_staff_read_sources on bioshield_private.sources
 for select to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' in ('bioshield_admin', 'bioshield_reviewer')
 );
create policy bioshield_admin_insert_sources on bioshield_private.sources
 for insert to authenticated with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and created_by = (select auth.uid())
 );
create policy bioshield_admin_update_sources on bioshield_private.sources
 for update to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
 ) with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
 );

create policy bioshield_staff_read_candidates on bioshield_private.candidates
 for select to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' in ('bioshield_admin', 'bioshield_reviewer')
 );
create policy bioshield_admin_insert_candidates on bioshield_private.candidates
 for insert to authenticated with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and created_by = (select auth.uid())
   and contact_eligible = false
 );
create policy bioshield_admin_update_candidates on bioshield_private.candidates
 for update to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
 ) with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and contact_eligible = false
 );

create policy bioshield_staff_read_evidence on bioshield_private.evidence
 for select to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' in ('bioshield_admin', 'bioshield_reviewer')
 );
create policy bioshield_admin_insert_evidence on bioshield_private.evidence
 for insert to authenticated with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and created_by = (select auth.uid())
 );
create policy bioshield_admin_update_evidence on bioshield_private.evidence
 for update to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
 ) with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
 );

create policy bioshield_staff_read_reviews on bioshield_private.reviews
 for select to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' in ('bioshield_admin', 'bioshield_reviewer')
 );
create policy bioshield_admin_insert_reviews on bioshield_private.reviews
 for insert to authenticated with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and reviewer_id = (select auth.uid())
 );

create policy bioshield_staff_read_suppression on bioshield_private.suppression
 for select to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' in ('bioshield_admin', 'bioshield_reviewer')
 );
create policy bioshield_admin_insert_suppression on bioshield_private.suppression
 for insert to authenticated with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and created_by = (select auth.uid())
 );

create policy bioshield_staff_read_activities on bioshield_private.activities
 for select to authenticated using (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' in ('bioshield_admin', 'bioshield_reviewer')
 );
create policy bioshield_admin_insert_activities on bioshield_private.activities
 for insert to authenticated with check (
   auth.jwt() -> 'app_metadata' ->> 'bioshield_role' = 'bioshield_admin'
   and actor_id = (select auth.uid())
 );

-- No DELETE grants and no public access: retention/deletion require reviewed
-- administrative procedure; suppressions must never be silently erased.
commit;
