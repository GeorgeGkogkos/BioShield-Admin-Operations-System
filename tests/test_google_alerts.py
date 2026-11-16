"""BIO-20 RSS/Atom: mocked feed transport, no live user account or real leads."""
import json
from urllib.error import URLError
from urllib.parse import quote

from fastapi.testclient import TestClient
from app import app
from bioshield import google_alerts as alerts


def feed(*entries):
    return ('<?xml version="1.0" encoding="UTF-8"?>'
            '<feed xmlns="http://www.w3.org/2005/Atom">'
            + "".join(entries) + "</feed>").encode("utf-8")


def entry(title='Χρειάζομαι απεντόμωση στο σπίτι μου', link="https://example.org/public/post?utm_source=alerts", changed="2026-11-16T10:30:00Z"):
    from html import escape
    redirect = "https://www.google.com/url?url=" + quote(link, safe="")
    return ('<entry><title>' + escape(title) + '</title><content type="html">'
            + escape(title) + '</content><updated>' + changed + '</updated>'
            + '<link rel="alternate" href="' + escape(redirect, quote=True)
            + '"/></entry>')


def test_feed_configuration_is_explicit_strict_and_token_free():
    good = "https://www.google.com/alerts/feeds/123456/secret_abc-123"
    assert alerts.configured_feeds(json.dumps([good, good])) == [good]
    for bad in ("http://www.google.com/alerts/feeds/123/a",
                "https://google.com.evil.test/alerts/feeds/123/a",
                "https://www.google.com/alerts/feeds/123/a?url=http://localhost",
                "https://www.google.com/alerts/feeds/123/a#x",
                "https://www.google.com/url?url=https://example.com",
                "https://127.0.0.1/alerts/feeds/123/a"):
        try:
            alerts.configured_feeds(json.dumps([bad]))
        except ValueError:
            pass
        else:
            raise AssertionError("Accepted unsafe feed location " + bad)
    for payload in ("not-json", '"one-string"', json.dumps(["https://example.com"])):
        try:
            alerts.configured_feeds(payload)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid configuration accepted")


def test_atom_snippets_generate_review_only_hints_and_deduplicate_original_urls():
    one = entry()
    two = entry(link="https://example.org/public/post")
    parsed = alerts.parse_alert_atom(feed(one, two))
    assert parsed["entries_observed"] == 2
    assert parsed["duplicates"] == 1
    assert len(parsed["records"]) == 1
    row = parsed["records"][0]
    assert row["source_url"] == "https://example.org/public/post"
    assert row["potential_request_unverified"] is True
    assert row["service_hint"] == "pest_control"
    assert row["buyer_segment_hint"] == "individual"
    assert row["review_required"] is True
    assert row["publisher_published_at_utc"] is None
    assert row["original_source_opened"] is False
    assert row["confirmed_customer"] is False and row["contact_eligible"] is False


def test_non_request_advertisements_are_not_leads():
    parsed = alerts.parse_alert_atom(feed(entry("Προσφέρουμε απεντόμωση έκπτωση τώρα")))
    row = parsed["records"][0]
    assert row["potential_request_unverified"] is False
    assert row["buyer_segment_hint"] is None
    assert not row["contact_eligible"]


def test_malformed_xml_dtd_google_redirect_and_unsafe_urls_fail_closed():
    for bad_xml in (b'<!DOCTYPE x [<!ENTITY e "boom">]><feed/>', b"<feed><unclosed>",
                    b"<rss><channel/></rss>"):
        try:
            alerts.parse_alert_atom(bad_xml)
        except ValueError:
            pass
        else:
            raise AssertionError("Accepted malformed or dangerous feed")
    invalid_link = entry(link="http://127.0.0.1/admin/secrets")
    redirect_without_target = '<entry><title>x</title><link href="https://google.com/url?bad=x"/></entry>'
    result = alerts.parse_alert_atom(feed(invalid_link, redirect_without_target))
    assert result["records"] == []
    assert result["rejected"] == 2


def test_multi_feed_duplicate_suppression_and_outage(monkeypatch):
    url1 = "https://www.google.com/alerts/feeds/1/abc"
    url2 = "https://www.google.com/alerts/feeds/2/def"
    url3 = "https://www.google.com/alerts/feeds/3/ghi"
    def fake_download(url):
        if url == url3:
            raise URLError("temporary network outage")
        return feed(entry())
    monkeypatch.setattr(alerts, "_download_feed", fake_download)
    status = alerts._fresh_report([url1, url2, url3])
    assert status["status"] == "partial"
    assert status["fetched_feeds"] == 2
    assert status["entries_unique_unverified"] == 1
    assert status["duplicates_within_alert_feeds"] == 1
    assert status["confirmed_contactable_leads"] == 0
    assert "feed_url" not in json.dumps(status)
    assert "https://www.google.com/alerts/feeds" not in json.dumps(status)


def test_public_api_disabled_until_configured_and_never_exposes_records(monkeypatch):
    monkeypatch.delenv("BIOSHIELD_GOOGLE_ALERTS_FEEDS_JSON", raising=False)
    with TestClient(app) as client:
        result = client.get("/api/bioshield/discovery/google-alerts")
        assert result.status_code == 200
        assert result.json()["status"] == "awaiting_feed_configuration"
        assert result.json()["confirmed_contactable_leads"] == 0
        assert client.post("/api/bioshield/handoff").status_code == 403
    value = "https://www.google.com/alerts/feeds/13579/privateToken"
    monkeypatch.setenv("BIOSHIELD_GOOGLE_ALERTS_FEEDS_JSON", json.dumps([value]))
    monkeypatch.setattr(alerts, "_download_feed", lambda _: feed(entry()))
    alerts._CACHE.update(key="", until=0, value=None)
    with TestClient(app) as client:
        payload = client.get("/api/bioshield/discovery/google-alerts").json()
    assert payload["status"] == "ok"
    assert payload["entries_unique_unverified"] == 1
    assert payload["potential_request_hints_unverified"] == 1
    assert payload["confirmed_contactable_leads"] == 0
    assert "source_url" not in str(payload)
    assert "privateToken" not in str(payload)
    assert "example.org" not in str(payload)
