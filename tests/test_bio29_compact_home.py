"""BIO-29/BIO-30: compact menu belongs inside New discoveries, not the home."""
from pathlib import Path
from fastapi.testclient import TestClient
from app import app

ROOT = Path(__file__).resolve().parents[1]

def test_overview_is_quick_real_evidence_summary_without_search():
    with TestClient(app) as client:
        for route in ("/admin/operations/overview", "/admin/operations/discovery", "/admin/operations/status"):
            response = client.get(route)
            assert response.status_code == 200
            assert 'data-bio-tab="status"' in response.text
    script = (ROOT / "static/bioshield-admin.js").read_text(encoding="utf-8")
    layout = (ROOT / "static/discovery-layout.js").read_text(encoding="utf-8")
    overview = script[script.index('data-bio-panel="overview"'):script.index('data-bio-panel="status"')]
    discovery = script[script.index('data-bio-panel="discovery"'):script.index('data-bio-panel="pilot"')]
    status = script[script.index('data-bio-panel="status"'):script.index('data-bio-panel="discovery"')]
    assert "overviewSnapshot(" in overview
    assert "discoveryFilterMenu(" not in overview
    assert "discoveryFilterMenu(" in discovery
    assert 'bio-discovery-search-form' in layout
    assert layout.count('class="bio-home-category"') == 3
    for segment in ("individual", "public_sector", "business"):
        assert f'data-bio-discovery-category="{segment}"' in layout
    assert 'id="bio-ted-term"' in layout
    assert 'id="bio-home-ted-summary"' in layout
    assert "bio-live-status-status" in status
    assert "bio-entry-status" in status
    assert "bio-entry-discovery" not in discovery
    assert "bio-discovery-public-results" in discovery
    assert "bio-discovery-private-results" in discovery
    assert "bio-overview-recent-list" in layout
    assert "Η τρέχουσα ισχύς απαιτεί έλεγχο" in layout

def test_discovery_categories_are_filtered_in_place_not_navigational_links():
    script = (ROOT / "static/bioshield-admin.js").read_text(encoding="utf-8")
    layout = (ROOT / "static/discovery-layout.js").read_text(encoding="utf-8")
    assert "setDiscoveryCategory(category)" in script
    assert "input.disabled=!publicOnly" in script
    assert "archive.dataset.bioDiscoveryArchive=category" in script
    assert "businessDiscoveryMarkup({segmented" in script
    assert "Οι επιχειρηματικές εργασίες ανήκουν στο φίλτρο" in script
    assert "Δεν έχουν συνδεθεί" not in script
    assert 'aria-pressed="true"' in layout
    assert "Δεν υπάρχουν επιβεβαιωμένα νέα επιχειρηματικά αιτήματα" in layout
    assert "bio-home-search-form" not in script
    assert "data-bio-home-segment" not in script

def test_status_is_not_a_sixth_mobile_bottom_tab():
    html = (ROOT / "static/index.html").read_text(encoding="utf-8")
    bottom = html.split('id="bio-bottom-nav"', 1)[1].split("</nav>", 1)[0]
    desktop = html.split('id="bio-shell-nav"', 1)[1].split("</nav>", 1)[0]
    assert 'data-bio-tab="status"' not in bottom
    assert 'data-bio-tab="status"' in desktop
    ts = (ROOT / "src/navigation.ts").read_text(encoding="utf-8")
    js = (ROOT / "static/typed/navigation.js").read_text(encoding="utf-8")
    assert "'/admin/operations/status'" in ts and "'/admin/operations/status'" in js
