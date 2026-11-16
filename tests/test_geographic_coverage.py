"""BIO-17: no invented worksite coordinates or false geography claims."""
from datetime import datetime, timezone
from pathlib import Path
from fastapi.testclient import TestClient

from app import app
from bioshield.geographic_coverage import coverage_report, locate_notice, ADMIN_REGIONS
from bioshield import ted_discovery


def original_records():
    return [
        {"notice_number":"791336-2026",
         "title":"Ολοκληρωμένο Πρόγραμμα Καταπολέμησης Κουνουπιών στη Περιφέρεια Πελοποννήσου",
         "buyer":"ΠΕΡΙΦΕΡΕΙΑ ΠΕΛΟΠΟΝΝΗΣΟΥ", "published_on":"2026-11-13",
         "service_codes":["pest_control"]},
        {"notice_number":"774976-2026", "title":"Διακήρυξη 10/2026",
         "buyer":"ΠΕΡΙΦΕΡΕΙΑ ΑΤΤΙΚΗΣ - Δ/ΝΣΗ ΟΙΚΟΝΟΜΙΚΩΝ ΔΥΤΙΚΟΥ ΤΟΜΕΑ ΑΘΗΝΩΝ",
         "published_on":"2026-11-06","service_codes":["pest_control"]},
        {"notice_number":"765459-2026", "title":"Λειτουργία και συντήρηση περιφερειακών εγκαταστάσεων επεξεργασίας λυμάτων",
         "buyer":"Δημοτική Επιχείρηση Ύδρευσης Αποχέτευσης Δήμου Ρόδου (ΔΕΥΑΡ)",
         "published_on":"2026-11-04","service_codes":["drain_unblocking"]},
        {"notice_number":"758868-2026","title":"Εργασίες σε χώρους εμβέλειας Δήμου Πειραιά",
         "buyer":"ΔΗΜΟΣ ΠΕΙΡΑΙΑ","published_on":"2026-11-02",
         "service_codes":["pest_control","rodent_control"]},
        {"notice_number":"758124-2026","title":"Διακήρυξη 10/2026",
         "buyer":"ΠΕΡΙΦΕΡΕΙΑ ΑΤΤΙΚΗΣ", "published_on":"2026-11-02",
         "service_codes":["pest_control"]},
    ]


def test_real_ted_source_geography_and_precision_labels():
    res = coverage_report({"status":"ok","notices": original_records()})
    assert res["total_source_notices"] == 5
    assert res["mapped_notice_count"] == 3
    assert res["unlocated_notice_count"] == 2
    assert res["zero_observed_regions"] == 10
    assert len(res["regions"]) == len(ADMIN_REGIONS) == 13
    loc = {p["notice_number"]:p for p in res["points"]}
    assert loc["791336-2026"]["region"] == "Πελοπόννησος"
    assert loc["791336-2026"]["location_basis"] == "notice_title"
    assert loc["758868-2026"]["region"] == "Αττική"
    assert loc["758868-2026"]["precision"] == "municipality_representative_point"
    assert loc["765459-2026"]["location_basis"] == "buyer_only_not_work_site"
    assert loc["765459-2026"]["region"] == "Νότιο Αιγαίο"
    assert loc["765459-2026"]["service_codes"] == ["drain_unblocking"]
    assert all(p["is_actual_work_site"] is False for p in loc.values())
    assert all(p["contact_eligible"] is False for p in loc.values())
    assert all(p["latitude"] != 0 and p["longitude"] != 0 for p in loc.values())


def test_ambiguous_buyer_region_does_not_invent_worksite():
    record=original_records()[1]
    assert locate_notice(record) is None
    assert locate_notice({"title":"", "buyer": "Ιδιώτης από Αθήνα"}) is None
    res=coverage_report({"status":"ok","notices":[record,record]})
    assert res["total_source_notices"] == 1
    assert res["mapped_notice_count"] == 0
    assert res["unlocated_notice_count"] == 1


def test_offline_feed_must_not_display_stale_points():
    res=coverage_report({"status":"unavailable","notices":original_records()})
    assert res["status"] == "source_unavailable"
    assert res["points"] == []
    assert res["mapped_notice_count"] == 0


def test_live_endpoint_uses_same_official_validated_source(monkeypatch):
    monkeypatch.setattr(ted_discovery,"live_ted_report",lambda:{"status":"ok","notices":original_records()})
    # The app route imports live_ted_report by value; override the app module binding.
    import app as module
    monkeypatch.setattr(module,"live_ted_report",lambda:{"status":"ok","notices":original_records()})
    with TestClient(app) as client:
        res=client.get("/api/bioshield/discovery/map")
    assert res.status_code == 200
    assert res.headers["cache-control"] == "no-store"
    assert res.json()["mapped_notice_count"] == 3
    assert "not worksite" in res.json()["scope_warning"].lower() or "notices" in res.json()["scope_warning"].lower()
    assert not any("phone" in str(p).lower() or "email" in str(p).lower()
                   for p in res.json()["points"])


def test_hourly_action_schedule_and_map_assets():
    root=Path(__file__).resolve().parents[1]
    workflow=(root/".github/workflows/discovery.yml").read_text()
    assert "cron: '17 * * * *'" in workflow
    assert "cron: '20 */6 * * *'" not in workflow
    html=(root/"static/index.html").read_text()
    ui=(root/"static/bioshield-admin.js").read_text()
    js=(root/"static/geographic-map.js").read_text()
    assert "cdn.jsdelivr.net/npm/leaflet" not in html
    assert "/static/vendor/leaflet.js" in html
    assert "/static/vendor/leaflet.css" in html
    assert 'data-bio-tab="map"' not in html
    assert 'data-bio-tab="discovery"' in html
    assert 'id="bio-inline-map"' in ui
    assert "coverageMarkup(coverage,esc,pilot)" in ui
    assert "export function setupCoverageMap" in js
    assert "lib.map(container" in js
    assert "lib.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png'" in js
    assert "OpenStreetMap contributors" in js
    assert "fitBounds(" in js
    assert "updateWhenIdle:true" in js
    assert "bio-map-service" in js and "bio-map-region" in js
    assert "buyer_only_not_work_site" in js
    assert "GREECE_OUTLINE" not in js
    assert "cdn.jsdelivr.net" not in js
    leaflet_js=(root/"static/vendor/leaflet.js").read_text()
    assert "Leaflet 1.9.4" in leaflet_js[:220]
    assert len(leaflet_js)>140_000
    assert (root/"static/vendor/leaflet.css").stat().st_size > 10_000
    assert "crossOrigin:true" not in js
    assert "tileWaitTimeout=setTimeout" in js
    # BIO-19: deep link and old ?tab=map fallback moved into typed router.
    assert "installNavigation(page,selectTab)" in ui
    nav=(root/"src/navigation.ts").read_text()
    assert "new URLSearchParams(location.search).get('tab')" in nav
    assert "ROUTES[screen]===path" in nav
    license=(root/"static/vendor/LEAFLET_LICENSE.txt").read_text()
    assert "BSD 2-Clause" in license
