"""Standalone BioShield public-source discovery preview. No PII or outreach."""
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
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
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self';"
        " img-src 'self' data: https://tile.openstreetmap.org; object-src 'none'; base-uri 'none'; frame-ancestors 'none';"
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

# Distinct deep-linkable pages; the typed client router maintains transitions.
# These are read-only public-source admin previews, not authenticated CRM pages.
OPERATIONS_PAGES = frozenset({
    "overview", "discovery", "evidence", "map", "sources"
})

@app.get("/admin/operations/{page}", include_in_schema=False)
@app.get("/admin/operations/{page}/", include_in_schema=False)
def operations_page(page: str):
    if page not in OPERATIONS_PAGES:
        raise HTTPException(404, "Unknown BioShield page")
    return FileResponse(STATIC / "index.html", headers={"Cache-Control":"no-store"})

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
            {"id":"google_alerts","name":"Google Alerts","status":"awaiting_feed_configuration"},
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

# BIO-20: Google Alerts never returns source excerpts, private feed URLs, or contact leads.
from bioshield.google_alerts import alerts_status

@app.get("/api/bioshield/discovery/google-alerts")
def google_alerts_source_health():
    return JSONResponse(alerts_status(), headers={"Cache-Control": "no-store"})

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
        "google_alerts": {"status": alerts_status().get("status"), "confirmed_contactable_leads": 0},
        "private_lead_intake": "disabled",
        "outreach": "disabled",
        "synthetic_requests": 0,
    }, headers={"Cache-Control": "no-store"})

# BIO-20 read-only, bounded official procurement focus and actual heartbeat.
from bioshield.focused_discovery import focused_report
from bioshield.geographic_focus import LOCATIONS, location_policy
from bioshield.automation_status import get_schedule_heartbeat

OFFICIAL_GREEK_SOURCES = [
    {"id":"kimdis","name":"ΚΗΜΔΗΣ — Δημοσιότητα Δημοσίων Συμβάσεων",
     "url":"https://portal.eprocurement.gov.gr/esidisportal/",
     "status":"verified_official_public_search",
     "automated_ingestion":False,
     "notes":"Επίσημη αναζήτηση και Open Data API αναφέρονται στην πύλη ΕΣΗΔΗΣ. Όχι ακόμη πραγματική σύνδεση στο BioShield."},
    {"id":"esidis_services","name":"ΕΣΗΔΗΣ — Προμήθειες & Υπηρεσίες",
     "url":"https://nepps-search.eprocurement.gov.gr/actSearch/faces/active_search_main.jspx",
     "status":"verified_official_public_search",
     "automated_ingestion":False,
     "notes":"Αναζήτηση διαγωνισμών υπηρεσιών. Χωρίς ενεργό API connector."},
    {"id":"esidis_works","name":"ΕΣΗΔΗΣ — Δημόσια Έργα",
     "url":"https://portal.eprocurement.gov.gr/esidisportal/",
     "status":"verified_official_public_search",
     "automated_ingestion":False,
     "notes":"Διαγωνισμοί έργων και τεχνικών υπηρεσιών. Όχι ενεργός crawler."},
    {"id":"diavgeia","name":"Διαύγεια — Πράξεις δημόσιας διοίκησης",
     "url":"https://diavgeia.gov.gr/search",
     "status":"partial_search_only_by_ADA_2026_11_16",
     "automated_ingestion":False,
     "notes":"Στις 16/11/2026 η επίσημη σελίδα αναφέρει προσωρινή αναζήτηση μόνο με ΑΔΑ."},
]

@app.get("/api/bioshield/discovery/official-sources")
def official_sources():
    return JSONResponse({"providers":OFFICIAL_GREEK_SOURCES,
                         "active_non_ted_providers":0,
                         "status":"verified_official_pages_pending_integration"},
                        headers={"Cache-Control":"no-store"})

@app.get("/api/bioshield/discovery/heartbeat")
def discovery_heartbeat():
    return JSONResponse(get_schedule_heartbeat(),headers={"Cache-Control":"no-store"})

@app.get("/api/bioshield/discovery/focused")
def focused_search(home: str = Query(default="ilion",max_length=20),
                   temporary: str = Query(default="",max_length=20)):
    if home not in LOCATIONS or (temporary and temporary not in LOCATIONS):
        raise HTTPException(422,"Unsupported coarse region")
    return JSONResponse(focused_report(home=home,temporary=temporary),
                        headers={"Cache-Control":"no-store"})

@app.get("/api/bioshield/discovery/manual")
def manual_official_search(home: str = Query(default="ilion",max_length=20),
                           temporary: str = Query(default="",max_length=20)):
    if home not in LOCATIONS or (temporary and temporary not in LOCATIONS):
        raise HTTPException(422,"Unsupported coarse region")
    result=focused_report(home=home,temporary=temporary,force=True)
    if result["status"]=="rate_limited":
        return JSONResponse(result,status_code=429,
                            headers={"Cache-Control":"no-store","Retry-After":str(result["retry_after_seconds"])})
    national=live_ted_report(force=True)
    return JSONResponse({"status":"ok" if result["status"]=="ok" or national["status"]=="ok" else "unavailable",
                         "manual_executed":True,"focused":result,"national":national,
                         "selected_temporary_region":temporary,
                         "notes":"Only bounded official TED queries, never social crawling, outreach or any private location storage."},
                        headers={"Cache-Control":"no-store"})

# Read-only, explicitly unlicensed Perplexity keyword/provider research metadata.
# It does NOT trigger social crawling, outreach or collect private contacts.
from bioshield.research_catalog import public_research_config

@app.get("/api/bioshield/research/config")
def read_only_search_research_config():
    return JSONResponse(public_research_config(),
                        headers={"Cache-Control":"no-store"})

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
