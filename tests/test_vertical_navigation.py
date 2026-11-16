"""BIO-23: the five internal routes live in the persistent sidebar."""
from pathlib import Path

from fastapi.testclient import TestClient

from app import app


STATIC = Path(__file__).resolve().parents[1] / "static"
client = TestClient(app)

ROUTES = {
    "overview": "/admin/operations/overview",
    "discovery": "/admin/operations/discovery",
    "pilot": "/admin/operations/evidence",
    "map": "/admin/operations/map",
    "sources": "/admin/operations/sources",
}


def test_vertical_navigation_is_in_shared_shell_not_screen_workspace():
    html = client.get("/admin/operations/overview").text
    assert html.count('id="bio-shell-nav"') == 1
    assert html.index('id="bio-sidebar"') < html.index('id="bio-shell-nav"') < html.index('id="app"')
    assert '<nav id="bio-shell-nav" class="side-pages"' in html
    for screen, path in ROUTES.items():
        assert html.count(f'href="{path}" data-bio-tab="{screen}"') == 1
        assert client.get(path).status_code == 200

    admin_js = (STATIC / "bioshield-admin.js").read_text(encoding="utf-8")
    assert '<nav class="bio-tabs"' not in admin_js
    assert "document.querySelectorAll('#bio-shell-nav [data-bio-tab]')" in admin_js
    assert "link.setAttribute('aria-current','page')" in admin_js
    assert "else link.removeAttribute('aria-current')" in admin_js


def test_sidebar_router_handles_shell_links_and_preserves_deep_links():
    ts = (Path(__file__).resolve().parents[1] / "src" / "navigation.ts").read_text(encoding="utf-8")
    js = (STATIC / "typed" / "navigation.js").read_text(encoding="utf-8")
    for source in (ts, js):
        assert "document.getElementById('bio-shell-nav')" in source
        assert "shellNavigation?.contains(nav)" in source
        assert "shellNavigation?.addEventListener('click',onClick)" in source
        assert "shellNavigation?.removeEventListener('click',onClick)" in source
        assert "window.history.pushState" in source
        assert "window.addEventListener('popstate',onPop)" in source


def test_small_screens_have_accessible_app_shell_drawer():
    html = client.get("/admin/operations").text
    css = (STATIC / "shell.css").read_text(encoding="utf-8")
    js = (STATIC / "app.js").read_text(encoding="utf-8")

    assert 'id="bio-mobile-menu-toggle"' in html
    assert 'aria-controls="bio-sidebar" aria-expanded="false"' in html
    assert 'id="bio-sidebar-backdrop"' in html
    assert ".side-pages{display:flex;flex-direction:column" in css
    assert ".bio-mobile-nav-open .sidebar{display:flex;position:fixed" in css
    assert ".bio-mobile-nav-open .sidebar-backdrop{display:block;position:fixed" in css
    assert "menuToggle.setAttribute('aria-expanded',String(visible))" in js
    assert "event.key==='Escape'" in js
    assert "event.target.closest('[data-bio-tab]')" in js
    assert "mobileViewport.addEventListener('change',()=>setMenuOpen(false))" in js
