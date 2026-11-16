"""BIO-14: real official TED feed contract; mocked transport ONLY in tests."""
import json
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from app import app
from bioshield import ted_discovery as ted


def item(number, days_ago, **overrides):
    return {
        "publication-number": number,
        "publication-date": (datetime.now(timezone.utc).date()-timedelta(days=days_ago)).isoformat(),
        "buyer-name": {"ell": ["Ελληνικός Δημόσιος Φορέας"]},
        "buyer-country": "GRC",
        "notice-title": {"ell": ["Παροχή υπηρεσιών απεντόμωσης"]},
        "classification-cpv": ["90922000"],
        **overrides,
    }


def test_extract_only_qualified_real_public_notices_and_never_contacts():
    payload={"notices": [
        item("777777-2026",2),
        item("777778-2026",40),
        item("777779-2026",1,**{"buyer-country":"DEU"}),
        item("777780-2026",1,**{"classification-cpv":["90910000"]}),
        item("777777-2026",2),
        item("777781-2026",0,**{"publication-date":"not-a-real-date"}),
    ]}
    rows=ted.extract_notices(payload)
    assert len(rows)==1 and rows[0]["id"]=="TED-777777-2026"
    assert rows[0]["audience_segment"]=="public_sector"
    assert rows[0]["evidence_level"]=="official_ted_metadata"
    assert rows[0]["current_eligibility_verified"] is False
    assert rows[0]["contact_eligible"] is False
    assert rows[0]["source_url"]=="https://ted.europa.eu/en/notice/-/detail/777777-2026"
    assert not {"email","phone","username","personal_address"} & rows[0].keys()


def test_date_boundary_and_syntactically_invalid_feed_fail_closed():
    assert len(ted.extract_notices({"notices":[item("777777-2026",30)]}))==1
    assert len(ted.extract_notices({"notices":[item("777777-2026",32)]}))==0
    assert len(ted.extract_notices({"notices":[item("777777-2026",-1)]}))==0
    for value in ({}, {"notices":"wrong"}, {"notices":[{}]*36}, []):
        try:
            ted.extract_notices(value)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid source payload accepted")


def test_actual_endpoint_queries_bounded_official_ted_only(monkeypatch):
    seen={}
    class FakeReply:
        def __enter__(self):return self
        def __exit__(self,*args):return False
        def read(self,n):
            return json.dumps({"notices":[item("777777-2026",1)]},ensure_ascii=False).encode()
    def fake_urlopen(request,timeout):
        seen["url"]=request.full_url
        seen["method"]=request.get_method()
        seen["body"]=json.loads(request.data)
        seen["timeout"]=timeout
        return FakeReply()
    monkeypatch.setattr(ted,"urlopen",fake_urlopen)
    ted._cache.update(until=0.0,value=None)
    with TestClient(app) as client:
        response=client.get("/api/bioshield/discovery/tenders")
        assert client.post("/api/bioshield/discover").status_code==403
        assert client.get("/api/bioshield/lab/cases").status_code==404
    assert response.status_code==200
    data=response.json()
    assert data["status"]=="ok" and data["source_is_live"] is True
    assert data["count"]==1
    assert data["confirmed_contactable_private_leads"]==0
    assert response.headers["cache-control"]=="no-store"
    assert seen["url"]=="https://api.ted.europa.eu/v3/notices/search"
    assert seen["method"]=="POST" and seen["timeout"]==12
    assert seen["body"]["limit"]<=35
    assert "buyer-country=GRC" in seen["body"]["query"]
    assert "90922000" in seen["body"]["query"]
    assert not {"password","apikey","token"} & set(seen["body"])
    assert "no-store" in response.headers["cache-control"]


def test_http_outage_returns_explicit_unavailable_not_fake_results(monkeypatch):
    from urllib.error import URLError
    def broken(_request,timeout):raise URLError("no origin")
    monkeypatch.setattr(ted,"urlopen",broken)
    ted._cache.update(until=0.0,value=None)
    with TestClient(app) as client:
        data=client.get("/api/bioshield/discovery/tenders").json()
    assert data["status"]=="unavailable"
    assert data["count"]==0 and data["notices"]==[]
    assert data["source_is_live"] is False
    assert data["confirmed_contactable_private_leads"]==0
