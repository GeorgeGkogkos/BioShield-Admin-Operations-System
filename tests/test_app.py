from fastapi.testclient import TestClient
from app import app

client=TestClient(app)

def test_health():
    response=client.get("/health")
    assert response.status_code==200
    assert response.json()["application"]=="bioshield-admin-operations"

def test_admin_preview_is_read_only():
    response=client.get("/admin/operations")
    assert response.status_code==200
    assert "BioShield" in response.text
    assert response.headers["cache-control"]=="no-store"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert response.headers["x-robots-tag"]=="noindex, nofollow"

def test_overview_unknown_counts_and_no_leads():
    response=client.get("/api/bioshield/overview")
    assert response.status_code==200
    data=response.json()
    assert data["connection"]=="awaiting_external_supabase_access"
    assert data["discovery_enabled"] is True
    assert data["contact_handoff_enabled"] is False
    assert all(value is None for value in data["metrics"].values())
    assert data["candidates"]==[] and data["sources"]==[]
    assert data["providers"][0]["id"]=="ted"
    assert response.headers["cache-control"]=="no-store"

def test_private_apis_fail_closed():
    assert client.get("/api/bioshield/candidates").status_code==403
    assert client.post("/api/bioshield/discover").status_code==403
    assert client.post("/api/bioshield/handoff").status_code==403

def test_no_synthetic_or_legacy_public_demo_routes():
    assert client.get("/api/bioshield/lab/cases").status_code==404
    assert client.get("/api/bioshield/lab/report").status_code==404
    assert client.get("/api/bioshield/pilot/evidence").status_code==404

def test_discovery_provider_status_is_honest():
    data=client.get("/api/bioshield/discovery/providers").json()
    assert data["official_ted"]["status"]=="enabled"
    assert data["reddit"]["status"]=="blocked_pending_permission"
    assert data["synthetic_requests"]==0
    assert data["private_lead_intake"]=="disabled"

def test_no_api_docs():
    assert client.get("/docs").status_code==404
    assert client.get("/openapi.json").status_code==404
