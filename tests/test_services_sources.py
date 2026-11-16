"""BIO-16: real service scope and permission-safe public platform status."""
from fastapi.testclient import TestClient

from app import app
from bioshield.engine import classify
from bioshield.source_policy import SERVICE_LABELS, permitted_to_crawl, source_status
from bioshield.ted_discovery import SERVICE_CPVS, CPVS, extract_notices
from datetime import datetime, timezone


def test_all_services_are_first_class_and_no_automatic_contacts():
    assert len(SERVICE_LABELS) == 5
    assert SERVICE_LABELS["plumbing"] == "Υδραυλικός"
    assert SERVICE_LABELS["drain_unblocking"] == "Αποφράξεις"
    assert "45332200" in CPVS
    assert "90470000" in CPVS
    assert "90922000" in CPVS
    assert set(SERVICE_CPVS) == set(SERVICE_LABELS)
    with TestClient(app) as client:
        r = client.get("/api/bioshield/services")
        assert r.status_code == 200
        assert r.json()["services"] == SERVICE_LABELS
        assert r.headers["cache-control"] == "no-store"
        assert client.get("/api/bioshield/candidates").status_code == 403
        assert client.post("/api/bioshield/handoff").status_code == 403


def test_plumbing_and_drain_classification_is_not_contact_consent():
    cases = (
        ("Ψάχνω υδραυλικό για διαρροή στο σπίτι", "plumbing", True),
        ("Χρειάζομαι απόφραξη βουλωμένης αποχέτευσης", "drain_unblocking", True),
        ("Μπορεί κάποιος να προτείνει αποφρακτικό συνεργείο;", "drain_unblocking", True),
        ("Η βρύση στάζει", "plumbing", False),
        ("Αναλαμβάνουμε αποφράξεις. Καλέστε μας!", "drain_unblocking", False),
        ("Πουλάω υδραυλικά εξαρτήματα", "plumbing", False),
    )
    for text, service, expected_request in cases:
        decision = classify(text)
        assert decision.category == service
        assert decision.is_request is expected_request
        assert decision.contact_eligible is False


def test_official_cpv_classification_independent_of_buyer_identification():
    today = datetime.now(timezone.utc).date().isoformat()
    base = {
        "publication-date": today,
        "buyer-country": "GRC",
        "buyer-name": {"ell": ["Δημόσιος φορέας"]},
        "notice-title": {"ell": ["Υπηρεσίες"]},
    }
    items = [
        dict(base, **{"publication-number":"888881-2026","classification-cpv":["45332200"]}),
        dict(base, **{"publication-number":"888882-2026","classification-cpv":["90470000"]}),
        dict(base, **{"publication-number":"888883-2026","classification-cpv":["90923000"]}),
        dict(base, **{"publication-number":"888884-2026","classification-cpv":["90921000"]}),
        dict(base, **{"publication-number":"888885-2026","classification-cpv":["45330000", "90470000"]}),
    ]
    rows = extract_notices({"notices":items})
    assert len(rows) == 5
    by_id = {r["notice_number"]: r for r in rows}
    assert by_id["888881-2026"]["service_codes"] == ["plumbing"]
    assert by_id["888882-2026"]["service_codes"] == ["drain_unblocking"]
    assert by_id["888883-2026"]["service_codes"] == ["rodent_control"]
    assert by_id["888884-2026"]["service_codes"] == ["disinfection"]
    assert set(by_id["888885-2026"]["service_codes"]) == {"plumbing", "drain_unblocking"}
    assert all(r["contact_eligible"] is False for r in rows)


def test_social_crawl_is_not_authorized_by_third_party_scraper():
    data = source_status()
    assert data["reddit_rss_used"] is False
    assert data["automated_social_crawls_enabled"] is False
    assert data["automated_forum_crawls_enabled"] is False
    assert data["verified_new_private_customer_requests"] == 0
    assert set(x["id"] for x in data["platforms"]) == {
        "ted", "reddit", "facebook", "instagram", "tiktok", "independent_forums"
    }
    for platform in ("reddit", "facebook", "instagram", "tiktok"):
        for provider in ("firecrawl", "tinyfish"):
            assert permitted_to_crawl(source_id=platform,provider=provider,
                                      provider_credits=1000) is False
            assert permitted_to_crawl(source_id=platform,provider=provider,
                                      provider_credits=1000,
                                      written_commercial_permission=True,
                                      robots_and_terms_verified=False) is False
            assert permitted_to_crawl(source_id=platform,provider=provider,
                                      provider_credits=0,
                                      written_commercial_permission=True,
                                      robots_and_terms_verified=True) is False
    assert permitted_to_crawl(source_id="reddit",provider="firecrawl",
                              provider_credits=3,written_commercial_permission=True,
                              robots_and_terms_verified=True) is True
    assert permitted_to_crawl(source_id="independent_forums",provider="tinyfish",
                              provider_credits=1,robots_and_terms_verified=False) is False
    with TestClient(app) as client:
        r=client.get("/api/bioshield/discovery/sources")
        assert r.status_code==200
        assert r.json()["services"]["plumbing"] == "Υδραυλικός"
        assert r.json()["verified_new_private_customer_requests"]==0
        assert r.headers["cache-control"]=="no-store"
