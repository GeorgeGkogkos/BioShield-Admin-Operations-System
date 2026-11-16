"""Standalone BioShield public-source discovery preview. No PII or outreach."""
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

STATIC = Path(__file__).resolve().parent / "static"
app = FastAPI(title="BioShield Admin Operations",docs_url=None,redoc_url=None,openapi_url=None)

@app.middleware("http")
async def protect(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self';"
        " img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none';"
        " form-action 'none'"
    )
    if request.url.path.startswith(("/api/", "/admin/")):
        response.headers["Cache-Control"] = "no-store"
    return response

@app.get("/",include_in_schema=False)
def home():
    return RedirectResponse("/admin/operations",status_code=307)

@app.get("/admin/operations",include_in_schema=False)
@app.get("/admin/operations/",include_in_schema=False)
def operations():
    return FileResponse(STATIC/"index.html",headers={"Cache-Control":"no-store"})

@app.get("/health")
def health():
    return {"status":"ok","application":"bioshield-admin-operations"}

@app.get("/api/bioshield/overview")
def overview():
    return JSONResponse({
        "project":"BioShield Admin Operations System",
        "phase":"real_public_source_discovery",
        "connection":"awaiting_external_supabase_access",
        "discovery_enabled":True,
        "contact_handoff_enabled":False,
        "metrics":{"discovered":None,"review_required":None,
                   "outreach_eligible":None,"completed_runs":None},
        "providers":[
            {"id":"ted","name":"EU TED","status":"enabled_public_notices"},
            {"id":"reddit","name":"Reddit","status":"commercial_approval_required"},
            {"id":"facebook","name":"Facebook","status":"permission_required"},
            {"id":"instagram","name":"Instagram","status":"permission_required"},
            {"id":"tiktok","name":"TikTok","status":"approved_access_required"},
            {"id":"independent_forums","name":"Ελληνικά forums","status":"permission_review_required"}
        ],
        "candidates":[],"sources":[],"runs":[],
        "contact_gate":"review_required",
        "message":"Η εταιρική Supabase δεν έχει συνδεθεί. Οι δημόσιες προκηρύξεις αναζητούνται από το επίσημο TED API. Οι ιδιωτικοί υποψήφιοι παραμένουν απενεργοποιημένοι."
    },headers={"Cache-Control":"no-store"})

@app.get("/api/bioshield/candidates")
def candidates():
    raise HTTPException(403,"Private leads require verified administrator authentication")

@app.post("/api/bioshield/discover")
def discover():
    raise HTTPException(403,"Discovery is disabled until provider and source-policy review")

@app.post("/api/bioshield/handoff")
def handoff():
    raise HTTPException(403,"Call-center handoff is disabled until legal and human review")

# Real public-source discovery, no invented entries and no private contacts.
from bioshield.ted_discovery import live_ted_report
from bioshield.geographic_coverage import coverage_report

@app.get("/api/bioshield/discovery/map")
def public_geographic_coverage():
    # No arbitrary URLs, no private addresses; same verified TED official metadata.
    return JSONResponse(coverage_report(live_ted_report()),
                        headers={"Cache-Control":"no-store"})

@app.get("/api/bioshield/discovery/tenders")
def public_tender_discovery():
    """Bounded, cached official TED query; never accepts user URLs."""
    return JSONResponse(live_ted_report(), headers={"Cache-Control": "no-store"})

@app.get("/api/bioshield/discovery/providers")
def source_provider_status():
    return JSONResponse({
        "official_ted": {
            "status": "enabled",
            "description": "EU official public procurement notices (query on dashboard load, cached up to 15 min)",
            "automated_snapshots": "GitHub Actions scheduled hourly at minute 17",
        },
        "reddit": {
            "status": "blocked_pending_permission",
            "description": "Commercial automated Reddit data access requires Reddit approval; RSS ended Nov 13 2026.",
        },
        "private_lead_intake": "disabled",
        "outreach": "disabled",
        "synthetic_requests": 0,
    }, headers={"Cache-Control": "no-store"})

# Public source provenance and legal/technical readiness (no provider access tokens).
from bioshield.source_policy import SERVICE_LABELS, source_status

@app.get("/api/bioshield/services")
def supported_services():
    return JSONResponse({"version": "bio16_services_v1", "services": SERVICE_LABELS},
                        headers={"Cache-Control":"no-store"})

@app.get("/api/bioshield/discovery/sources")
def public_source_policy():
    return JSONResponse(source_status(), headers={"Cache-Control":"no-store"})

# Only public, anonymized, read-only demo metadata from the isolated second account.
# The business-owned Supabase remains disconnected and private lead endpoints remain 403.
from bioshield.demo_db import DemoDatabaseUnavailable, fetch_public_demo

@app.get("/api/bioshield/demo/evidence")
def second_account_demo_evidence():
    try:
        payload = fetch_public_demo()
    except DemoDatabaseUnavailable:
        raise HTTPException(503, "Independent demo database unavailable; no cached real leads")
    return JSONResponse(payload, headers={"Cache-Control": "no-store"})

app.mount("/static",StaticFiles(directory=STATIC),name="static")
