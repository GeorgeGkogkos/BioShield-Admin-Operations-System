# BIO-08/09 — Pre-Supabase performance and qualification lab

## Purpose and safety
The current BioShield website is a **public, read-only setup preview**. This lab uses
30 fictional Greek posts, with no names, emails, phone numbers, real public forum
URLs, external source retrieval or database connections. The real Firecrawl,
TinyFish, Supabase, and call-center paths all remain **disabled**. All scores and
cases must be labeled synthetic; the heuristic 0.90 confidence is NOT calibrated.

The isolated GitHub repository is public, so NEVER commit real leads or API keys.

## What is measured
- Classification on labeled toy requests vs advertisements, informational articles,
  general pest discussions, product sales and job ads.
- URL identity with query tracking parameters removed and duplicate source URLs
  consolidated without changing distinct post IDs.
- Simulated Firecrawl/TinyFish overlap with a mock failure scenario. No external calls.
- Throughput and per-record p50/p95 CPU time, which includes Unicode normalization,
  rule-based classification and source URL canonicalization. This is **not**
  server HTTP latency, real crawler latency, scraping quality, end-to-end lead
  creation performance or Supabase query speed.

## How to reproduce
Install: python -m pip install -r requirements-dev.txt
Run tests: python -m pytest -q
Benchmark: python -m bioshield.benchmark --iterations 10000 --output benchmark-results.json --check
GitHub Actions uploads a benchmark JSON artifact for each PR (14-day retention).

Routes:
- GET /api/bioshield/lab/cases (fictional examples only)
- GET /api/bioshield/lab/report (bounded cached synthetic CPU snapshot)
- GET /api/bioshield/candidates -> 403
- POST /api/bioshield/discover -> 403
- POST /api/bioshield/handoff -> 403

## Acceptance gates for this *synthetic-only* phase
1. Regression tests on all 30 labeled fixture cases, including negatives.
2. Precision >= 90% and recall >= 85% **on these fixtures only**.
3. URL tracking keys dedupe, distinct post ID parameters remain distinct.
4. One mocked provider outage does not imply full discovery coverage.
5. No PII, no production data, no actual provider calls, no DB writes,
   no auto-contact. Document CPU timing and its test environment.

Throughput has **no universal fixed threshold** until tested on target Render
and with real provider response/latency constraints; watch trends rather than
claiming synthetic speed translates to external-source throughput.

## Next phase (not yet started)
Use a legally reviewed, allowed-domain sample of actual public *requests*
without collecting personal details. Measure independently:
- discovery precision/recall on human-reviewed source pages, with false positive
  counts, clear inclusion criteria and freshness;
- provider latency, retries/fallback and credit consumption;
- HTTP latency under bounded concurrency on staging;
- database upsert, indexing, RLS, retention and APK/EXE contract integrity
  only after the business-owned Supabase is available.
Do not attach this lab to a VELAUNE or unrelated DST database.


## Baseline B1 — GitHub Actions / PR #2 (2026-11-16)
Reproducible command: python -m bioshield.benchmark --iterations 10000 --output benchmark-results.json --check

GitHub CI: https://github.com/GeorgeGkogkos/BioShield-Admin-Operations-System/actions/runs/43781833543

Measured on one GitHub-hosted Ubuntu 26.04 / Python 3.13 runner:
- 30 fictional posts: 15 TP, 0 FP, 15 TN, 0 FN.
- Precision, recall and F1 = 1.0000 on ONLY these authored fixtures.
- 10,000 in-process normalize/classify/canonicalize operations: 823.36 ms.
- Approximate throughput: 12,145.4 synthetic records per second.
- Per-record CPU P50: 0.0877 ms; P95: 0.1301 ms.
- Mocked provider result overlap: 38 raw hits, 30 unique posts, 8 duplicates discarded.
- Provider API calls: 0. Supabase writes: 0. Contact eligible: 0.

Do not extrapolate synthetic 100% precision to real online text. The fixture
selection and rule design are not independent; there is no real-world labelled
holdout set. Timings were measured on CI hardware, not a loaded Render server;
there is no crawler or database latency in the benchmark.

Later validation must use an independent human-reviewed sample from legally
accessible public sources and a separate, rate-limited HTTP staging benchmark.
