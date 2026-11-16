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


def test_shell_is_sticky_and_only_active_panel_is_animated():
    shell = (STATIC / "shell.css").read_text(encoding="utf-8")
    admin = (STATIC / "bioshield-admin.css").read_text(encoding="utf-8")
    navigation = (STATIC / "typed" / "navigation.js").read_text(encoding="utf-8")

    assert ".topbar{position:sticky;top:0;" in shell
    assert ".sidebar{position:sticky;top:var(--bio-shell-header-height);" in shell
    assert "overflow-y:auto;overscroll-behavior:contain" in shell
    assert "section[data-bio-panel]:not([hidden]){view-transition-name:bio-panel}" in admin
    assert "::view-transition-old(root),::view-transition-new(root){animation:none}" in admin
    assert "::view-transition-old(bio-panel){animation:" in admin
    assert "::view-transition-new(bio-panel){animation:" in admin
    assert "prefers-reduced-motion:reduce" in admin
    assert "startViewTransition(render)" in navigation
