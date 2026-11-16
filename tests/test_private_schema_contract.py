"""Reviewable static checks for UNAPPLIED BIO-04 private Supabase schema proposal.

Not a replacement for real Postgres RLS integration tests against a separately
approved instance. No database or external services accessed by this test.
"""
from pathlib import Path
import re


SQL = Path(__file__).resolve().parents[1].joinpath(
    "sql/BIO04_PRIVATE_SCHEMA_PROPOSAL.sql"
).read_text(encoding="utf-8").lower()

TABLES = (
    "discovery_runs", "sources", "candidates",
    "evidence", "reviews", "suppression", "activities",
)


def test_seven_private_tables_enable_rls():
    for name in TABLES:
        assert f"create table if not exists bioshield_private.{name}" in SQL
        assert f"alter table bioshield_private.{name} enable row level security;" in SQL
        assert f"create policy bioshield_staff_read_{name}" in SQL


def test_no_anon_grants_or_outreach_promotion():
    assert "revoke all on schema bioshield_private from public, anon, authenticated" in SQL
    assert "revoke all on all tables in schema bioshield_private from public, anon, authenticated" in SQL
    assert re.search(r"grant\s+\w+[^;]*\bto\s+anon\b", SQL) is None
    assert "contact_eligible = false" in SQL
    assert "contact_eligible boolean not null default false" in SQL
    assert "no_legal_preapproval" in SQL
    assert "security definer" not in SQL
    assert "grant delete" not in SQL


def test_staff_roles_are_namespaced_and_not_editable_user_metadata():
    assert "'bioshield_admin'" in SQL
    assert "'bioshield_reviewer'" in SQL
    assert "auth.jwt() -> 'app_metadata'" in SQL
    assert "and created_by = (select auth.uid())" in SQL
    assert "user_metadata" not in SQL
    assert "user-editable" not in SQL


def test_canonical_source_and_audit_without_contact_columns():
    assert "canonical_source_url text not null unique" in SQL
    assert "source_access text not null" in SQL
    assert "original_published_at" in SQL
    assert "content_sha256" in SQL
    assert "subject_hmac_sha256" in SQL
    assert "metadata_redacted" in SQL
    assert "contact_eligible boolean not null default false" in SQL
    for prohibited in ("phone_number text", "email_address text", "reddit_username text"):
        assert prohibited not in SQL
