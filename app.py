"""Standalone BioShield read-only setup preview. No PII or provider calls."""
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
        "phase":"staging_setup",
        "connection":"awaiting_external_supabase_access",
        "discovery_enabled":False,
        "contact_handoff_enabled":False,
        "metrics":{"discovered":None,"review_required":None,
                   "outreach_eligible":None,"completed_runs":None},
        "providers":[
            {"id":"firecrawl","name":"Firecrawl","status":"not_configured"},
            {"id":"tinyfish","name":"TinyFish","status":"not_configured"}
        ],
        "candidates":[],"sources":[],"runs":[],
        "contact_gate":"review_required",
        "message":"Η εξωτερική Supabase δεν έχει συνδεθεί και δεν εκτελείται συλλογή δεδομένων. Η σελίδα είναι δοκιμαστική."
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

# Publicly viewable examples are ALL fabricated and read-only; no live lead data.
from functools import lru_cache
from bioshield.fixtures import CASES
from bioshield.engine import classify
from bioshield.benchmark import report as synthetic_benchmark

@app.get("/api/bioshield/lab/cases")
def lab_cases():
    return JSONResponse({
        "version": "synthetic_v1", "synthetic_only": True,
        "count": len(CASES),
        "cases": [{
            "id": case.id, "text": case.text, "expected_request": case.expected,
            "predicted_request": (decision := classify(case.text)).is_request,
            "category": decision.category, "reason": decision.reason,
            "confidence_is_calibrated": False, "contact_eligible": False,
            "source": "synthetic_fixture",
        } for case in CASES],
    }, headers={"Cache-Control": "no-store"})

@lru_cache(maxsize=1)
def measured_lab_report():
    # One CPU-only bounded measurement per process. Does not perform HTTP calls.
    return synthetic_benchmark(1200)

@app.get("/api/bioshield/lab/report")
def lab_report():
    return JSONResponse(measured_lab_report(), headers={"Cache-Control": "no-store"})


from bioshield.real_pilot import pilot_report

@app.get("/api/bioshield/pilot/evidence")
def public_evidence_pilot():
    """Dated, read-only public evidence research, no personal contacts or network calls."""
    return JSONResponse(pilot_report(), headers={"Cache-Control":"no-store"})

app.mount("/static",StaticFiles(directory=STATIC),name="static")
