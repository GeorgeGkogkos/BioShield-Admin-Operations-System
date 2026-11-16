"""BIO-35: preserve other pages and replace only New + Findings with Search."""
import re
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
    "status": "/admin/operations/status",
}


def test_vertical_navigation_is_in_shared_shell_not_screen_workspace():
    html = client.get("/admin/operations/overview").text
    assert html.count('id="bio-shell-nav"') == 1
    assert html.index('id="bio-sidebar"') < html.index('id="bio-shell-nav"') < html.index('id="app"')
    assert '<nav id="bio-shell-nav" class="side-pages"' in html
    assert html.count('href="/admin/operations/discovery" data-bio-tab="discovery"') == 1
    for path in ROUTES.values():
        assert client.get(path).status_code == 200
    for screen in ('overview','discovery','map','sources','status'):
        assert f'data-bio-tab="{screen}"' in html
    assert 'data-bio-tab="pilot"' not in html

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
        assert re.search(r"shellNavigation\?\.addEventListener\('click',\s*onClick\)", source)
        assert re.search(r"shellNavigation\?\.removeEventListener\('click',\s*onClick\)", source)
        assert "window.history.pushState" in source
        assert re.search(r"window\.addEventListener\('popstate',\s*onPop\)", source)


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
    assert "const initialScreen=currentScreen()" in js
    assert "link.dataset.bioTab===initialScreen" in js
    assert "event.key==='Escape'" in js
    assert "event.target.closest('[data-bio-tab]')" in js
    assert "mobileViewport.addEventListener('change',()=>setMenuOpen(false))" in js



def test_sidebar_visual_polish_is_flat_compact_and_not_duplicated():
    html = client.get("/admin/operations/overview").text
    shell = (STATIC / "shell.css").read_text(encoding="utf-8")
    admin = (STATIC / "bioshield-admin.js").read_text(encoding="utf-8")

    # Only the selected real page is highlighted; no second dashboard tile.
    assert 'class="workspace-home"' not in html
    assert 'class="side-info"' not in html
    assert "Privacy first" not in html
    assert '<nav id="bio-shell-nav" class="side-pages"' in html
    assert html.count('class="side-icon"') == 7
    assert html.count('class="side-project-link"') == 2
    assert html.index('class="sidebar-primary"') < html.index('class="sidebar-secondary"')
    assert "Operations Dashboard" not in html
    # Preserve the original section hierarchy, merging just the two data-list tabs.
    desktop_nav = html.split('id="bio-shell-nav"', 1)[1].split("</nav>", 1)[0]
    phone_nav = html.split('id="bio-bottom-nav"', 1)[1].split("</nav>", 1)[0]
    for screen in ('overview','discovery','map','sources','status'):
        assert desktop_nav.count(f'data-bio-tab="{screen}"')==1
        assert phone_nav.count(f'data-bio-tab="{screen}"')==(0 if screen=='status' else 1)
    assert 'data-bio-tab="pilot"' not in desktop_nav
    assert 'data-bio-tab="pilot"' not in phone_nav
    assert "link.setAttribute('aria-current','page')" in admin

    # The navigation remains grouped and scrollable if the viewport is short.
    assert "grid-template-columns:256px minmax(0,1fr)" in shell
    assert ".side-pages{display:flex;flex-direction:column;gap:3px;padding:0;margin:0}" in shell
    assert "scrollbar-width:thin" in shell
    assert ".sidebar::-webkit-scrollbar{width:5px}" in shell
    assert ".sidebar .side-pages a[aria-current=\"page\"]" in shell
    assert "box-shadow:inset 3px 0 0 var(--accent)" not in shell
