"""BIO-25: successful Supabase polling updates values, not the whole panel."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_refresh_keeps_controls_and_prior_snapshot_visible():
    script = (ROOT / "static" / "bioshield-admin.js").read_text(encoding="utf-8")
    refresh = script.split("async function refreshPilot(){", 1)[1].split("function filterTED(){", 1)[0]

    assert "showLoadingOverlay(pilotPanel" not in refresh
    assert "if(pilotBusy||!page.isConnected)return" in refresh
    assert "if(pilot.demo_supabase_connected===true)" in refresh
    assert "patchPilot(next)" in refresh
    # Rebuilding markup is permitted only for first-load recovery from offline.
    assert "else{\n        // Recover from a first-load offline state" in refresh
    assert "pilotPanel.innerHTML=renderPublicPilot(next,esc)" in refresh
    assert "pilot=next" in refresh  # only after the verified response has rendered
    assert "filterPilot()" in refresh
    assert "warning.setAttribute('role','alert')" in refresh
    assert "τελευταία επιτυχώς φορτωμένα δεδομένα" in refresh


def test_stats_and_changed_rows_are_updated_in_place():
    script = (ROOT / "static" / "bioshield-admin.js").read_text(encoding="utf-8")
    pilot = (ROOT / "static" / "real-pilot.js").read_text(encoding="utf-8")
    update = script.split("function patchPilot(next){", 1)[1].split("let pilotBusy=false", 1)[0]

    assert "preview.innerHTML=renderPublicPilot(next,esc)" in update
    assert "for(const incoming of preview.querySelectorAll('[data-live-stat]'))" in update
    assert "if(current&&incoming&&current.innerHTML!==incoming.innerHTML)" in update
    assert "current.innerHTML=incoming.innerHTML" in update
    assert "if(business&&updatedBusiness&&business.innerHTML!==updatedBusiness.innerHTML)" in update
    assert "#bio-sources-overview" in update
    assert "#bio-overview-segments strong" in update
    assert "pilotPanel.innerHTML=" not in update

    for marker in (
        "fetched-at", "as-of", "segment-individual", "segment-public",
        "segment-business", "segment-review", "private-recent",
        "reddit-summary", "sources-summary", "public-heading", "reddit-heading",
    ):
        assert f'data-live-stat="{marker}"' in pilot

    assert "data-pilot-section" in pilot
    assert "data-pilot-row" in pilot


def test_auto_polling_remains_conditional_and_nonblocking():
    script = (ROOT / "static" / "bioshield-admin.js").read_text(encoding="utf-8")
    assert "},30000);" in script
    assert "if(!document.hidden)" in script
    assert "if((archive&&!archive.hidden)||(discovery&&!discovery.hidden))void refreshPilot()" in script
    assert "button.setAttribute('aria-busy','true')" in script
    assert "currentButton.removeAttribute('aria-busy')" in script
