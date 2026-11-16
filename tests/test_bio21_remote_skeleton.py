"""BIO-21: remote public/business segmentation and truthful skeleton loading."""
from pathlib import Path

from fastapi.testclient import TestClient
import app as app_module
from bioshield.geographic_focus import location_policy, classify_notice
from bioshield.opportunity_routing import audience_type, partition_opportunities

ROOT=Path(__file__).resolve().parents[1]


def notice(sid,nuts,audience,level="official_ted_metadata",**more):
    return {
        "id":sid, "notice_number":sid.replace("TED-",""),
        "published_on":"2026-11-16",
        "title":"Published work notice", "buyer":"Named original buyer",
        "audience_segment":audience,
        "evidence_level":level,
        "place_of_performance_nuts":nuts,
        "source_url":"https://ted.europa.eu/en/notice/-/detail/777777-2026",
        "contact_eligible":False,
        **more,
    }


def cases():
    return [
        notice("TED-700001-2026",["EL302"],"public_sector"),
        notice("TED-700002-2026",["EL431"],"public_sector",
               official_total_value_eur=None),
        notice("TED-700003-2026",["EL421"],"business",
               level="verified_primary_business_request"),
        notice("TED-700004-2026",["EL431"],"individual",
               official_total_value_eur=50_000_000),
        notice("TED-700005-2026",[],"public_sector"),
        notice("TED-700006-2026",["EL612"],"business",
               level="search_result_only"),
        notice("TED-700007-2026",["EL612"],"business",
               level="verified_primary_source",audience_needs_review=True),
        notice("TED-700008-2026",["EL652"],"individual"),
    ]


def test_remote_public_any_value_and_remote_business_verified_only():
    policy=location_policy()
    result=partition_opportunities(cases(),policy=policy)
    assert [x["id"] for x in result["nearby"]] == [
        "TED-700001-2026","TED-700008-2026"]
    assert [x["id"] for x in result["remote_public"]] == [
        "TED-700002-2026"]
    assert [x["id"] for x in result["remote_business"]] == [
        "TED-700003-2026"]
    assert [x["id"] for x in result["needs_location_review"]] == [
        "TED-700005-2026"]
    assert [x["id"] for x in result["needs_audience_review"]] == [
        "TED-700006-2026","TED-700007-2026"]
    assert result["excluded_remote_individual_count"] == 1
    assert result["remote_individuals_displayed"] is False
    assert result["remote_requires_minimum_eur"] is False
    assert result["counts"]["remote_public"] == 1
    assert result["counts"]["remote_business"] == 1
    assert not any(x["audience_segment"]=="individual" for
                   x in result["remote_public"]+result["remote_business"])
    assert not any(x["contact_eligible"] for
                   x in result["remote_public"]+result["remote_business"])


def test_home_and_travel_both_count_as_nearby_remote_not_denied():
    p=location_policy(home="ilion",temporary="heraklion")
    result=partition_opportunities(cases(),policy=p)
    assert any(x["id"]=="TED-700002-2026" for x in result["nearby"])
    assert not result["remote_public"]
    assert any(x["id"]=="TED-700003-2026" for x in result["remote_business"])
    assert p["remote_minimum_eur_required"] is False
    assert p["remote_individuals_allowed"] is False
    assert classify_notice(notice("TED-1",["EL431"],"public_sector"),p)=="priority_nearby"


def test_verification_prevents_unconfirmed_business_remote():
    assert audience_type(notice("TED-1",["EL421"],"business",
                                level="search_result_only")) is None
    assert audience_type(notice("TED-1",["EL421"],"business",
                                level="verified_primary_source",
                                audience_needs_review=True)) is None
    assert audience_type(notice("TED-1",["EL431"],"public_sector",
                                level="unverified_search_snippet")) is None
    assert audience_type(notice("TED-1",["EL431"],"public_sector"))=="public_sector"


def test_duplicate_notice_never_double_counts_remote():
    x=notice("TED-700002-2026",["EL431"],"public_sector")
    report=partition_opportunities([x,x,x],policy=location_policy())
    assert report["counts"]["remote_public"]==1


def test_segmented_source_endpoint_fails_closed_and_blocks_distant_individual(monkeypatch):
    def fixture(*args,**kwargs):
        return {"status":"ok","notices":cases(),
                "searched_at_utc":"2026-11-16T14:00:00Z","cached":False}
    monkeypatch.setattr(app_module,"live_ted_report",fixture)
    with TestClient(app_module.app) as client:
        resp=client.get("/api/bioshield/discovery/segmented?home=ilion")
        assert resp.status_code==200
        data=resp.json()
        assert data["version"]=="bio21_geo_audience_v1"
        assert data["counts"]["nearby"]==2
        assert data["counts"]["remote_public"]==1
        assert data["counts"]["remote_business"]==1
        assert data["counts"]["needs_location_review"]==1
        assert data["counts"]["excluded_remote_individual"]==1
        assert data["cached"] is False
        assert data["searched_at_utc"]=="2026-11-16T14:00:00Z"
        assert data["remote_minimum_eur_required"] is False if "remote_minimum_eur_required" in data else True
        assert resp.headers["cache-control"]=="no-store"
        assert client.get("/api/bioshield/discovery/segmented?home=invalid").status_code==422
        assert client.get("/api/bioshield/candidates").status_code==403
        assert client.post("/api/bioshield/handoff").status_code==403


def test_unavailable_official_source_produces_no_remote_source_claim(monkeypatch):
    monkeypatch.setattr(app_module,"live_ted_report",lambda *args,**kwargs:{
        "status":"unavailable","notices":cases()})
    with TestClient(app_module.app) as client:
        data=client.get("/api/bioshield/discovery/segmented").json()
    assert data["status"]=="unavailable"
    assert data["remote_public"]==[]
    assert data["remote_business"]==[]
    assert data["nearby"]==[]


def test_actual_skeleton_modules_and_loading_lifecycle():
    ts=(ROOT/"src/skeleton.ts").read_text()
    js=(ROOT/"static/typed/skeleton.js").read_text()
    app=(ROOT/"static/bioshield-admin.js").read_text()
    css=(ROOT/"static/bioshield-admin.css").read_text()
    assert "export function pageSkeleton" in ts
    assert "export function showLoadingOverlay" in ts
    assert "aria-busy" in js and "setAttribute" in js and "role" in js and "status" in js
    assert "bio-skeleton-page" in js
    assert "bio-skeleton-row" in js
    assert "bio-skeleton-overlay" in js
    assert "bio-skeleton-map" in js
    assert "bio-skeleton-loader" in js
    assert "pageSkeleton(window.location.pathname)" in app
    assert "showLoadingOverlay(pilotPanel" not in app  # BIO-25: periodic reads keep the visible data
    assert "showLoadingOverlay(mapPanel" in app
    assert "showLoadingOverlay(page.querySelector('#bio-ted-results')" in app
    assert "showLoadingOverlay(page.querySelector('#bio-remote-results')" in app
    assert "manual?'Χειροκίνητη':'Αυτόματη'" in app
    assert "bio-skeleton-glow" in css
    assert "prefers-reduced-motion:reduce" in css
    assert "bio-remote-container" in css
    assert "bio-discovery-business-results" in app and "businessDiscoveryMarkup(" in app  # B2B moved to its own category
    assert "Δημόσιες συμβάσεις εκτός βασικής περιοχής" in app
    assert "≥100.000€" not in app
    assert "remote_min_value_eur" not in app
    assert (ROOT/"static/index.html").exists()
