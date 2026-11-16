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
        assert html.count('class="topbar bio-is-loading"') == 1
        assert html.count('class="sidebar"') == 1
        assert html.count('id="app"') == 1
        assert html.index('class="topbar bio-is-loading"') < html.index('class="sidebar"') < html.index('id="app"')


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
    assert "animation:bio-panel-enter 250ms cubic-bezier(.2,.7,.25,1) both" in admin
    assert "from{opacity:0;transform:translateY(9px)}" in admin
    assert "to{opacity:1;transform:translateY(0)}" in admin
    assert "oldPanel.animate([" in navigation and "oldPanel.animate([" in typed_navigation
    assert "duration:145" in navigation and "duration:145" in typed_navigation
    assert "animation.finished.then(finish,finish)" in navigation
    assert "animation.finished.then(finish,finish)" in typed_navigation
    # TypeScript build formats whitespace differently from the checked-in JS.
    for source in (navigation, typed_navigation):
        minified = "".join(source.split())
        assert "window.scrollTo(0,0)" in minified
        assert "window.history.scrollRestoration='manual'" in minified
    app_js = (STATIC / "app.js").read_text(encoding="utf-8")
    assert "focus({preventScroll:true})" in app_js
    assert "@media(prefers-reduced-motion:reduce)" in admin
    assert ".bio-page section[data-bio-panel]:not([hidden]){animation:none}" in admin
    compact = "".join(navigation.split())
    assert "window.addEventListener('popstate',onPop)" in compact
    assert "shellNavigation?.addEventListener('click',onClick)" in compact
