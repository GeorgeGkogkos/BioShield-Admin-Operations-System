# BioShield initial architecture

This app is independent from the GeorgeGkogkos/DST GitHub repository. Its source of truth is the dedicated BioShield-Admin-Operations-System repository.

The first-phase UI has no connected customer database, no real candidates, and no paid provider calls. It is a public setup-only preview, not an authenticated production CRM. The candidate, discovery, and handoff APIs return HTTP 403. This must remain fail-closed until verified administrator auth, legitimate processing basis, suppression and audit logging are implemented.

Next tasks: access and inspect the business-owned Supabase schema, integrations with existing APK/EXE, authorized roles, RLS; develop explicit-source search using Firecrawl and TinyFish with rate limits and credits, exact source URL, timestamps, idempotency and intention classification; human review and lawful outreach gate; review release in Linear.

Local:
pip install -r requirements-dev.txt
uvicorn app:app --host 127.0.0.1 --port 8000 --no-access-log
pytest -q

Render: Python runtime, Frankfurt, build pip install -r requirements.txt, start uvicorn app:app --host 0.0.0.0 --port $PORT --no-access-log, health /health.
Keep secrets exclusively in environment variables and never push customer data to this PUBLIC repository.
