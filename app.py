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

app.mount("/static",StaticFiles(directory=STATIC),name="static")
