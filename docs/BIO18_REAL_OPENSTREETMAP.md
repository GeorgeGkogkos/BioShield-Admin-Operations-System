# BIO-18 — Genuine OpenStreetMap geographic interface

## Why this change was necessary
The previous coarse SVG silhouette of Greece was an unacceptable stand-in for an interactive map. It was built from simplified national boundary geometry, omitted most islands/road networks, and appeared visibly distorted. The user supplied a screenshot and asked to replace it with a proper map. This release replaces the silhouette, not just its colors.

## Implementation
- Leaflet assets are **self-hosted** as `/static/vendor/leaflet.js` and `/static/vendor/leaflet.css` and bundled with the upstream BSD-2-Clause license. This avoids the blocked external Leaflet CDN discovered in BIO-17 browser testing.
- Live raster basemap: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, showing streets, islands, towns, coastlines and labels based on real OSM geography. © OpenStreetMap contributors attribution remains visible inside the map.
- Uses native Leaflet wheel-safe pan/drag, double-click/touch zoom and accessible zoom buttons. Does not force scroll-wheel capture of the page.
- Map centers/fits to the current verified official TED source pins. Service/region/date filters simultaneously update the Leaflet markers and their accompanying accessible source list. For a single approximate point, avoid excessive zoom that would imply an exact job address.
- Each marker popup displays the public-source title, official link, date and a prominent warning that coordinates are **representative administrative centers or an issuer seat, not precise locations of work or private clients**.
- For issuer-only geolocation use a translucent dashed marker. The independent list remains available if map tiles fail; no old faux national SVG is displayed.
- All external Leaflet CDN imports and the old `static/greece-outline.js` were removed. Source API `/api/bioshield/discovery/map` and region coverage calculations remain unchanged.

## Data integrity
- The last verified sample contains 5 official TED publications, of which 3 have sufficiently grounded administrative references (Peloponnese, Piraeus and Rhodes as **buyer/issuer location only**) and 2 are deliberately unlocated.
- `0` observations in a region is not `0` demand. This is only TED sample coverage and does not include unlicensed commercial crawls or private lead data.
- No private addresses, email, phones, unverified geographic pins or social profiles are used or exposed.

## OSM tile usage and future operations
- Tile server policy: https://operations.osmfoundation.org/policies/tiles/ . This web app uses the documented HTTPS URL and standard browser traffic that supplies Referer and respects HTTP caching; it neither scrapes tiles, prefetches unseen zoom levels, nor provides bulk/offline downloads.
- The public OpenStreetMap tile server has best-effort availability and no SLA. At significantly higher customer traffic, use a properly licensed dedicated basemap provider or self-hosted tile infrastructure; do not rely on a volunteer server for high-volume production use.
- No external JavaScript CDN is needed; map tiles are the only externally fetched map media. If the tile host is blocked/unavailable, users see a visible warning plus a link to OpenStreetMap and the original TED evidence list.
- Original vendor Leaflet copyright/license text lives in `static/vendor/LEAFLET_LICENSE.txt`; do not delete it.

## Required verification
1. GitHub CI Python + JavaScript checks and source-constraint tests.
2. Render deployment to workspace `tea-da5m6mjncjis739c9tb0`, service `srv-dbt4minf3r2c73bu08e0`; record LIVE deploy and exact SHA.
3. Actual browser must show map **tiles**, not merely Leaflet controls/markers. Check labels/roads/Greek coastline, toolbar pan & zoom, tooltip click, and issuer-only marker warning.
4. Filters: all=3 representative source markers, drain=1 Rhodes, pest=2 Peloponnese/Piraeus, plumbing=0, Attica=1 Piraeus, seven days=1 Peloponnese (as of Nov 16).
5. Confirm real public source URLs remain TED, no synthetic entries, no unauthorized private person contacts, no changes to company Supabase.
6. Record GitHub PR, CI, Render and browser run in Linear DST-281, BioShield project and Notion archive.