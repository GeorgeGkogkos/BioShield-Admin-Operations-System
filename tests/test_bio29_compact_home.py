"""BIO-29: compact home preserves real-source semantics and dedicated diagnostics."""
from pathlib import Path
from fastapi.testclient import TestClient
from app import app

ROOT = Path(__file__).resolve().parents[1]

def test_compact_home_and_status_are_distinct_and_bookmarkable():
    with TestClient(app) as client:
        for route in ("/admin/operations/overview", "/admin/operations/status"):
            response = client.get(route)
            assert response.status_code == 200
            assert 'data-bio-tab="status"' in response.text
    script = (ROOT / "static/bioshield-admin.js").read_text(encoding="utf-8")
    home = script[script.index('data-bio-panel="overview"'):script.index('data-bio-panel="status"')]
    status = script[script.index('data-bio-panel="status"'):script.index('data-bio-panel="discovery"')]
    assert "Ανακάλυψη ευκαιριών" in home
    assert 'bio-home-search-form' in home
    assert home.count('class="bio-home-category"') == 3
    assert 'data-bio-home-segment="individual"' in home
    assert 'data-bio-home-segment="business"' in home
    assert 'data-bio-home-public="true"' in home
    assert "bio-home-ted-summary" in home
    assert "bio-live-status-status" not in home
    assert "Προγραμματισμένη εκτέλεση GitHub" not in home
    assert "bio-live-status-status" in status
    assert "bio-entry-status" in status
    assert "bio-overview-segments" in status
    assert "bio-new-since-visit" not in home
    assert "homeTedSummary(ted,entryCheck,newSinceOpen)" in script

def test_status_is_not_a_sixth_mobile_bottom_tab():
    html = (ROOT / "static/index.html").read_text(encoding="utf-8")
    bottom = html.split('id="bio-bottom-nav"', 1)[1].split("</nav>", 1)[0]
    desktop = html.split('id="bio-shell-nav"', 1)[1].split("</nav>", 1)[0]
    assert 'data-bio-tab="status"' not in bottom
    assert 'data-bio-tab="status"' in desktop
    ts = (ROOT / "src/navigation.ts").read_text(encoding="utf-8")
    js = (ROOT / "static/typed/navigation.js").read_text(encoding="utf-8")
    assert "'/admin/operations/status'" in ts and "'/admin/operations/status'" in js
