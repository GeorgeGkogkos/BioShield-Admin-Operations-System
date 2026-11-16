"""Read-only PostgreSQL Data API adapter for the *separate* BioShield demo project.

Public source metadata only. Never access the company's external/production
Supabase, never use service-role keys, and never scrape, store or expose contacts.
The publishable key remains in the Render environment, never Git.
"""
import json
import os
import re
from datetime import date, datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


EXPECTED_REF = "lbavrwknupfhdyelevto"
EXPECTED_URL = f"https://{EXPECTED_REF}.supabase.co"
TABLE = "bioshield_demo_evidence"
MAX_ROWS = 500
MAX_RESPONSE_BYTES = 512_000
COLUMNS = (
    "evidence_id,audience_segment,source_kind,issuer_or_forum,region,service,"
    "summary,source_url,additional_url,document_ref,published_on,observed_on,"
    "deadline_at,deadline_day,budget_eur_ex_vat,evidence_level,evidence_note,"
    "case_status,original_opened,source_is_real,demo_only,contact_eligible,updated_at"
)
SEGMENTS = {"individual", "public_sector", "business"}
KINDS = {"public_procurement", "community_discussion", "business_request"}
EMAIL = re.compile(r"(?i)[\w.%+-]+@[\w.-]+\.[a-z]{2,}")
PHONE = re.compile(r"(?<!\d)(?:\+?30[\s-]?)?(?:\d[\s-]?){10,}(?!\d)")


class DemoDatabaseUnavailable(RuntimeError):
    """Safe error without internal credentials or raw source data."""


def fetch_public_demo() -> dict:
    base_url = os.environ.get("BIOSHIELD_DEMO_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("BIOSHIELD_DEMO_SUPABASE_PUBLISHABLE_KEY", "")
    if base_url != EXPECTED_URL or not key or not key.startswith("sb_publishable_"):
        raise DemoDatabaseUnavailable("Demo Supabase is not configured")
    query = urlencode({"select": COLUMNS, "order": "evidence_id.asc", "limit": MAX_ROWS + 1})
    request = Request(
        f"{base_url}/rest/v1/{TABLE}?{query}",
        headers={"apikey": key, "Accept": "application/json"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=9) as response:
            payload = response.read(MAX_RESPONSE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise DemoDatabaseUnavailable("Demo Supabase request failed") from exc
    if len(payload) > MAX_RESPONSE_BYTES:
        raise DemoDatabaseUnavailable("Demo response exceeded safety cap")
    try:
        rows = json.loads(payload.decode("utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise DemoDatabaseUnavailable("Demo returned an invalid response") from exc
    if not isinstance(rows, list) or len(rows) > MAX_ROWS:
        raise DemoDatabaseUnavailable("Demo record count exceeded safety cap")
    return report_from_rows(rows)


def report_from_rows(rows: list[dict]) -> dict:
    seen: set[str] = set()
    tenders = []
    community_cases = []
    business_requests = []
    today_utc = datetime.now(timezone.utc).date()
    recent_window_days = 14
    for rec in rows:
        if not isinstance(rec, dict):
            raise DemoDatabaseUnavailable("Unexpected demo row")
        ident = rec.get("evidence_id")
        segment = rec.get("audience_segment")
        kind = rec.get("source_kind")
        if not isinstance(ident, str) or ident in seen or not re.fullmatch(
            r"(?:ORG|FORUM|BIZ)-\d{3,}", ident
        ):
            raise DemoDatabaseUnavailable("Invalid duplicate evidence identity")
        seen.add(ident)
        if segment not in SEGMENTS and segment is not None:
            raise DemoDatabaseUnavailable("Unexpected buyer type")
        if kind not in KINDS or rec.get("demo_only") is not True or rec.get(
            "source_is_real"
        ) is not True or rec.get("contact_eligible") is not False:
            raise DemoDatabaseUnavailable("Demo safety gate failed")
        if (
            (kind == "public_procurement" and segment != "public_sector")
            or (kind == "business_request" and segment != "business")
            or (kind == "community_discussion" and segment not in ("individual", None))
        ):
            raise DemoDatabaseUnavailable("Inconsistent audience classification")
        fields_to_validate = (
            "issuer_or_forum", "region", "service", "summary", "evidence_note",
        )
        if any(
            (EMAIL.search(str(rec.get(name) or "")) or PHONE.search(str(rec.get(name) or "")))
            for name in fields_to_validate
        ):
            raise DemoDatabaseUnavailable("Demo contains unsafe contact-like data")
        url = rec.get("source_url")
        if not isinstance(url, str) or not url.startswith("https://"):
            raise DemoDatabaseUnavailable("Invalid public source URL")
        optional_url = rec.get("additional_url")
        if optional_url is not None and (
            not isinstance(optional_url, str) or not optional_url.startswith("https://")
        ):
            raise DemoDatabaseUnavailable("Invalid second source URL")

        if kind == "public_procurement":
            tenders.append({
                "id": ident,
                "authority": rec["issuer_or_forum"],
                "region": rec.get("region"),
                "service": rec["service"],
                "summary": rec["summary"],
                "budget_eur_ex_vat": rec.get("budget_eur_ex_vat"),
                "deadline": rec.get("deadline_at"),
                "deadline_day_reported": rec.get("deadline_day"),
                "published_on": rec.get("published_on"),
                "notice_id": rec.get("document_ref"),
                "evidence_level": rec["evidence_level"],
                "evidence_note": rec.get("evidence_note") or "",
                "source_url": url,
                "additional_url": optional_url,
                "audience_segment": segment,
                "contact_eligible": False,
            })
        elif kind == "community_discussion":
            try:
                published = date.fromisoformat(rec.get("published_on") or "")
            except (TypeError, ValueError) as exc:
                raise DemoDatabaseUnavailable("Reddit post publication date unverified") from exc
            age_days = (today_utc - published).days
            if age_days < 0:
                raise DemoDatabaseUnavailable("Future-dated Reddit source cannot be verified")
            is_recent = age_days <= recent_window_days and rec.get("original_opened") is True
            community_cases.append({
                "id": ident,
                "publisher": rec["issuer_or_forum"],
                "posted_on": rec.get("published_on"),
                "service": rec["service"],
                "summary": rec["summary"],
                "gate": rec.get("case_status"),
                "source_url": url,
                "source_opened": rec.get("original_opened") is True,
                "post_age_days": age_days,
                "within_7d": bool(is_recent and age_days <= 7),
                "within_14d": bool(is_recent),
                "audience_segment": segment,
                "contact_eligible": False,
            })
        else:
            business_requests.append({
                "id": ident, "authority": rec["issuer_or_forum"],
                "region": rec.get("region"), "service": rec["service"],
                "summary": rec["summary"], "source_url": url,
                "published_on": rec.get("published_on"),
                "audience_segment": "business",
                "contact_eligible": False,
            })

    # Public discussions are always sorted by the ORIGINAL post date, never
    # by the date of the latest comment or when the item was observed.
    community_cases.sort(key=lambda item: (item["posted_on"], item["id"]), reverse=True)
    reddit_recent_count = sum(item["within_14d"] for item in community_cases)
    counts = {
        segment: sum(rec.get("audience_segment") == segment for rec in rows)
        for segment in ("individual", "public_sector", "business")
    }
    counts["needs_review"] = sum(rec.get("audience_segment") is None for rec in rows)
    observed = [str(row["observed_on"]) for row in rows if row.get("observed_on")]
    return {
        "version": "bio13_recent_reddit_demo_v1",
        "data_source": "second_account_supabase_demo",
        "demo_supabase_connected": True,
        "external_supabase_connected": False,
        "live_source_collection_enabled": False,
        "synthetic": False,
        "real_public_sources": True,
        "collection_mode": "manual_public_research_saved_in_demo_database",
        "coverage": "non_exhaustive; historical research records, not a live crawler",
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "as_of_date": max(observed) if observed else None,
        "public_sources_reviewed": len(rows),
        "segment_counts": counts,
        "public_procurement_notices": len(tenders),
        "public_discussions_reviewed": len(community_cases),
        "reddit_freshness": {
            "window_days": recent_window_days,
            "recent_posts_14d": reddit_recent_count,
            "recent_posts_7d": sum(x["within_7d"] for x in community_cases),
            "historical_or_unopened": len(community_cases) - reddit_recent_count,
            "recent_confirmed_service_requests": 0,
            "basis": "original_post_publication_date_not_comment_or_crawl_date",
        },
        "business_requests_count": len(business_requests),
        "historical_explicit_requests": sum(
            x.get("gate") in ("historical_not_confirmed_active", "stale_archived")
            for x in community_cases
        ),
        "confirmed_contactable_private_leads": 0,
        "contact_eligible": 0,
        "tenders": tenders,
        "community_cases": community_cases,
        "business_requests": business_requests,
        "database_ref": EXPECTED_REF,
        "read_only": True,
    }
