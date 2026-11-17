"""Read-only REDACTED public preview of independently verified BioShield requests.

The server never fetches private lead records. It reads an intentionally minimal
projection in the *second* Supabase sandbox with an existing publishable key.
No usernames, contact details, post text, exact address or source URLs are exposed.
"""
import json
import os
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from bioshield.demo_db import EXPECTED_URL


TABLE = "bioshield_verified_request_preview"
COLUMNS = "requester_type,service_category,broad_area,original_posted_on,fulfillment_status"
MAX_ROWS = 100
MAX_RESPONSE_BYTES = 64_000
TYPES = frozenset(("individual", "business", "public_sector"))
SERVICES = frozenset(("disinfection", "pest_control", "drain_unblocking"))
AREAS = frozenset((
    "Ίλιον", "Περιστέρι", "Αθήνα", "Χαλκίδα", "Κορινθία",
    "Μη δημοσιοποιημένη περιοχή",
))
STATUSES = frozenset(("unknown", "publicly_open", "publicly_fulfilled", "publicly_withdrawn"))


class PreviewUnavailable(RuntimeError):
    """No silent substitution of cached or fabricated findings."""


def preview_from_rows(rows: list, today: date | None = None) -> dict:
    today = today or datetime.now(ZoneInfo("Europe/Athens")).date()
    if not isinstance(rows, list) or len(rows) > MAX_ROWS:
        raise PreviewUnavailable("Unexpected preview result size")
    output = []
    for row in rows:
        if not isinstance(row, dict) or any(
            row.get(field) not in allowed for field, allowed in (
                ("requester_type", TYPES),
                ("service_category", SERVICES),
                ("broad_area", AREAS),
                ("fulfillment_status", STATUSES),
            )
        ):
            raise PreviewUnavailable("Invalid public projection fields")
        try:
            published = date.fromisoformat(row["original_posted_on"])
        except (KeyError, ValueError, TypeError) as exc:
            raise PreviewUnavailable("Invalid primary publication date") from exc
        if not 0 <= (today - published).days <= 14:
            raise PreviewUnavailable("Out-of-window result is not current")
        # Construct strict allowlist, never return raw source values or URLs.
        output.append({
            "requester_type": row["requester_type"],
            "service_category": row["service_category"],
            "broad_area": row["broad_area"],
            "original_posted_on": published.isoformat(),
            "fulfillment_status": row["fulfillment_status"],
            "contact_eligible": False,
        })
    return {
        "status": "ok",
        "source": "second_account_supabase_redacted_verified_requests",
        "count": len(output),
        "requests": output,
        "contactable_leads": 0,
        "primary_post_max_age_days": 14,
        "public_fields_only": True,
        "note": "Επαληθευμένες δημόσιες αναζητήσεις, όχι επιβεβαιωμένες διαθέσιμες αναθέσεις.",
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
    }


def fetch_verified_public_preview() -> dict:
    base_url = os.environ.get("BIOSHIELD_DEMO_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("BIOSHIELD_DEMO_SUPABASE_PUBLISHABLE_KEY", "")
    if base_url != EXPECTED_URL or not key.startswith("sb_publishable_"):
        raise PreviewUnavailable("Independent public preview is not configured")
    cutoff = datetime.now(ZoneInfo("Europe/Athens")).date() - timedelta(days=14)
    query = urlencode({
        "select": COLUMNS,
        "original_posted_on": f"gte.{cutoff.isoformat()}",
        "order": "original_posted_on.desc",
        "limit": MAX_ROWS + 1,
    })
    request = Request(
        f"{base_url}/rest/v1/{TABLE}?{query}",
        headers={"apikey": key, "Accept": "application/json"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = response.read(MAX_RESPONSE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise PreviewUnavailable("Independent public preview request failed") from exc
    if len(payload) > MAX_RESPONSE_BYTES:
        raise PreviewUnavailable("Preview response too large")
    try:
        rows = json.loads(payload.decode("utf-8"))
    except (UnicodeError, ValueError) as exc:
        raise PreviewUnavailable("Invalid preview payload") from exc
    return preview_from_rows(rows)
