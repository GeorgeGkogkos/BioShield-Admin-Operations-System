# BIO-20 / Linear DST-283 — Google Alerts RSS/Atom discovery signal

Google Alerts is a **secondary discovery index**. It is not an original page, procurement API, confirmed customer lead, GDPR lawful basis, or consent for contact. Official TED notices and human review remain separate.

Code: https://github.com/GeorgeGkogkos/BioShield-Admin-Operations-System

## Operator setup — no secrets in repository

1. With an authorized Google account visit https://www.google.com/alerts and create targeted Greek alerts. From *Show options*, choose RSS Feed delivery where available. There is no documented general Google Alerts management API.
2. Copy the personal RSS feed link from the RSS icon. **Treat each feed URL as a secret**. Never post it in GitHub, Linear, Notion or screenshots.
3. In the dedicated BioShield Render service, configure a private environment variable named BIOSHIELD_GOOGLE_ALERTS_FEEDS_JSON. The value must be a JSON array such as ["https://www.google.com/alerts/feeds/123456789/REPLACE_WITH_REAL_TOKEN"]. This is only a template, **not** a real connected feed.
4. Redeploy the service via the existing release process. The read-only endpoint /api/bioshield/discovery/google-alerts must show status=ok and fetched_feeds>0 before reporting live Google Alerts connectivity; a zero-item feed can be healthy.
5. In /admin/operations/sources inspect provider health, unique item count and potential request hints. The unauthenticated preview deliberately does not include publisher links, snippets, names, contacts, or private tokens.
6. Remove the variable to disable. Default is awaiting_feed_configuration.

**The application does not create, edit or delete Google Alerts account subscriptions.**

## Suggested 12–20 pilot search queries (not configured yet)

| Audience | Greek queries to adapt |
|---|---|
| Individuals | "χρειάζομαι απεντόμωση"; "ψάχνω αποφράξεις"; "θέλω μυοκτονία" |
| Businesses | "αναζητούμε συνεργείο απολύμανσης"; "για το εστιατόριό μας" "απεντόμωση"; "ζητείται συνεργείο αποφράξεων" |
| Public procurement | "πρόσκληση απεντόμωσης" δήμος; "ανάθεση μυοκτονίας"; "διακήρυξη απολύμανσης"; "υπηρεσίες αποφράξεων" προμήθεια |

Keep query ID, region, language, delivery setting, and source scope in a private pilot log. Use negative terms only after measuring suppressed relevant results.

## Technical and privacy contract

- Input: exclusively operator-configured HTTPS feed URLs under google.com/alerts/feeds/{numeric}/{token}. The public API cannot fetch arbitrary URLs.
- Fixed Google endpoint with redirect rejection, 8-second timeout, 250 KB feed body cap, max 20 feeds and max 40 Atom entries/feed. No DTD/entity processing.
- Unwrap Google /url publisher links as text only, reject unsafe literal publisher URLs, normalize URL, and deduplicate across feeds in a poll. **Never fetch the original publisher page in this adapter** pending site policy review.
- RSS timestamps are alert timestamps, NOT verified original publication dates. Do not infer a current customer, active tender, eligible contact, or location from title/snippet alone.
- Text classifier emits **unverified hints**; each item requires independent inspection of the primary page. Public endpoint exposes counts and feed health only, with zero confirmed contactable leads.
- In-memory 10-minute cache avoids excess requests but is NOT persistent run history or a 14-day measurement store.
- Company Supabase remains disconnected. No CRM write, no private identities, no outreach, no automatic phone calls.

## Test commands

    python -m pytest -q tests/test_google_alerts.py
    python -m pytest -q
    node --input-type=module --check < static/bioshield-admin.js

Offline unit tests cover Atom parsing, dedup, malicious redirects/URLs, malformed XML, missing feed credentials, partial failure and safe public status. They do **not** establish live RSS connectivity, human-confirmed leads, 14-day reliability or source licensing.

## 14-day evidence pilot (start date pending real feed)

Start only after an operator-owned real feed is configured and successfully read. In a private, policy-reviewed evaluation log record: feed/query ID (non-secret), UTC observed time, verified publisher date if original has been opened, canonical URL hash, service and buyer lane, human verification outcome, duplicate vs other collectors (TED, ΚΗΜΔΗΣ, Firecrawl, TinyFish), excluded reason and source legality. Avoid collecting personally identifying content and phone/email/username.

At the end, report human-reviewed precision, incremental distinct verified hiring requests, by-segment yield, missing cases, delay to discovery, cost and failures. If no verified samples: report **insufficient evidence**, not an invented accuracy percentage. Never claim the 14-day evaluation has completed without 14 observed days.

## Remaining gates

- Real Google Alerts RSS URL or authorized mailbox feed is not currently available to the app.
- No original page fetch or user credential exists; no verified private customer lead can be asserted.
- Links in alerts do not override a website's robots/terms or authorize commercial scraping.
- Release closure requires GitHub PR + passing CI + merged SHA + real Render deploy ID/status + live endpoint verification, recorded in https://linear.app/gkg/issue/DST-283.
