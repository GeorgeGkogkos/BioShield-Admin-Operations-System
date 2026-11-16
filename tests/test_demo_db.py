"""BIO-12: database-backed read-only demo with zero contact/CRM exposure."""
import json

import pytest
from fastapi.testclient import TestClient

from app import app
from bioshield import demo_db
from bioshield.demo_db import DemoDatabaseUnavailable, report_from_rows


def source(id, segment, kind, **extra):
    rec = {
        "evidence_id": id,
        "audience_segment": segment,
        "source_kind": kind,
        "issuer_or_forum": "Public organization or community",
        "region": "Αττική",
        "service": "Απεντόμωση",
        "summary": "Ανώνυμη, δημόσια πληροφορία για σχετική υπηρεσία.",
        "source_url": "https://example.com/" + id.lower(),
        "additional_url": None,
        "document_ref": "26PROC020101899",
        "published_on": "2026-11-10",
        "observed_on": "2026-11-16",
        "deadline_at": "2026-11-30T14:00:00+02:00",
        "deadline_day": None,
        "budget_eur_ex_vat": 900.0,
        "evidence_level": "indexed_notice_only",
        "evidence_note": "Μόνο δημόσια δεδομένα.",
        "case_status": "procurement_status_unverified",
        "original_opened": False,
        "source_is_real": True,
        "demo_only": True,
        "contact_eligible": False,
        "updated_at": "2026-11-16T10:00:00+00:00",
    }
    rec.update(extra)
    return rec


def records():
    return [
        source("ORG-001", "public_sector", "public_procurement"),
        source("FORUM-001", "individual", "community_discussion",
               case_status="historical_not_confirmed_active", deadline_at=None,
               document_ref=None, budget_eur_ex_vat=None),
        source("FORUM-002", None, "community_discussion", case_status="not_hiring",
               deadline_at=None, document_ref=None, budget_eur_ex_vat=None),
        source("BIZ-001", "business", "business_request", issuer_or_forum="Επιχείρηση demo",
               document_ref=None, deadline_at=None, budget_eur_ex_vat=None,
               case_status="not_hiring"),
    ]


def test_real_db_summary_has_three_independent_buyer_types():
    result = report_from_rows(records())
    assert result["demo_supabase_connected"] is True
    assert result["external_supabase_connected"] is False
    assert result["version"] == "bio13_recent_reddit_demo_v1"
    assert result["segment_counts"] == {
        "individual": 1, "public_sector": 1, "business": 1, "needs_review": 1,
    }
    assert len(result["tenders"]) == 1
    assert len(result["community_cases"]) == 2
    assert len(result["business_requests"]) == 1
    assert result["contact_eligible"] == result["confirmed_contactable_private_leads"] == 0
    assert "username" not in str(result) and "phone" not in str(result)
    assert result["read_only"] is True


@pytest.mark.parametrize("alter", [
    {"contact_eligible": True},
    {"source_is_real": False},
    {"demo_only": False},
    {"audience_segment": "business"},
    {"summary": "Στείλε email foo@example.com"},
    {"summary": "Τηλέφωνο 6912345678"},
    {"source_url": "javascript:alert(1)"},
])
def test_fails_closed_instead_of_disclosing_unsuitable_rows(alter):
    row = source("ORG-001", "public_sector", "public_procurement", **alter)
    with pytest.raises(DemoDatabaseUnavailable):
        report_from_rows([row])


def test_duplicate_evidence_id_is_rejected():
    row = source("ORG-001", "public_sector", "public_procurement")
    with pytest.raises(DemoDatabaseUnavailable):
        report_from_rows([row, row])


def test_no_configuration_is_explicit_503(monkeypatch):
    monkeypatch.delenv("BIOSHIELD_DEMO_SUPABASE_URL", raising=False)
    monkeypatch.delenv("BIOSHIELD_DEMO_SUPABASE_PUBLISHABLE_KEY", raising=False)
    with TestClient(app) as client:
        response = client.get("/api/bioshield/demo/evidence")
    assert response.status_code == 503
    assert "no-store" in response.headers["Cache-Control"]


def test_live_rest_uses_only_publishable_key_and_anonymous_select(monkeypatch):
    monkeypatch.setenv("BIOSHIELD_DEMO_SUPABASE_URL", demo_db.EXPECTED_URL)
    monkeypatch.setenv("BIOSHIELD_DEMO_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_fixture_for_test")
    invoked = {}

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def read(self, max_bytes):
            return json.dumps(records(), ensure_ascii=False).encode("utf-8")

    def fake_urlopen(req, timeout):
        invoked["url"] = req.full_url
        invoked["apikey"] = req.get_header("Apikey")
        invoked["method"] = req.get_method()
        invoked["timeout"] = timeout
        return Response()

    monkeypatch.setattr(demo_db, "urlopen", fake_urlopen)
    with TestClient(app) as client:
        response = client.get("/api/bioshield/demo/evidence")
        assert client.get("/api/bioshield/candidates").status_code == 403
        assert client.post("/api/bioshield/discover").status_code == 403
        assert client.post("/api/bioshield/handoff").status_code == 403

    assert response.status_code == 200
    assert response.json()["public_sources_reviewed"] == 4
    assert response.json()["data_source"] == "second_account_supabase_demo"
    assert response.headers["Cache-Control"] == "no-store"
    assert invoked["method"] == "GET"
    assert invoked["timeout"] == 9
    assert "/rest/v1/bioshield_demo_evidence?" in invoked["url"]
    assert "limit=501" in invoked["url"]
    assert invoked["apikey"] == "sb_publishable_fixture_for_test"
    assert "sb_publishable_fixture_for_test" not in response.text


def test_reddit_freshness_from_original_post_date_never_observed_date():
    from datetime import datetime, timedelta, timezone
    today = datetime.now(timezone.utc).date()

    def forum(id, days_ago, opened=True):
        return source(
            id, "individual", "community_discussion",
            published_on=(today - timedelta(days=days_ago)).isoformat(),
            observed_on=today.isoformat(),
            case_status="not_hiring",
            original_opened=opened,
            deadline_at=None, document_ref=None, budget_eur_ex_vat=None,
            evidence_level="original_post_opened" if opened else "original_post_not_opened",
        )

    records = [forum("FORUM-010", 31), forum("FORUM-011", 7),
               forum("FORUM-012", 30), forum("FORUM-013", 1, False)]
    report = report_from_rows(records)
    assert report["reddit_freshness"]["window_days"] == 30
    assert report["reddit_freshness"]["recent_posts_30d"] == 2
    assert report["reddit_freshness"]["recent_posts_7d"] == 1
    assert report["reddit_freshness"]["historical_or_unopened"] == 2
    assert report["reddit_freshness"]["recent_confirmed_service_requests"] == 0
    assert [r["id"] for r in report["community_cases"]] == [
        "FORUM-013", "FORUM-011", "FORUM-012", "FORUM-010",
    ]
    assert report["community_cases"][0]["within_30d"] is False
    assert report["community_cases"][1]["within_7d"] is True
    assert report["community_cases"][2]["within_30d"] is True
    assert report["community_cases"][3]["within_30d"] is False
    assert all(row["contact_eligible"] is False for row in report["community_cases"])


def test_reddit_missing_or_future_post_date_fails_closed():
    from datetime import datetime, timedelta, timezone
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    for published in (None, "", tomorrow, "fake-date"):
        row = source("FORUM-014", "individual", "community_discussion",
                     published_on=published, case_status="not_hiring",
                     deadline_at=None, document_ref=None,
                     budget_eur_ex_vat=None)
        with pytest.raises(DemoDatabaseUnavailable):
            report_from_rows([row])
