"""BIO-10 public source pilot retains no contacts or CRM permissions."""
from datetime import datetime
from urllib.parse import urlsplit
from fastapi.testclient import TestClient
from app import app
from bioshield.real_pilot import pilot_report

def test_evidence_contains_real_sources_but_no_contactable_leads():
    report=pilot_report()
    assert report["real_public_sources"] is True
    assert report["synthetic"] is False
    assert report["external_supabase_connected"] is False
    assert report["live_provider_in_app"] is False
    assert report["contact_eligible"] == report["confirmed_contactable_private_leads"] == 0
    assert report["public_sources_reviewed"] == 12
    assert report["public_procurement_notices"] == 7
    assert report["public_discussions_reviewed"] == 5
    assert report["historical_explicit_requests"] == 2
    ids=set()
    for row in report["tenders"]:
        assert row["id"] not in ids
        ids.add(row["id"])
        assert row["notice_id"] and row["budget_eur_ex_vat"] > 0
        assert row["evidence_level"] in {"official_issuer_listing","republished_full_notice","indexed_notice_only"}
        assert row["deadline"] or row.get("deadline_day_reported")
        if row["deadline"]:
            assert datetime.fromisoformat(row["deadline"]).tzinfo is not None
        assert urlsplit(row["source_url"]).scheme == "https"
        assert not {"email","phone","contact"} & row.keys()
    for row in report["community_cases"]:
        assert row["id"] not in ids
        ids.add(row["id"])
        assert urlsplit(row["source_url"]).scheme == "https"
        assert not {"username","email","phone","contact"} & row.keys()
    assert report["community_cases"][0]["gate"] == "historical_not_confirmed_active"
    assert report["community_cases"][3]["gate"] == "stale_archived"

def test_pilot_route_readonly_and_publication_failclosed():
    client=TestClient(app)
    response=client.get("/api/bioshield/pilot/evidence")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
    assert response.json()["public_sources_reviewed"] == 12
    assert client.post("/api/bioshield/pilot/evidence").status_code == 405
    assert client.get("/api/bioshield/candidates").status_code == 403
    assert client.post("/api/bioshield/discover").status_code == 403
    assert client.post("/api/bioshield/handoff").status_code == 403
