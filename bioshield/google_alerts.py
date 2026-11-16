"""Read-only Google Alerts Atom connector: discovery hints, never customer leads.

No Google Alerts management API is assumed. Feed addresses are private capability
URLs configured by the operator in Render, not URL parameters accepted from users.
No original publisher page is fetched until source policy has been checked.
"""
import hashlib
import html
import json
import os
import re
import time
from datetime import datetime, timezone
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from xml.etree import ElementTree as ET

from .engine import canonical_url, classify
from .audience import classify_audience

ATOM = "{http://www.w3.org/2005/Atom}"
MAX_FEEDS = 20
MAX_ITEMS = 40
MAX_BYTES = 250_000
CACHE_SECONDS = 600
_LOCK = Lock()
_CACHE = {"until": 0.0, "key": "", "value": None}


class _RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def validated_feed_url(url):
    """Permit *only* operator-supplied Google Alerts feed endpoints."""
    if not isinstance(url, str) or len(url) > 500:
        raise ValueError("Invalid Google Alerts feed URL")
    split = urlsplit(url)
    if (split.scheme != "https" or split.hostname not in ("google.com", "www.google.com")
            or split.port not in (None, 443) or split.username or split.password
            or split.query or split.fragment
            or not re.fullmatch(r"/alerts/feeds/[0-9]+/[A-Za-z0-9_-]+", split.path)):
        raise ValueError("Not an approved Google Alerts RSS/Atom URL")
    return url


def configured_feeds(env_value=None):
    """JSON list; never return feed tokens to callers of the public API."""
    if env_value is None:
        env_value = os.environ.get("BIOSHIELD_GOOGLE_ALERTS_FEEDS_JSON", "")
    if not env_value.strip():
        return []
    try:
        values = json.loads(env_value)
    except (ValueError, TypeError) as exc:
        raise ValueError("Malformed Google Alerts feed configuration") from exc
    if not isinstance(values, list) or len(values) > MAX_FEEDS:
        raise ValueError("Expected at most 20 Google Alerts feeds")
    if not all(isinstance(v, str) for v in values):
        raise ValueError("Feed entries must be strings")
    return list(dict.fromkeys(validated_feed_url(v) for v in values))


def _download_feed(feed_url):
    """HTTPS to fixed Google endpoint; rejects redirects, limits bytes and time."""
    validated_feed_url(feed_url)
    req = Request(feed_url, headers={
        "User-Agent": "BioShieldAlertsReadOnly/1.0",
        "Accept": "application/atom+xml, application/xml;q=0.9",
    })
    opener = build_opener(_RejectRedirects())
    with opener.open(req, timeout=8) as response:
        if response.status != 200:
            raise ValueError("Unexpected Google Alerts status")
        content = response.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise ValueError("Feed too large")
    return content


def _plain(value):
    value = re.sub(r"<[^>]*>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(value)).strip()[:400]


def _source_from_google_link(value):
    """Unwrap only known Google /url redirects; never follow the redirect."""
    split = urlsplit(value)
    if split.hostname in ("www.google.com", "google.com"):
        if split.path != "/url":
            raise ValueError("Not a publisher URL")
        args = parse_qs(split.query)
        urls = args.get("url") or args.get("q")
        if not urls or len(urls) != 1:
            raise ValueError("Ambiguous original publisher link")
        value = urls[0]
    return canonical_url(value)


def _alert_time(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).isoformat() if dt.tzinfo else None
    except (ValueError, AttributeError):
        return None


def parse_alert_atom(payload, *, seen=None):
    """Read Google Atom entries without promoting snippets to verified evidence."""
    if not isinstance(payload, bytes) or len(payload) > MAX_BYTES:
        raise ValueError("Invalid feed size")
    if b"<!DOCTYPE" in payload.upper() or b"<!ENTITY" in payload.upper():
        raise ValueError("DTD/entity declarations forbidden")
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        raise ValueError("Malformed Atom") from exc
    if root.tag != ATOM + "feed":
        raise ValueError("Expected Atom feed")
    entries = root.findall(ATOM + "entry")
    if len(entries) > MAX_ITEMS:
        raise ValueError("Oversized entry list")
    seen = seen if seen is not None else set()
    records = []
    duplicates = 0
    rejected = 0
    for entry in entries:
        try:
            links = [l.get("href", "") for l in entry.findall(ATOM + "link")
                     if l.get("rel", "alternate") == "alternate"]
            if len(links) != 1:
                raise ValueError("No unambiguous publisher link")
            url = _source_from_google_link(links[0])
            key = hashlib.sha256(url.encode("utf-8")).hexdigest()
            if key in seen:
                duplicates += 1
                continue
            seen.add(key)
            title = _plain(entry.findtext(ATOM + "title") or "")
            summary = _plain(entry.findtext(ATOM + "content") or entry.findtext(ATOM + "summary") or "")
            brief = (title + " " + summary)[:800]
            intent = classify(brief)
            buyer = classify_audience(brief)
            records.append({
                "source_key": key,
                "source_url": url,  # internal only; never exposed from public API
                "alert_updated_at_utc": _alert_time(entry.findtext(ATOM + "updated")),
                "publisher_published_at_utc": None,  # not in trustworthy original evidence
                "service_hint": intent.category,
                "buyer_segment_hint": buyer.segment,
                "potential_request_unverified": bool(intent.is_request),
                "review_required": True,
                "original_source_opened": False,
                "confirmed_customer": False,
                "contact_eligible": False,
            })
        except (ValueError, TypeError):
            rejected += 1
    return {"records": records, "duplicates": duplicates, "rejected": rejected,
            "entries_observed": len(entries)}


def _fresh_report(feed_urls):
    seen = set()
    reports = []
    total = 0
    hints = 0
    buyer_hints = {"individual": 0, "public_sector": 0, "business": 0, "unknown": 0}
    dupes = 0
    errors = 0
    all_rejected = 0
    for index, url in enumerate(feed_urls):
        # Feed IDs are only positional, not secret credentials.
        try:
            data = parse_alert_atom(_download_feed(url), seen=seen)
            reports.append({"feed_number": index + 1, "status": "ok",
                            "entries_observed": data["entries_observed"],
                            "hints_unverified": sum(r["potential_request_unverified"] for r in data["records"])})
            total += len(data["records"])
            hints += sum(r["potential_request_unverified"] for r in data["records"])
            for row in data["records"]:
                if row["potential_request_unverified"]:
                    buyer_hints[row["buyer_segment_hint"] or "unknown"] += 1
            dupes += data["duplicates"]
            all_rejected += data["rejected"]
        except (ValueError, OSError, HTTPError, URLError, TimeoutError):
            errors += 1
            reports.append({"feed_number": index + 1, "status": "unavailable",
                            "entries_observed": None, "hints_unverified": None})
    return {
        "status": "ok" if errors == 0 else ("partial" if errors < len(feed_urls) else "unavailable"),
        "provider": "google_alerts", "mode": "rss_atom_readonly",
        "configured_feeds": len(feed_urls), "fetched_feeds": len(feed_urls) - errors,
        "entries_unique_unverified": total, "potential_request_hints_unverified": hints,
        "buyer_hint_counts_unverified": buyer_hints,
        "duplicates_within_alert_feeds": dupes, "rejected_entries": all_rejected,
        "feeds": reports, "original_sources_verified": 0,
        "confirmed_contactable_leads": 0, "outreach_enabled": False,
        "last_checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "note": "Google Alerts are unverified discovery hints only. No original publisher pages opened, no private contacts, no CRM writes.",
    }


def alerts_status():
    raw = os.environ.get("BIOSHIELD_GOOGLE_ALERTS_FEEDS_JSON", "")
    try:
        feeds = configured_feeds(raw)
    except ValueError:
        return {"status": "configuration_error", "provider": "google_alerts",
                "configured_feeds": None, "confirmed_contactable_leads": 0,
                "original_sources_verified": 0, "outreach_enabled": False}
    if not feeds:
        return {"status": "awaiting_feed_configuration", "provider": "google_alerts",
                "configured_feeds": 0, "fetched_feeds": 0,
                "entries_unique_unverified": None, "potential_request_hints_unverified": None,
                "buyer_hint_counts_unverified": None,
                "original_sources_verified": 0, "confirmed_contactable_leads": 0,
                "outreach_enabled": False,
                "note": "Create an authorized Google Alert with RSS delivery and configure its URL privately in Render."}
    # In-process cache is NOT durable, not a 14-day measurement dataset.
    fingerprint = hashlib.sha256(raw.encode()).hexdigest()
    now = time.monotonic()
    with _LOCK:
        if _CACHE["value"] is not None and _CACHE["key"] == fingerprint and _CACHE["until"] > now:
            return {**_CACHE["value"], "cached": True}
        value = _fresh_report(feeds)
        _CACHE.update(until=now + CACHE_SECONDS, key=fingerprint, value=value)
        return {**value, "cached": False}
