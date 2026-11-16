"""BIO-40: Bounded public KΗΜΔΗΣ notice search, independent of private CRM.

Official Greek open-data API, CC BY 4.0; POST is read-only SEARCH, not the
authenticated submission API. Never expose personal signers, author emails,
company contacts or claim a published notice is an open tender/lead.
"""
import json
import math
import re
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ORIGIN = "https://cerpp.eprocurement.gov.gr"
ENDPOINT = ORIGIN + "/khmdhs-opendata/notice"
HELP_URL = ORIGIN + "/khmdhs-opendata/help"
WINDOW_DAYS = 30
MAX_PAGES_PER_QUERY = 2
MAX_BODY_BYTES = 1_200_000
MAX_REPORTED_ROWS = 80
CACHE_SECONDS = 3600  # KΗΜΔΗΣ Open Data publishes updates roughly daily.
ATHENS = ZoneInfo("Europe/Athens")

# Exact official nine-digit CPVs, grouped to avoid a broad/unbounded single
# search hiding smaller plumbing and drain-clearing notices.
SERVICE_CPVS = {
    "pest_control": frozenset(("90922000-6", "90924000-0", "90670000-4")),
    "rodent_control": frozenset(("90923000-3",)),
    "disinfection": frozenset(("90920000-2", "90921000-9")),
    "plumbing": frozenset(("45332000-3", "45332200-5", "45332400-7")),
    "drain_unblocking": frozenset(("90470000-2", "90460000-9", "45332300-6")),
}
_GROUP_PEST = sorted(set().union(*(SERVICE_CPVS[k] for k in (
    "pest_control", "rodent_control", "disinfection"))))
_GROUP_DRAIN = sorted(SERVICE_CPVS["drain_unblocking"])
_GROUP_PLUMBING = sorted(SERVICE_CPVS["plumbing"])
# Title search catches misclassified notices such as 90900000-6.
SEARCHES = (
    {"cpvItems": _GROUP_PEST},
    {"cpvItems": _GROUP_DRAIN},
    {"cpvItems": _GROUP_PLUMBING},
    {"title": "απεντόμωση"},
)
TITLE_TERMS = {
    "pest_control": ("απεντομ", "εντομοκτον", "κουνουπ", "κοριων"),
    "rodent_control": ("μυοκτον", "τρωκτικ", "ποντικ"),
    "disinfection": ("απολυμαν", "εξολοθρευσ"),
    "plumbing": ("υδραυλικ",),
    "drain_unblocking": ("αποφραξ", "αποχετευ", "φρεατι"),
}
_lock = Lock()
_cache = {"until": 0.0, "value": None}


def _text(value, max_chars=240):
    """Take only explicitly allowed plain official fields, not nested contacts."""
    return value.strip()[:max_chars] if isinstance(value, str) else ""


def _iso_date(value):
    try:
        return datetime.fromisoformat(_text(value, 32).replace("Z", "+00:00")).date()
    except (ValueError, TypeError):
        return None


def _deadline(value, now):
    raw = _text(value, 32)
    if not raw or len(raw) < 16:
        return None, "unknown_review_required"
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None, "unknown_review_required"
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(ATHENS).replace(tzinfo=None)
    # API's naive finalSubmissionDate is displayed as *posted*, with no invented timezone.
    return raw[:19], ("future_deadline_unverified" if parsed > now else "expired")


def _amount(value):
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        return None
    return round(value, 2) if math.isfinite(value) and value >= 0 else None


def _cpvs(item):
    result = set()
    for part in item.get("objectDetails") or []:
        if not isinstance(part, dict):
            continue
        for cpv in part.get("cpvs") or []:
            code = cpv.get("key") if isinstance(cpv, dict) else None
            if isinstance(code, str) and re.fullmatch(r"\d{8}-\d", code):
                result.add(code)
    return result


def _fold(value):
    return "".join(char for char in unicodedata.normalize("NFD", value.casefold())
                   if not unicodedata.combining(char))


def _services(item, codes):
    lower = _fold(_text(item.get("title"), 500))
    return sorted(k for k, cpvs in SERVICE_CPVS.items()
                  if (cpvs & codes) or any(term in lower for term in TITLE_TERMS[k]))


def normalize_notice(item, *, today=None, now=None):
    """Return a review-only nonexpired procurement metadata row or None.

    Cancelled and expired offers never appear as active-looking search results.
    A future deadline is NOT evidence that all vendors can submit an offer.
    """
    if not isinstance(item, dict):
        return None
    today = today or datetime.now(ATHENS).date()
    now = now or datetime.now(ATHENS).replace(tzinfo=None)
    ident = _text(item.get("referenceNumber"), 32)
    if not re.fullmatch(r"\d{2}PROC\d{9}", ident):
        return None
    posted = _iso_date(item.get("submissionDate"))
    if posted is None or (today - posted).days not in range(0, WINDOW_DAYS + 1):
        return None
    title = _text(item.get("title"), 350)
    buyer = _text((item.get("organization") or {}).get("value")
                  if isinstance(item.get("organization"), dict) else None, 220)
    if not title or not buyer or item.get("cancelled") is not False:
        return None
    deadline, deadline_state = _deadline(item.get("finalSubmissionDate"), now)
    if deadline_state == "expired":
        return None
    cpv_codes = _cpvs(item)
    services = _services(item, cpv_codes)
    if not services:
        return None
    return {
        "id": "KIMDIS-" + ident,
        "reference_number": ident,
        "title": title,
        "buyer": buyer,
        "published_on": posted.isoformat(),  # Official KΗΜΔΗΣ submission date, not TED publish date.
        "deadline_at_as_posted": deadline,
        "deadline_state": deadline_state,
        "budget_eur_ex_vat": _amount(item.get("totalCostWithoutVAT")),
        "notice_type": _text((item.get("noticeType") or {}).get("value")
                              if isinstance(item.get("noticeType"), dict) else None, 60),
        "service_codes": services,
        "cpv_codes": sorted(cpv_codes),
        "audience_segment": "public_sector",
        "source_type": "official_kimdis",
        "source_url": ORIGIN + "/upgkimdis/unprotected/home.xhtml?referenceNumber=" + ident,
        "source_attachment_url": ENDPOINT + "/attachment/" + ident,
        "evidence_level": "official_kimdis_metadata",
        "qualification": "public_procurement_review_required",
        "current_eligibility_verified": False,
        "contact_eligible": False,
    }


def _request_page(body, page, *, timeout=8):
    req = Request(
        ENDPOINT + "?page=" + str(page),
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "User-Agent": "BioShield-official-public-procurement/1.0",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urlopen(req, timeout=timeout) as response:
        raw = response.read(MAX_BODY_BYTES + 1)
    if len(raw) > MAX_BODY_BYTES:
        raise ValueError("KΗΜΔΗΣ response exceeds byte limit")
    payload = json.loads(raw)
    if not isinstance(payload, dict) or not isinstance(payload.get("content"), list):
        raise ValueError("KΗΜΔΗΣ response must have a content array")
    if len(payload["content"]) > 50:
        raise ValueError("Unexpected KΗΜΔΗΣ page size")
    pages = payload.get("totalPages")
    if not isinstance(pages, int) or isinstance(pages, bool) or not 0 <= pages <= 100000:
        raise ValueError("KΗΜΔΗΣ pagination metadata missing or invalid")
    return payload


def request_official_kimdis(*, today=None, now=None):
    now = now or datetime.now(ATHENS).replace(tzinfo=None)
    today = today or now.date()
    dates = {
        "dateFrom": (today - timedelta(days=WINDOW_DAYS)).isoformat(),
        "dateTo": today.isoformat(),
    }
    seen = {}
    seen_records = 0
    invalid_or_expired = 0
    failed_queries = []
    truncated = []
    executed = 0
    for index, criteria in enumerate(SEARCHES):
        body = {**dates, **criteria}
        try:
            first = _request_page(body, 0)
            pages = first["totalPages"]
            payloads = [first]
            for p in range(1, min(pages, MAX_PAGES_PER_QUERY)):
                payloads.append(_request_page(body, p))
            if pages > MAX_PAGES_PER_QUERY:
                truncated.append(index)
            for payload in payloads:
                executed += 1
                for item in payload["content"]:
                    seen_records += 1
                    parsed = normalize_notice(item, today=today, now=now)
                    if parsed is None:
                        invalid_or_expired += 1
                    else:
                        seen[parsed["reference_number"]] = parsed
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
            failed_queries.append(index)  # No query body/secrets/contacts or arbitrary URLs.
    if len(failed_queries) == len(SEARCHES):
        raise ValueError("All official KΗΜΔΗΣ queries failed")
    # Earliest upcoming deadline first, unknown deadlines at the end; never rank as
    # 'verified available' or silently conceal the hard output cap.
    records = sorted(seen.values(), key=lambda row: (
        row["deadline_state"] != "future_deadline_unverified",
        row["deadline_at_as_posted"] or "9999-12-31",
        row["reference_number"],
    ))
    capped = len(records) > MAX_REPORTED_ROWS
    status = "partial" if failed_queries or truncated or capped else "ok"
    return {
        "version": "bio40_official_kimdis_v1",
        "provider": "ΚΗΜΔΗΣ — Official Greek Procurement Open Data API",
        "provider_url": HELP_URL,
        "license": "CC BY 4.0 (Greek open government procurement data)",
        "status": status,
        "source_is_live": True,
        "searched_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "freshness_days": WINDOW_DAYS,
        "source_last_update_frequency": "daily",
        "requests_completed": executed,
        "raw_result_slots_examined": seen_records,
        "records_deduplicated": len(records),
        "excluded_unqualified_or_expired": invalid_or_expired,
        "failed_queries": len(failed_queries),
        "truncated_queries": len(truncated),
        "capped_output": capped,
        "count": min(len(records), MAX_REPORTED_ROWS),
        "notices": records[:MAX_REPORTED_ROWS],
        "service_counts": {
            name: sum(name in row["service_codes"] for row in records[:MAX_REPORTED_ROWS])
            for name in SERVICE_CPVS
        },
        "confirmed_contactable_private_leads": 0,
        "contact_handoff_enabled": False,
        "notes": "Official public register only. Recorded deadlines may have changed, "
                 "invitation-only offers may not be open to all, and API metadata "
                 "do not verify current bidder eligibility or actual worksite.",
    }


def live_kimdis_report(*, force=False):
    t = time.monotonic()
    with _lock:
        if not force and _cache["value"] is not None and t < _cache["until"]:
            return dict(_cache["value"], cached=True)
        try:
            data = request_official_kimdis()
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            data = {
                "version": "bio40_official_kimdis_v1",
                "status": "unavailable",
                "source_is_live": False,
                "notices": [],
                "count": 0,
                "checked_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "confirmed_contactable_private_leads": 0,
                "contact_handoff_enabled": False,
                "message": "Official KΗΜΔΗΣ unavailable; not serving stale search data as live.",
            }
        _cache.update(until=time.monotonic() + (
            CACHE_SECONDS if data["status"] in ("ok", "partial") else 180
        ), value=data)
        return dict(data, cached=False)
