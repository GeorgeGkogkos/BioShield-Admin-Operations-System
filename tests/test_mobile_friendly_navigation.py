"""BIO-34: one mobile search destination with secondary diagnostic access."""
from pathlib import Path
import re

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


def test_phone_bottom_navigation_contains_only_the_unified_search(): 
    html = client.get("/admin/operations/overview").text
    assert html.count('id="bio-bottom-nav"') == 1
    assert 'aria-label="Κεντρική αναζήτηση"' in html
    assert html.count('class="bottom-link" data-bio-tab=') == 1
    assert 'class="bottom-link" data-bio-tab="discovery" href="/admin/operations/discovery"' in html
    for screen in ('overview','pilot','map','sources','status'):
        assert f'class="bottom-link" data-bio-tab="{screen}"' not in html
    css = (STATIC / "shell.css").read_text(encoding="utf-8")
    assert ".mobile-bottom-nav{display:none}" in css
    assert "@media(max-width:700px)" in css
    assert "grid-template-columns:minmax(0,1fr);justify-items:center" in css
    assert "env(safe-area-inset-bottom,0px)" in css
    assert '.bottom-link[aria-current="page"]' in css


def test_bottom_nav_routes_without_full_page_refresh_and_stays_selected():
    for file in (ROOT / "src" / "navigation.ts",
                 STATIC / "typed" / "navigation.js"):
        code = file.read_text(encoding="utf-8")
        assert re.search(r"const bottomNavigation\s*=\s*document.getElementById\('bio-bottom-nav'\)", code)
        assert "bottomNavigation?.contains(nav)" in code
        assert re.search(r"bottomNavigation\?\.addEventListener\('click',\s*onClick\)", code)
        assert re.search(r"bottomNavigation\?\.removeEventListener\('click',\s*onClick\)", code)
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


def test_touch_press_has_no_webkit_halo_and_keyboard_focus_remains_visible():
    css = (STATIC / "shell.css").read_text(encoding="utf-8")
    # Chrome for Android paints a bright blue tap flash unless explicitly disabled.
    assert 'a,button,[role="button"]{-webkit-tap-highlight-color:transparent}' in css
    assert 'button:focus:not(:focus-visible)' in css
    # Keep discoverable focus styling for keyboard and assistive-navigation users.
    assert '.mobile-menu-toggle:focus-visible' in css
    assert '.bottom-link:focus-visible' in css


def test_phone_hides_redundant_drawer_but_keeps_all_destinations_accessible():
    """Phones use the persistent bottom nav; tablets still get a drawer."""
    html = client.get("/admin/operations/overview").text
    css = (STATIC / "shell.css").read_text(encoding="utf-8")
    js = (STATIC / "app.js").read_text(encoding="utf-8")
    assert "const drawerViewport=window.matchMedia('(min-width: 701px) and (max-width: 960px)')" in js
    assert "const visible=Boolean(open && drawerViewport.matches)" in js
    assert "drawerViewport.addEventListener('change',()=>setMenuOpen(false))" in js
    phone_rules = css.split("/* Phone navigation is entirely handled", 1)[1]
    assert "@media(max-width:700px)" in phone_rules
    assert ".tools .mobile-menu-toggle{display:none}" in phone_rules
    assert ".bio-mobile-nav-open .sidebar,.bio-mobile-nav-open .sidebar-backdrop{display:none}" in phone_rules
    assert ".mobile-project-links{display:none}" in css
    assert 'class="mobile-project-links" aria-label="Σύνδεσμοι έργου"' in html
    # The drawer's external destinations must still be reachable on a phone.
    footer_links = html.split('class="mobile-project-links"', 1)[1].split("</nav>", 1)[0]
    for label in ("Linear Tasks", "GitHub", "DST Workspace"):
        assert label in footer_links
    # One primary bottom action; system sources and status remain secondary links.
    assert html.count('class="bottom-link" data-bio-tab=') == 1
    assert 'href="/admin/operations/status" data-bio-tab="status"' in html
    assert 'href="/admin/operations/sources" data-bio-tab="sources"' in html
