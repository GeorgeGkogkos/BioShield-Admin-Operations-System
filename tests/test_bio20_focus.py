"""BIO-20: real source timestamps, scoped NUTS, manual rate limit, UI safety."""
from datetime import datetime,timezone
from pathlib import Path
from unittest.mock import Mock
from fastapi.testclient import TestClient
import json
import sys

from app import app
from bioshield import geographic_focus as geo
from bioshield import focused_discovery as focus
from bioshield import automation_status as status
from bioshield import ted_discovery as ted


def test_official_nuts_home_plus_additive_travel_and_threshold():
    home=geo.location_policy()
    assert home["home"]=="ilion" and home["temporary"] is None
    assert home["combined_nuts"] == [
        "EL301","EL302","EL303","EL304","EL305","EL306","EL307",
        "EL642","EL652"
    ]
    travel=geo.location_policy(temporary="thessaloniki")
    assert "EL522" in travel["combined_nuts"]
    assert "EL642" in travel["combined_nuts"]
    assert "EL652" in travel["combined_nuts"]
    assert travel["precision"]=="coarse_region_only"
    assert travel["consent_required_for_browser_location"] is True
    assert geo.classify_notice(
        {"place_of_performance_nuts":["EL522"]}, travel)=="priority_nearby"
    assert geo.classify_notice(
        {"place_of_performance_nuts":["EL522"]}, home)=="remote_audience_review_required"
    assert geo.classify_notice(
        {"place_of_performance_nuts":["EL522"],"audience_segment":"public_sector",
         "evidence_level":"official_ted_metadata","official_total_value_eur":None},home
    )=="remote_public"
    assert geo.classify_notice(
        {"place_of_performance_nuts":["EL522"],"audience_segment":"business",
         "evidence_level":"verified_primary_business_request"},home
    )=="remote_business"
    assert geo.classify_notice(
        {"place_of_performance_nuts":["EL522"],"audience_segment":"individual",
         "official_total_value_eur":8000000},home
    )=="remote_individual_excluded"
    assert home["remote_minimum_eur_required"] is False
    assert home["remote_individuals_allowed"] is False
    assert geo.classify_notice(
        {"place_of_performance_nuts":[],"official_total_value_eur":999999},home
    )=="unlocated_review"
    try:geo.location_policy(home="malicious")
    except ValueError:pass
    else:assert False


def test_extract_official_nuts_and_eur_only_if_primary_explicit():
    assert geo.official_nuts_from_value(["EL302","EL642","not nuts"])==["EL302","EL642"]
    assert geo.official_nuts_from_value({"zone":{"code":"EL652"}})==["EL652"]
    assert geo.official_nuts_from_value("ATTICA / BUYER HEADQUARTERS")==[]
    assert geo.posted_eur_from_fields({"total-value":"100000.00","total-value-cur":"EUR"})==100000
    assert geo.posted_eur_from_fields({"total-value":"100000","total-value-cur":"USD"}) is None
    assert geo.posted_eur_from_fields({"total-value":"approx 100000","total-value-cur":"EUR"}) is None
    assert geo.posted_eur_from_fields({"total-value":100000}) is None
    body=focus._query_regions(["EL302","EL642","EL652"])
    assert "place-of-performance IN (EL302 EL642 EL652)" in body["query"]
    assert "buyer-country=GRC" in body["query"]
    assert "total-value-cur" in body["fields"]
    assert "classification-cpv" in body["fields"]
    assert body["limit"]<=35
    for bad in (["EL30X"],["0 OR buyer-country=DEU"],[]):
        try:focus._query_regions(bad)
        except ValueError:pass
        else:assert False


def test_regional_search_dedup_home_and_travel_without_inventing_worksite(monkeypatch):
    called=[]
    def fake(codes,timeout=10):
        called.append(codes)
        return {"status":"ok","count":1,
          "searched_at_utc":"2026-11-16T12:00:00Z",
          "notices":[{
            "id":"TED-777777-2026","notice_number":"777777-2026",
            "published_on":"2026-11-16",
            "buyer":"Public buyer","title":"Official cleaning notice",
            "source_url":"https://ted.europa.eu/en/notice/-/detail/777777-2026",
            "service_codes":["pest_control"],
            "place_of_performance_nuts":["EL302"],"official_total_value_eur":None
          }]}
    monkeypatch.setattr(focus,"query_official_region",fake)
    focus._cache.clear();focus._last_force=0.
    report=focus.focused_report(home="ilion",temporary="thessaloniki")
    assert report["status"]=="ok"
    assert len(called)==2
    assert called[0]==tuple(geo.HOME_CODES)
    assert called[1]==("EL522",)
    assert report["count"]==1
    assert report["notices"][0]["geographic_tier"]=="priority_nearby"
    assert report["private_location_collected"] is False
    assert report["temporary_location_coordinates_stored"] is False
    assert focus.focused_report(home="ilion",temporary="thessaloniki")["cached"] is True
    assert len(called)==2
    focus._cache.clear()


def test_manual_read_only_endpoint_is_bounded_and_rate_limited(monkeypatch):
    called={"count":0}
    def fake_region(codes,timeout=10):
        called["count"]+=1
        return {"status":"ok","count":0,"notices":[],
                "searched_at_utc":"2026-11-16T12:00:00Z"}
    monkeypatch.setattr(focus,"query_official_region",fake_region)
    monkeypatch.setattr(ted,"request_official_ted",lambda timeout=12:{
        "status":"ok","count":0,"notices":[],"source_is_live":True,
        "searched_at_utc":"2026-11-16T12:01:00Z"})
    # app imported ted function by value, still route uses same cache wrapper.
    focus._cache.clear();focus._last_force=0.
    ted._cache.update(until=0.,value=None)
    with TestClient(app) as client:
        first=client.get("/api/bioshield/discovery/manual?home=ilion&temporary=thessaloniki")
        assert first.status_code==200, first.text
        data=first.json()
        assert data["manual_executed"] is True
        assert data["selected_temporary_region"]=="thessaloniki"
        assert data["focused"]["count"]==0
        assert called["count"]==2
        second=client.get("/api/bioshield/discovery/manual?home=ilion&temporary=thessaloniki")
        assert second.status_code==429
        assert second.json()["manual_executed"] is False
        assert int(second.headers["retry-after"]) > 0
        assert called["count"]==2
        assert client.get("/api/bioshield/discovery/focused?temporary=../../etc").status_code==422
        assert client.get("/api/bioshield/discovery/focused?home=attica&temporary=evia").status_code==200
        assert client.get("/api/bioshield/candidates").status_code==403
        assert client.post("/api/bioshield/handoff").status_code==403
    focus._cache.clear();focus._last_force=0.
    ted._cache.update(until=0.,value=None)


def test_official_greek_portals_are_research_only():
    with TestClient(app) as client:
        r=client.get("/api/bioshield/discovery/official-sources")
        assert r.status_code==200
        data=r.json()
        assert data["active_non_ted_providers"]==0
        assert len(data["providers"])==4
        assert {x["id"] for x in data["providers"]} == {
            "kimdis","esidis_services","esidis_works","diavgeia"}
        assert all(x["automated_ingestion"] is False for x in data["providers"])
        diavgeia=next(x for x in data["providers"] if x["id"]=="diavgeia")
        assert "partial" in diavgeia["status"]
        assert r.headers["cache-control"]=="no-store"


def test_github_workflow_timestamp_never_faked_and_cached(monkeypatch):
    class FakeResp:
        def __enter__(self):return self
        def __exit__(self,*args):return False
        def read(self,n):
            return json.dumps({"workflow_runs":[{
              "id":9921,"event":"schedule",
              "run_started_at":"2026-11-16T12:17:00Z",
              "created_at":"2026-11-16T12:17:00Z",
              "updated_at":"2026-11-16T12:19:00Z",
              "status":"completed","conclusion":"success",
              "html_url":"https://github.com/GeorgeGkogkos/BioShield-Admin-Operations-System/actions/runs/9921"
            }]}).encode()
    hits=[]
    def fake_urlopen(req,timeout):
        hits.append(req.full_url)
        return FakeResp()
    monkeypatch.setattr(status,"urlopen",fake_urlopen)
    status._cache.update(until=0,value=None)
    with TestClient(app) as client:
        r=client.get("/api/bioshield/discovery/heartbeat")
        assert r.status_code==200
        assert r.json()["latest_run"]["run_started_at"]=="2026-11-16T12:17:00Z"
        assert r.json()["latest_run"]["conclusion"]=="success"
        assert client.get("/api/bioshield/discovery/heartbeat").json()["cached"] is True
        assert len(hits)==1 and "event=schedule" in hits[0]
    status._cache.update(until=0,value=None)


def test_brand_loader_genuine_black_home_only_header_and_opt_in_gps():
    root=Path(__file__).resolve().parents[1]
    html=(root/"static/index.html").read_text()
    ui=(root/"static/bioshield-admin.js").read_text()
    gps=(root/"src/location-focus.ts").read_text()
    js=(root/"static/typed/location-focus.js").read_text()
    css=(root/"static/shell.css").read_text()
    styles=(root/"static/bioshield-admin.css").read_text()
    assert 'class="topbar bio-is-loading"' in html
    assert 'id="bio-header-loading"' in html
    assert "bio-start-loader" not in html
    assert "bio-skeleton-brand" not in html
    assert "/static/bioshield-company-logo.png" in html
    assert "brandedLoader()" not in ui
    assert 'pageSkeleton(window.location.pathname)' in ui
    assert html.index('id="bio-shell-nav"') < html.index('id="app"')
    assert '<nav class="bio-tabs"' not in ui
    assert ui.index("'<section data-bio-panel=\"overview\"") < ui.index("'<header class=\"bio-heading\"")
    assert "id=\"bio-ted-refresh\"" in ui
    assert "api('/bioshield/discovery/manual?" in ui
    assert "bio-live-status-overview" in ui and "bio-live-status-discovery" in ui
    assert "watchPosition(" in gps and "onStart" in gps
    assert "removeEventListener('visibilitychange'" in gps
    assert "geolocation=(self)" in (root/"app.py").read_text()
    assert "coords.latitude" in gps and "coords.longitude" in gps
    assert "sessionStorage" not in gps
    assert "fetch(" not in gps
    assert "latitude" not in js[js.index("onFocusChange(selection())"):js.index("const onHome")]
    assert "--canvas:#000" in css
    assert "--paper:#08080a" in css
    assert "--accent-soft:#17191d" in css
    assert "bio-logo-pulse" not in styles
    assert "bio-initial-load-error" in styles
    assert "prefers-reduced-motion" in styles


def test_hourly_snapshot_preserves_first_seen_on_repeat(monkeypatch,tmp_path):
    from scripts import sync_ted
    out=tmp_path/"ted-current.json"
    first={"status":"ok","count":1,"raw_count":1,
      "searched_at_utc":"2026-11-16T10:00:00Z",
      "notices":[{"id":"TED-700000-2026","published_on":"2026-11-15"}]}
    next_run={"status":"ok","count":1,"raw_count":1,
      "searched_at_utc":"2026-11-16T11:00:00Z",
      "notices":[{"id":"TED-700000-2026","published_on":"2026-11-15"}]}
    reports=[first,next_run]
    monkeypatch.setattr(sync_ted,"request_official_ted",lambda timeout=20: reports.pop(0))
    monkeypatch.setattr(sys,"argv",["sync_ted.py","--output",str(out)])
    sync_ted.main()
    a=json.loads(out.read_text())["notices"][0]
    assert a["first_seen_at_utc"]=="2026-11-16T10:00:00Z"
    assert a["last_seen_at_utc"]=="2026-11-16T10:00:00Z"
    sync_ted.main()
    b=json.loads(out.read_text())["notices"][0]
    assert b["first_seen_at_utc"]=="2026-11-16T10:00:00Z"
    assert b["last_seen_at_utc"]=="2026-11-16T11:00:00Z"
