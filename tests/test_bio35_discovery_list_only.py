"""BIO-35: Discovery results stay a list; the dedicated Map page owns maps."""
from pathlib import Path
from fastapi.testclient import TestClient
from app import app

ROOT = Path(__file__).resolve().parents[1]


def test_discovery_has_no_redundant_results_list_map_toggle():
    layout = (ROOT / "static/discovery-layout.js").read_text(encoding="utf-8")
    app_js = (ROOT / "static/bioshield-admin.js").read_text(encoding="utf-8")
    css = (ROOT / "static/bioshield-admin.css").read_text(encoding="utf-8")
    toolbar = layout.split("export function discoveryFilterMenu(", 1)[1].split(
        "export function businessDiscoveryMarkup(", 1
    )[0]
    discovery = app_js.split('data-bio-panel="discovery"', 1)[1].split(
        'data-bio-panel="pilot"', 1
    )[0]

    assert "bio-discovery-search-form" in toolbar
    assert 'data-bio-discovery-category="public_sector"' in toolbar
    assert 'data-bio-location-mode="home"' in toolbar
    assert 'data-bio-search-view' not in toolbar
    assert "Τρόπος εμφάνισης αποτελεσμάτων" not in toolbar
    assert "Αποτελέσματα:" not in toolbar

    assert "bio-discovery-public-results" in discovery
    assert "bio-discovery-private-results" in discovery
    assert "bio-unified-archive" in discovery
    assert "bio-inline-map" not in discovery
    for removed in (
        "setSearchView", "searchView", "refreshInlineMap",
        "inlineMapCleanup", "bio-inline-map", "data-bio-search-view"
    ):
        assert removed not in app_js
        assert removed not in css


def test_dedicated_map_remains_accessible_and_independent():
    with TestClient(app) as client:
        response = client.get("/admin/operations/map")
        assert response.status_code == 200
        assert 'data-bio-tab="map"' in response.text
    app_js = (ROOT / "static/bioshield-admin.js").read_text(encoding="utf-8")
    assert "'<section data-bio-panel=\"map\" hidden>'" in app_js
    assert "coverageMarkup(coverage,esc,pilot)" in app_js
    assert "setupCoverageMap(page.querySelector('[data-bio-panel=\"map\"]')" in app_js
    assert "refreshCoverage()" in app_js
