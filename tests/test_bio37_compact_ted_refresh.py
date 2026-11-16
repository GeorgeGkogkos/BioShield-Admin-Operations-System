"""BIO-37: Compact manual refresh beside search, no TED introduction card."""
from pathlib import Path

from fastapi.testclient import TestClient
from app import app

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_refresh_is_adjacent_to_search_and_not_a_second_large_card():
    layout = (STATIC / "discovery-layout.js").read_text(encoding="utf-8")
    app_js = (STATIC / "bioshield-admin.js").read_text(encoding="utf-8")
    css = (STATIC / "bioshield-admin.css").read_text(encoding="utf-8")
    panel = layout.split("export function discoveryFilterMenu", 1)[1].split(
        "export function businessDiscoveryMarkup", 1
    )[0]
    results = app_js.split("function discoveries(", 1)[1].split(
        "export async function renderBioShieldAdmin", 1
    )[0]
    assert panel.count('id="bio-ted-refresh"') == 1
    assert panel.index('id="bio-discovery-search-form"') < panel.index('id="bio-ted-refresh"')
    assert panel.index('id="bio-ted-refresh"') < panel.index('bio-discovery-filter-row')
    assert 'class="bio-discovery-refresh"' in panel
    assert 'type="button"' in panel
    assert 'aria-label="Ανανέωση επίσημων ανακαλύψεων"' in panel
    assert 'id="bio-manual-message"' in panel and "bio-visually-hidden" in panel
    assert 'role="status"' in panel

    for removed in ("OFFICIAL EU OPEN DATA / LIVE SEARCH", "Αυτόματη ανακάλυψη — δημόσια έργα",
                    "Τελευταία επιτυχής αναζήτηση", "bio-demo-connection",
                    "bio-ted-substatus", "bio-ted-state", "bio-ted-total",
                    "Εκτέλεση χειροκίνητης αναζήτησης τώρα"):
        assert removed not in results

    assert 'id="bio-ted-service" class="bio-home-categories"' in panel
    assert 'data-bio-discovery-service="all" aria-pressed="true"' in panel
    assert 'id="bio-ted-service"' not in results
    assert 'id="bio-ted-count"' in results
    assert "bio-ted-results" in results
    assert "bio-focus-results" in results
    assert "bio-remote-results" in results
    assert ".bio-discovery-toolbar" in css
    assert ".bio-discovery-refresh.is-refreshing svg" in css


def test_manual_refresh_still_calls_existing_real_source_and_not_full_page_reload():
    js = (STATIC / "bioshield-admin.js").read_text(encoding="utf-8")
    assert "if(event.target.closest('#bio-ted-refresh'))void refreshTED(true)" in js
    assert "api('/bioshield/discovery/manual?'+qp.toString())" in js
    assert "button.classList.add('is-refreshing')" in js
    assert "button.classList.remove('is-refreshing')" in js
    assert "button.setAttribute('aria-busy','true')" in js
    assert "button.removeAttribute('aria-busy')" in js
    assert "updateDiscoveryUI()" in js
    assert "window.location.reload" not in js
    with TestClient(app) as client:
        assert client.get("/admin/operations/discovery").status_code == 200
        assert client.get("/admin/operations/map").status_code == 200
