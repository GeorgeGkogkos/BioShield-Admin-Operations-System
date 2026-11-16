"""BIO-34: unified public-source search without redundant primary data pages."""
from pathlib import Path

from fastapi.testclient import TestClient
from app import app

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"static"

def test_only_new_and_findings_merge_into_search_while_other_pages_remain():
    with TestClient(app) as client:
        html=client.get("/admin/operations/discovery").text
        for previous in ("/admin/operations", "/admin/operations/overview",
                         "/admin/operations/evidence", "/admin/operations/map"):
            assert client.get(previous).status_code==200
    desktop=html.split('id="bio-shell-nav"',1)[1].split("</nav>",1)[0]
    mobile=html.split('id="bio-bottom-nav"',1)[1].split("</nav>",1)[0]
    for screen in ('overview','discovery','map','sources'):
        assert desktop.count(f'data-bio-tab="{screen}"')==1
        assert mobile.count(f'data-bio-tab="{screen}"')==1
    assert desktop.count('data-bio-tab="status"')==1
    assert 'data-bio-tab="status"' not in mobile
    assert desktop.count('data-bio-tab=')==5
    assert mobile.count('data-bio-tab=')==4
    assert 'data-bio-tab="pilot"' not in html
    assert '<span>Αναζήτηση</span>' in html
    assert '<span>Νέα</span>' not in html
    assert '<span>Ευρήματα</span>' not in html
    boot=(STATIC/"app.js").read_text(encoding="utf-8")
    assert "oldPath==='/admin/operations/evidence'" in boot
    assert "oldPath==='/admin/operations/map'" not in boot
    for router in (ROOT/"src/navigation.ts",STATIC/"typed/navigation.js"):
        text=router.read_text(encoding="utf-8")
        assert "canonical(" in text
        assert "return 'overview';" in text
        assert "pilot" in text and "canonical" in text
        assert "['overview','pilot','map'].includes" not in text

def test_all_user_specified_facets_live_under_one_search():
    layout=(STATIC/"discovery-layout.js").read_text(encoding="utf-8")
    menu=layout.split("export function discoveryFilterMenu",1)[1].split(
        "export function businessDiscoveryMarkup",1)[0]
    assert menu.index('bio-discovery-search-form')<menu.index('bio-discovery-filter-row')
    for category in ("individual","public_sector","ted","business"):
        assert f'data-bio-discovery-category="{category}"' in menu
    for mode in ("current","home","custom"):
        assert f'data-bio-location-mode="{mode}"' in menu
    assert 'data-bio-search-view' not in menu
    assert "Το TED είναι επίσημη πηγή" in menu

def test_source_evidence_is_preserved_without_pretending_historical_is_new():
    script=(STATIC/"bioshield-admin.js").read_text(encoding="utf-8")
    archive=(STATIC/"unified-archive.js").read_text(encoding="utf-8")
    map_module=(STATIC/"geographic-map.js").read_text(encoding="utf-8")
    assert "renderSearchArchive(pilot,esc,category)" in script
    assert "category==='ted'" in archive
    # BIO-36: historical individual posts remain in Supabase but never fill fresh search results.
    assert "x.within_14d===true" in archive
    assert "x.source_opened===true" in archive
    assert "Δεν βρέθηκαν επαληθευμένα πρόσφατα αιτήματα" in archive
    assert "Αρχειακή έρευνα" in archive
    assert "Δεν παρουσιάζονται δεδομένα cache ως ζωντανά" in archive
    assert "https://" in archive and "noopener noreferrer" in archive
    assert "searchTerm" in map_module
    assert "refreshInlineMap" not in script
    assert "setupCoverageMap(page.querySelector('[data-bio-panel=\"map\"]')" in script
    assert "effectiveFocusChoice" in script
    assert "bio-focus-gps-start" in script
    assert "data-bio-location-mode" in script

def test_private_data_remains_unavailable_and_no_new_api_routes_are_needed():
    with TestClient(app) as client:
        assert client.get("/api/bioshield/candidates").status_code==403
        assert client.post("/api/bioshield/handoff").status_code==403
        assert client.get("/api/bioshield/discovery/map").status_code==200

def test_service_filter_is_inside_search_facets_not_a_separate_results_toolbar():
    menu=(STATIC/"discovery-layout.js").read_text(encoding="utf-8").split(
        "export function discoveryFilterMenu",1)[1].split(
        "export function businessDiscoveryMarkup",1)[0]
    admin=(STATIC/"bioshield-admin.js").read_text(encoding="utf-8")
    results=admin.split("function discoveries(",1)[1].split(
        "export async function renderBioShieldAdmin",1)[0]
    assert menu.count('id="bio-ted-service"')==1
    assert menu.index('data-bio-location-mode="custom"') < menu.index('id="bio-ted-service"')
    assert menu.index('id="bio-ted-service"') < menu.index('bio-discovery-meta')
    for service in ("all","pest_control","rodent_control","disinfection","plumbing","drain_unblocking"):
        assert f'<option value="{service}">' in menu
    assert 'id="bio-ted-service"' not in results
    assert 'id="bio-ted-count"' in results
    assert "host?.querySelector('#bio-ted-service')" in admin
    assert "if(event.target.id==='bio-ted-service')filterTED();" in admin
