"""BIO mobile navigation: maintain same routes across responsive app shell."""
from pathlib import Path

from fastapi.testclient import TestClient

from app import app

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
client = TestClient(app)

ROUTES = {
    "overview": "/admin/operations/overview",
    "discovery": "/admin/operations/discovery",
    "pilot": "/admin/operations/evidence",
    "map": "/admin/operations/map",
    "sources": "/admin/operations/sources",
}


def test_phone_bottom_navigation_contains_all_five_bookmarkable_routes():
    html = client.get("/admin/operations/overview").text
    assert html.count('id="bio-bottom-nav"') == 1
    assert 'aria-label="Γρήγορη πλοήγηση"' in html
    for screen, path in ROUTES.items():
        assert f'class="bottom-link" data-bio-tab="{screen}" href="{path}"' in html
        # The desktop/sidebar original links stay unchanged.
        assert f'href="{path}" data-bio-tab="{screen}"' in html
    css = (STATIC / "shell.css").read_text(encoding="utf-8")
    assert ".mobile-bottom-nav{display:none}" in css
    assert "@media(max-width:700px)" in css
    assert "grid-template-columns:repeat(5,minmax(0,1fr))" in css
    assert "env(safe-area-inset-bottom,0px)" in css
    assert '.bottom-link[aria-current="page"]' in css


def test_bottom_nav_routes_without_full_page_refresh_and_stays_selected():
    for file in (ROOT / "src" / "navigation.ts",
                 STATIC / "typed" / "navigation.js"):
        code = file.read_text(encoding="utf-8")
        assert "const bottomNavigation=document.getElementById('bio-bottom-nav')" in code
        assert "bottomNavigation?.contains(nav)" in code
        assert "bottomNavigation?.addEventListener('click',onClick)" in code
        assert "bottomNavigation?.removeEventListener('click',onClick)" in code
        assert "window.history.pushState" in code

    for file in (STATIC / "app.js", STATIC / "bioshield-admin.js"):
        code = file.read_text(encoding="utf-8")
        assert "document.querySelectorAll('#bio-bottom-nav [data-bio-tab]')" in code
        assert "link.setAttribute('aria-current','page')" in code


def test_drawer_has_close_button_focus_management_and_background_lock():
    html = client.get("/admin/operations").text
    assert 'id="bio-mobile-menu-close"' in html
    assert 'class="sidebar-mobile-heading"' in html
    css = (STATIC / "shell.css").read_text(encoding="utf-8")
    assert ".bio-mobile-nav-open .sidebar" in css
    assert ".bio-mobile-nav-open .sidebar-backdrop" in css
    js = (STATIC / "app.js").read_text(encoding="utf-8")
    assert "menuSidebar.inert=mobileViewport.matches && !visible" in js
    assert "menuSidebar.setAttribute('aria-modal',String(visible))" in js
    assert "menuClose.addEventListener('click',()=>setMenuOpen(false))" in js
    assert "event.key==='Escape'" in js
    assert "event.key!=='Tab'" in js
    assert "menuSidebar.querySelectorAll('a[href],button:not([disabled])')" in js
