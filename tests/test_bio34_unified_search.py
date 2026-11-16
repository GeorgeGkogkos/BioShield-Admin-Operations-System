"""BIO-34: unified public-source search without redundant primary data pages."""
from pathlib import Path

from fastapi.testclient import TestClient
from app import app

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"static"

def test_search_is_only_primary_navigation_destination():
    with TestClient(app) as client:
        html=client.get("/admin/operations/discovery").text
        for previous in ("/admin/operations", "/admin/operations/overview",
                         "/admin/operations/evidence", "/admin/operations/map"):
            assert client.get(previous).status_code==200
    desktop=html.split('id="bio-shell-nav"',1)[1].split("</nav>",1)[0]
    mobile=html.split('id="bio-bottom-nav"',1)[1].split("</nav>",1)[0]
    for nav in (desktop,mobile):
        assert nav.count('data-bio-tab=')==1
        assert 'data-bio-tab="discovery"' in nav
    assert 'href="/admin/operations/status" data-bio-tab="status"' in html
    assert 'href="/admin/operations/sources" data-bio-tab="sources"' in html
    boot=(STATIC/"app.js").read_text(encoding="utf-8")
    assert "canonicalPaths" in boot and "replaceState" in boot
    for router in (ROOT/"src/navigation.ts",STATIC/"typed/navigation.js"):
        text=router.read_text(encoding="utf-8")
        assert "canonical(" in text
        assert "return 'discovery';" in text

def test_all_user_specified_facets_live_under_one_search():
    layout=(STATIC/"discovery-layout.js").read_text(encoding="utf-8")
    menu=layout.split("export function discoveryFilterMenu",1)[1].split(
        "export function businessDiscoveryMarkup",1)[0]
    assert menu.index('bio-discovery-search-form')<menu.index('bio-discovery-filter-row')
    for category in ("individual","public_sector","ted","business"):
        assert f'data-bio-discovery-category="{category}"' in menu
    for mode in ("current","home","custom"):
        assert f'data-bio-location-mode="{mode}"' in menu
    for view in ("list","map"):
        assert f'data-bio-search-view="{view}"' in menu
    assert "Το TED είναι επίσημη πηγή" in menu

def test_source_evidence_is_preserved_without_pretending_historical_is_new():
    script=(STATIC/"bioshield-admin.js").read_text(encoding="utf-8")
    archive=(STATIC/"unified-archive.js").read_text(encoding="utf-8")
    map_module=(STATIC/"geographic-map.js").read_text(encoding="utf-8")
    assert "renderSearchArchive(pilot,esc,category)" in script
    assert "category==='ted'" in archive
    assert "Ιστορική ανάρτηση" in archive
    assert "Αρχειακή έρευνα" in archive
    assert "Δεν παρουσιάζονται δεδομένα cache ως ζωντανά" in archive
    assert "https://" in archive and "noopener noreferrer" in archive
    assert "searchTerm" in map_module
    assert "source.value=discoveryCategory==='ted'?'ted':'all'" in script
    assert "effectiveFocusChoice" in script
    assert "bio-focus-gps-start" in script
    assert "data-bio-location-mode" in script

def test_private_data_remains_unavailable_and_no_new_api_routes_are_needed():
    with TestClient(app) as client:
        assert client.get("/api/bioshield/candidates").status_code==403
        assert client.post("/api/bioshield/handoff").status_code==403
        assert client.get("/api/bioshield/discovery/map").status_code==200
