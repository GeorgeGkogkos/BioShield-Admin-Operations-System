"""Real public procurement discovery using the official, open TED API.

No simulated leads, no Reddit scraping, no personal contacts and no CRM writes.
TED publishes EU notices; it does NOT cover all Greek municipal purchases.
"""
import json
import re
import time
from datetime import date, datetime, timedelta, timezone
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ENDPOINT = "https://api.ted.europa.eu/v3/notices/search"
CPVS = frozenset({"90921000", "90922000", "90923000", "90924000"})
FIELDS = [
    "publication-number", "notice-title", "buyer-name", "buyer-country",
    "publication-date", "classification-cpv",
    "deadline-receipt-tender-date-lot",
]
MAX_NOTICES = 35
MAX_BODY_BYTES = 900_000
CACHE_SECONDS = 900
_lock = Lock()
_cache = {"until": 0.0, "value": None}


def _flat(value):
    """Return an untrusted official-field value as a string, never a contact field."""
    if value is None:
        return ""
    if isinstance(value, dict):
        for key in ("ell", "eng", "el", "en"):
            if key in value:
                v = _flat(value[key])
                if v:
                    return v
        return next((v for v in (_flat(v) for v in value.values()) if v), "")
    if isinstance(value, list):
        return next((v for v in (_flat(v) for v in value) if v), "")
    return str(value).strip()[:320] if isinstance(value, (str, int, float)) else ""


def _all_strings(value):
    if isinstance(value, dict):
        for v in value.values():
            yield from _all_strings(v)
    elif isinstance(value, list):
        for v in value:
            yield from _all_strings(v)
    elif isinstance(value, (str, int, float)):
        yield str(value)


def _date(value):
    txt = _flat(value)[:10]
    try:
        return date.strptime(txt, "%Y-%m-%d")  # unused fallback on some Python versions
    except AttributeError:
        pass
    except (ValueError, TypeError):
        pass
    try:
        return date.fromisoformat(txt) if "-" in txt else datetime.strptime(txt[:8], "%Y%m%d").date()
    except (ValueError, TypeError):
        return None


def extract_notices(payload, *, today=None):
    """Validate official TED metadata strictly; never infer buyer interest or eligibility."""
    today = today or datetime.now(timezone.utc).date()
    entries = payload.get("notices") if isinstance(payload, dict) else None
    if not isinstance(entries, list) or len(entries) > MAX_NOTICES:
        raise ValueError("Unexpected TED search response")
    seen = set()
    records = []
    for item in entries:
        if not isinstance(item, dict):
            continue
        ident = _flat(item.get("publication-number"))
        if not re.fullmatch(r"\d{5,7}-20\d\d", ident) or ident in seen:
            continue
        published = _date(item.get("publication-date"))
        if published is None or (today - published).days not in range(0, 32):
            continue
        country = _flat(item.get("buyer-country")).upper()
        if country not in ("GRC", "GR", "GREECE", "ΕΛΛΑΔΑ"):
            continue
        cpv = {code for v in _all_strings(item.get("classification-cpv"))
               for code in re.findall(r"\b909\d{5}\b", v)}
        matching = sorted(CPVS & cpv)
        if not matching:
            continue
        title = _flat(item.get("notice-title"))
        buyer = _flat(item.get("buyer-name"))
        if not title or not buyer:
            continue
        seen.add(ident)
        records.append({
            "id": "TED-" + ident,
            "notice_number": ident,
            "published_on": published.isoformat(),
            "buyer": buyer,
            "title": title,
            "country": "Ελλάδα",
            "cpv_codes": matching,
            "audience_segment": "public_sector",
            "source_url": f"https://ted.europa.eu/en/notice/-/detail/{ident}",
            "evidence_level": "official_ted_metadata",
            "qualification": "official_notice_review_required",
            "contact_eligible": False,
            "current_eligibility_verified": False,
        })
    return sorted(records, key=lambda row: (row["published_on"], row["id"]), reverse=True)


def _request_body(today):
    return {
        "query": (
            "buyer-country=GRC AND classification-cpv IN "
            "(90921000 90922000 90923000 90924000) "
            f"AND publication-date>={(today - timedelta(days=30)).strftime('%Y%m%d')} "
            "SORT BY publication-date DESC"
        ),
        "fields": FIELDS,
        "limit": MAX_NOTICES,
        "page": 1,
        "scope": "ALL",
        "paginationMode": "PAGE_NUMBER",
    }


def request_official_ted(*, timeout=12):
    today = datetime.now(timezone.utc).date()
    body = _request_body(today)
    req = Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "User-Agent": "BioShield-public-procurement-research/1.0",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urlopen(req, timeout=timeout) as reply:
        data = reply.read(MAX_BODY_BYTES + 1)
        if len(data) > MAX_BODY_BYTES:
            raise ValueError("TED response too large")
    payload = json.loads(data)
    rows = extract_notices(payload, today=today)
    return {
        "version": "bio14_ted_live_v1",
        "provider": "EU TED official search API",
        "provider_url": "https://docs.ted.europa.eu/api/latest/search.html",
        "status": "ok",
        "source_type": "official_public_procurement",
        "query": body["query"],
        "searched_at_utc": datetime.now(timezone.utc).isoformat(),
        "freshness_days": 30,
        "raw_count": len(payload["notices"]),
        "review_required": True,
        "confirmed_contactable_private_leads": 0,
        "source_is_live": True,
        "notices": rows,
        "count": len(rows),
        "notes": (
            "Official TED publication metadata only. No claim of tender eligibility, "
            "open bidding status, private customer demand or comprehensive Greek coverage."
        ),
    }


def live_ted_report(*, force=False):
    now = time.monotonic()
    with _lock:
        if not force and _cache["value"] is not None and now < _cache["until"]:
            return dict(_cache["value"], cached=True)
        try:
            out = request_official_ted()
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            # Never substitute fake or stale source records as "live" discoveries.
            out = {
                "version": "bio14_ted_live_v1",
                "provider": "EU TED official search API",
                "status": "unavailable",
                "source_is_live": False,
                "notices": [],
                "count": 0,
                "confirmed_contactable_private_leads": 0,
                "message": "Official TED provider unavailable or response did not pass validation",
                "checked_at_utc": datetime.now(timezone.utc).isoformat(),
            }
        _cache.update(until=time.monotonic() + (CACHE_SECONDS if out["status"]=="ok" else 120),
                      value=out)
        return dict(out, cached=False)
