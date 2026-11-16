"""BIO-28: only the persistent app header displays the branded initial load state."""
from pathlib import Path

from fastapi.testclient import TestClient

from app import app


ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_one_company_brand_and_one_header_loading_status_on_every_route():
    routes = [
        "/admin/operations",
        "/admin/operations/overview",
        "/admin/operations/discovery",
        "/admin/operations/evidence",
        "/admin/operations/map",
        "/admin/operations/sources",
    ]
    for route in routes:
        response = client.get(route)
        assert response.status_code == 200
        html = response.text
        assert html.count('class="brand-logo"') == 1
        assert html.count('id="bio-header-loading"') == 1
        assert 'class="topbar bio-is-loading"' in html
        assert 'role="status" aria-live="polite"' in html
        assert "Φόρτωση πραγματικών δεδομένων" in html
        assert 'class="bio-header-loading-spinner"' in html
        assert "bio-start-loader" not in html
        assert "bio-logo-pulse" not in html
        assert "bio-skeleton-brand" not in html
        assert html.index('id="bio-header-loading"') < html.index('id="content"')


def test_initial_skeleton_keeps_data_placeholders_but_no_duplicate_header_or_tabs():
    for path in (ROOT / "src" / "skeleton.ts", ROOT / "static" / "typed" / "skeleton.js"):
        code = path.read_text(encoding="utf-8")
        assert "pageSkeleton(" in code
        assert "skeletonCards(4)" in code
        assert "skeletonRows(4)" in code
        assert "bio-skeleton-brand" not in code
        assert "bio-skeleton-tabs" not in code
        assert "bioshield-company-logo.png" not in code

    js = (ROOT / "static" / "bioshield-admin.js").read_text(encoding="utf-8")
    assert "page.innerHTML=pageSkeleton(window.location.pathname)" in js
    assert "brandedLoader()" not in js


def test_busy_state_is_local_to_header_and_clears_on_success_or_failure():
    css = (ROOT / "static" / "shell.css").read_text(encoding="utf-8")
    app_js = (ROOT / "static" / "app.js").read_text(encoding="utf-8")
    ui_css = (ROOT / "static" / "bioshield-admin.css").read_text(encoding="utf-8")

    assert ".topbar.bio-is-loading .bio-header-research-slot>.status{display:none}" in css
    assert ".topbar.bio-is-loading .bio-header-loading{display:inline-flex}" in css
    assert "@media(max-width:1170px)" in css
    assert "@media(prefers-reduced-motion:reduce){.bio-header-loading-spinner{animation:none" in css
    assert "renderBioShieldAdmin(appMount,{api,esc}).catch(error=>" in app_js
    assert "appMount.innerHTML=" in app_js
    assert "role=\\\"alert\\\"" in app_js or 'role="alert"' in app_js
    assert "}).finally(()=>{" in app_js
    assert "classList.remove('bio-is-loading')" in app_js
    assert "bio-initial-load-error" in ui_css
    assert "bio-start-loader" not in ui_css
