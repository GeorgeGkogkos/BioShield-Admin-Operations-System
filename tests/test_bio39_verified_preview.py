"""BIO-39: verified request preview must not expose identities or fake results."""
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app import app
from bioshield.verified_public_preview import preview_from_rows, PreviewUnavailable
import pytest

def safe_row(d=None):
    return {
      "requester_type": "individual",
      "service_category": "drain_unblocking",
      "broad_area": "Περιστέρι",
      "original_posted_on": (d or date(2026,11,15)).isoformat(),
      "fulfillment_status": "unknown",
    }

def test_empty_database_is_zero_not_fake_leads():
    out=preview_from_rows([],today=date(2026,11,17))
    assert out["status"]=="ok" and out["count"]==0 and out["requests"]==[]
    assert out["contactable_leads"]==0

def test_minimal_preview_and_strict_window():
    row=safe_row()
    row["canonical_url"]="https://social.example/post/user123"
    row["short_need_summary"]="private example user email"
    result=preview_from_rows([row],today=date(2026,11,17))
    assert result["count"]==1
    assert result["requests"][0]["contact_eligible"] is False
    assert "canonical_url" not in str(result)
    assert "private example" not in str(result)
    with pytest.raises(PreviewUnavailable):
        preview_from_rows([safe_row(date(2026,10,1))],today=date(2026,11,17))
    with pytest.raises(PreviewUnavailable):
        preview_from_rows([safe_row(date(2026,11,18))],today=date(2026,11,17))

def test_invalid_public_category_rejected():
    row=safe_row()
    row["broad_area"]="Athens 12 Example Street"
    with pytest.raises(PreviewUnavailable):preview_from_rows([row],today=date(2026,11,17))

def test_not_configured_is_failure_not_empty(monkeypatch):
    monkeypatch.delenv("BIOSHIELD_DEMO_SUPABASE_URL",raising=False)
    monkeypatch.delenv("BIOSHIELD_DEMO_SUPABASE_PUBLISHABLE_KEY",raising=False)
    with TestClient(app) as c:
      assert c.get("/api/bioshield/discovery/verified-requests").status_code==503
      assert c.get("/api/bioshield/candidates").status_code==403

def test_ui_has_redacted_integrated_list():
    from pathlib import Path
    root=Path(__file__).resolve().parents[1]
    admin=(root/"static/bioshield-admin.js").read_text()
    rendered=(root/"static/verified-requests.js").read_text()
    assert "/bioshield/discovery/verified-requests" in admin
    assert "renderVerifiedRequests" in admin
    assert 'id="bio-verified-requests"' in admin
    assert "data-bio-verified-row" in rendered
    assert "canonical_url" not in rendered
    assert "source_url" not in rendered
