"""Regression checks for the persistent BioShield application shell."""
from pathlib import Path

from fastapi.testclient import TestClient
from app import app


STATIC = Path(__file__).resolve().parents[1] / "static"
client = TestClient(app)


def test_deep_links_share_one_persistent_header_sidebar_and_app_mount():
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
        assert html.count('class="topbar"') == 1
        assert html.count('class="sidebar"') == 1
        assert html.count('id="app"') == 1
        assert html.index('class="topbar"') < html.index('class="sidebar"') < html.index('id="app"')


def test_shell_is_sticky_and_panel_animations_cannot_overlay_header():
    shell = (STATIC / "shell.css").read_text(encoding="utf-8")
    admin = (STATIC / "bioshield-admin.css").read_text(encoding="utf-8")
    navigation = (STATIC / "typed" / "navigation.js").read_text(encoding="utf-8")
    typed_navigation = (STATIC.parent / "src" / "navigation.ts").read_text(encoding="utf-8")

    assert ".topbar{position:sticky;top:0;z-index:50;" in shell
    assert ".sidebar{position:sticky;top:var(--bio-shell-header-height);" in shell
    assert "overflow-y:auto;overscroll-behavior:contain" in shell
    assert "#content{position:relative;z-index:0;isolation:isolate;overflow-x:clip}" in shell

    # Browser View Transition snapshots are painted on top of the document;
    # z-index of sticky chrome cannot stop them from covering the header.
    assert "::view-transition-" not in admin
    assert "view-transition-name:" not in admin
    for source in (navigation, typed_navigation):
        assert "startViewTransition" not in source
        assert "render();" in source

    # Animate only real, in-flow visible panels; preserve no-motion behavior.
    assert ".bio-page section[data-bio-panel]:not([hidden]){" in admin
    assert "animation:bio-panel-enter 220ms ease-out both" in admin
    assert "from{opacity:0}" in admin and "to{opacity:1}" in admin
    assert "transform:translateY(8px)" not in admin
    assert "window.scrollTo(0,0)" in navigation
    assert "window.scrollTo(0,0)" in typed_navigation
    assert "window.history.scrollRestoration='manual'" in navigation
    app_js = (STATIC / "app.js").read_text(encoding="utf-8")
    assert "focus({preventScroll:true})" in app_js
    assert "@media(prefers-reduced-motion:reduce)" in admin
    assert ".bio-page section[data-bio-panel]:not([hidden]){animation:none}" in admin
    compact = "".join(navigation.split())
    assert "window.addEventListener('popstate',onPop)" in compact
    assert "shellNavigation?.addEventListener('click',onClick)" in compact
