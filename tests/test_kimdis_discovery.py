"""BIO-40 official KΗΜΔΗΣ metadata and access-gate regression tests.

Fixture data is invented *only* for unit tests; production never serves fixture rows.
"""
import json
from datetime import date, datetime

from fastapi.testclient import TestClient
from app import app
from bioshield import kimdis_discovery as kimdis


def record(adam="26PROC020176714", *, deadline="2026-11-17T15:00:00",
           cancelled=False, title="Πρόσκληση απεντόμωσης", cpvs=None):
    cpvs = cpvs if cpvs is not None else ["90922000-6"]
    return {
        "referenceNumber": adam,
        "title": title,
        "submissionDate": "2026-11-12T09:33:29.061",
        "finalSubmissionDate": deadline,
        "cancelled": cancelled,
        "organization": {"key": "123", "value": "ΔΗΜΟΣ ΔΟΚΙΜΗΣ"},
        "objectDetails": [{"cpvs": [{"key": k, "value": "Official CPV"} for k in cpvs]}],
        "totalCostWithoutVAT": 2000,
        "noticeType": {"key": "4", "value": "Πρόσκληση"},
        # These official fields MUST never propagate into the public JSON.
        "authorEmail": "private@example.invalid",
        "organizationVatNumber": "private-id",
        "contractingData": {"signers": {"value": "Private signer"}},
    }


AS_OF = datetime(2026, 11, 17, 9, 0, 0)
TODAY = AS_OF.date()


def test_exact_public_field_allowlist_and_official_source():
    out = kimdis.normalize_notice(record(), today=TODAY, now=AS_OF)
    assert out["reference_number"] == "26PROC020176714"
    assert out["buyer"] == "ΔΗΜΟΣ ΔΟΚΙΜΗΣ"
    assert out["published_on"] == "2026-11-12"
    assert out["budget_eur_ex_vat"] == 2000
    assert out["deadline_at_as_posted"] == "2026-11-17T15:00:00"
    assert out["deadline_state"] == "future_deadline_unverified"
    assert out["service_codes"] == ["pest_control"]
    assert out["source_url"] == (
        "https://cerpp.eprocurement.gov.gr/upgkimdis/unprotected/home.xhtml"
        "?referenceNumber=26PROC020176714"
    )
    assert out["current_eligibility_verified"] is False
    assert out["contact_eligible"] is False
    assert "authorEmail" not in out and "organizationVatNumber" not in out
    assert "contractingData" not in out and "signer" not in out
    assert "private@example.invalid" not in json.dumps(out)


def test_cancellation_expiration_date_bounds_and_invalid_ids_fail_closed():
    for value in (
        record(cancelled=True),
        record(deadline="2026-11-16T15:00:00"),
        record(adam="26REQ020176714"),
        {**record(), "submissionDate": "2026-09-01T10:00:00"},
        {**record(), "submissionDate": "2026-11-18T10:00:00"},
        {**record(), "organization": None},
        {**record(), "title": "Διαφήμιση"},
    ):
        if value.get("title") == "Διαφήμιση":
            value["objectDetails"] = [{"cpvs": [{"key": "12345678-9"}]}]
        assert kimdis.normalize_notice(value, today=TODAY, now=AS_OF) is None
    assert kimdis.normalize_notice(record(deadline=None), today=TODAY, now=AS_OF)["deadline_state"] == "unknown_review_required"


def test_5_service_categories_and_greek_accents_are_recognized():
    for code, name in (
        ("90923000-3", "rodent_control"),
        ("90921000-9", "disinfection"),
        ("45332200-5", "plumbing"),
        ("90470000-2", "drain_unblocking"),
    ):
        out=kimdis.normalize_notice(record(title="Επίσημη πρόσκληση",cpvs=[code]), today=TODAY, now=AS_OF)
        assert name in out["service_codes"]
    # A title search catches miscoded generic CPV when Greek accents vary.
    out=kimdis.normalize_notice(record(title="Εργασίες ΑΠΕΝΤΟΜΩΣΗΣ",cpvs=["90900000-6"]),today=TODAY,now=AS_OF)
    assert out is not None and "pest_control" in out["service_codes"]


def test_bounded_queries_dedup_and_no_secrets(monkeypatch):
    calls=[]
    class Response:
        def __init__(self,d):self.d=d
        def __enter__(self):return self
        def __exit__(self,*args):return False
        def read(self,n):return json.dumps(self.d,ensure_ascii=False).encode()
    def fake_open(req,timeout):
        calls.append((req,timeout))
        return Response({"content":[record(),record()], "totalPages":1, "totalElements":2})
    monkeypatch.setattr(kimdis,"urlopen",fake_open)
    kimdis._cache.update(value=None,until=0)
    with TestClient(app) as client:
        response=client.get("/api/bioshield/discovery/kimdis")
        assert client.get("/api/bioshield/candidates").status_code==403
    assert response.status_code==200 and response.headers["cache-control"]=="no-store"
    data=response.json()
    assert data["status"]=="ok" and data["source_is_live"] is True
    # Fixture 2026 dates are compared against the actual runner date; use an
    # independent explicit date invocation below to avoid run-date coupling.
    exact=kimdis.request_official_kimdis(today=TODAY,now=AS_OF)
    assert exact["count"]==1 and exact["records_deduplicated"]==1
    assert exact["requests_completed"]==4
    assert len(calls)>=4 and len(calls)<=8
    assert all(req.get_method()=="POST" for req,_ in calls)
    assert all(req.full_url.startswith(kimdis.ENDPOINT+"?page=") for req,_ in calls)
    assert all(timeout==8 for _,timeout in calls)
    assert all("dateFrom" in json.loads(req.data) and "dateTo" in json.loads(req.data)
               for req,_ in calls)
    assert all(not {"username","password","token","authorization"} & set(json.loads(req.data))
               for req,_ in calls)
    assert exact["confirmed_contactable_private_leads"]==0


def test_unavailable_never_uses_stale_success_cache(monkeypatch):
    from urllib.error import URLError
    monkeypatch.setattr(kimdis,"urlopen",lambda request,timeout: (_ for _ in ()).throw(URLError("blocked")))
    kimdis._cache.update(value=None,until=0)
    with TestClient(app) as client:
        result=client.get("/api/bioshield/discovery/kimdis")
    assert result.status_code==200
    data=result.json()
    assert data["status"]=="unavailable" and data["source_is_live"] is False
    assert data["notices"]==[] and data["count"]==0
    assert data["confirmed_contactable_private_leads"]==0


def test_partial_network_failure_keeps_only_source_verified_records(monkeypatch):
    from urllib.error import URLError
    call=[0]
    class Reply:
        def __enter__(self):return self
        def __exit__(self,*args):return False
        def read(self,n):return json.dumps({"content":[record()], "totalPages":1, "totalElements":1}).encode()
    def sometimes(req,timeout):
        call[0]+=1
        if call[0]>1:raise URLError("fail")
        return Reply()
    monkeypatch.setattr(kimdis,"urlopen",sometimes)
    report=kimdis.request_official_kimdis(today=TODAY,now=AS_OF)
    assert report["status"]=="partial"
    assert report["count"]==1 and report["failed_queries"]==3
    assert report["source_is_live"] is True
    assert report["notices"][0]["reference_number"]=="26PROC020176714"
