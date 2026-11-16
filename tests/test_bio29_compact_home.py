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
    assert layout.count('data-bio-discovery-category=') == 4
    for segment in ("individual", "public_sector", "ted", "business"):
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
    assert "input.disabled=false" in script
    assert "if(submit)submit.disabled=false" in script
    assert "matchingBusinesses" in script
    assert "bio-discovery-private-no-matches" in script
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
    assert 'data-bio-tab="status"' not in desktop
    assert 'href="/admin/operations/status" data-bio-tab="status"' in html
    ts = (ROOT / "src/navigation.ts").read_text(encoding="utf-8")
    js = (ROOT / "static/typed/navigation.js").read_text(encoding="utf-8")
    assert "'/admin/operations/status'" in ts and "'/admin/operations/status'" in js

def test_search_precedes_compact_category_filter_chips():
    layout=(ROOT / "static/discovery-layout.js").read_text(encoding="utf-8")
    css=(ROOT / "static/bioshield-admin.css").read_text(encoding="utf-8")
    menu=layout[layout.index("export function discoveryFilterMenu"):layout.index("export function businessDiscoveryMarkup")]
    # Search is the first interactive element, with small in-place chips below it.
    assert menu.index('id="bio-discovery-search-form"') < menu.index('bio-discovery-filter-row')
    assert menu.index('bio-discovery-filter-row') < menu.index('id="bio-home-ted-summary"')
    assert "bio-discovery-filter-label" in menu
    assert menu.count('data-bio-discovery-category=')==4
    for mode in ('current','home','custom'):
        assert f'data-bio-location-mode="{mode}"' in menu
    for mode in ('list','map'):
        assert f'data-bio-search-view="{mode}"' in menu
    assert ".bio-discovery-menu .bio-home-category" in css
    assert "border-radius:999px" in css
    assert "min-height:36px" in css
    assert "display:flex;" in css
    assert "bio-discovery-menu .bio-home-category[aria-pressed=" in css
