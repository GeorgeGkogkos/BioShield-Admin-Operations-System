"""Pre-Supabase gates: zero PII, deterministic decisions and honest results."""
import pytest
from fastapi.testclient import TestClient
from app import app
from bioshield.benchmark import benchmark, quality
from bioshield.engine import canonical_url, classify, mock_run, source_key
from bioshield.fixtures import CASES


@pytest.mark.parametrize("case", CASES, ids=lambda c: c.id)
def test_fixture_intent(case):
    decision = classify(case.text)
    assert decision.is_request is case.expected
    assert decision.contact_eligible is False
    assert 0 <= decision.confidence <= 1


def test_quality_has_no_false_hires_on_toy_examples():
    result = quality()
    assert result["fixture_count"] == 30
    assert result["precision"] >= 0.90
    assert result["recall"] >= 0.85
    assert result["synthetic_only"] is True


def test_tracking_parameters_are_deduplicated_but_identity_preserved():
    first = "https://EXAMPLE.com:443/posts/7/?utm_source=firecrawl&post=42#comment"
    second = "https://example.com/posts/7?post=42&utm_medium=tinyfish"
    assert canonical_url(first) == canonical_url(second)
    assert source_key(first) == source_key(second)
    assert source_key("https://example.com/posts/7?post=43") != source_key(first)


@pytest.mark.parametrize("bad", [
    "file:///etc/passwd", "http://localhost/post", "http://127.0.0.1/a",
    "http://10.20.30.40/post", "http://[::1]/secret",
    "https://user:pass@example.com/a", "https://service.internal/post",
    "ftp://example.com/post", "https://example.com:bad/a",
])
def test_untrusted_urls_rejected(bad):
    with pytest.raises(ValueError):
        canonical_url(bad)


def test_mock_provider_overlap_and_failover_never_contact_people():
    normal = mock_run()
    degraded = mock_run(False)
    assert normal["raw_hits"] > normal["unique_sources"] == len(CASES)
    assert normal["duplicates_excluded"] > 0
    assert normal["classified_requests"] == sum(c.expected for c in CASES)
    assert degraded["unique_sources"] < len(CASES)
    assert not degraded["coverage_complete"]
    assert normal["real_provider_calls"] == degraded["real_provider_calls"] == 0
    assert normal["database_writes"] == degraded["database_writes"] == 0
    assert normal["contact_eligible"] == degraded["contact_eligible"] == 0


def test_repeatable_benchmark_shape():
    result = benchmark(120)
    assert result["iterations"] == 120
    assert result["documents_per_second"] > 0
    assert result["p95_item_ms"] >= result["p50_item_ms"] >= 0
    assert result["synthetic_only"] is True


def test_public_lab_has_only_synthetic_inputs_no_leads():
    with TestClient(app) as client:
        cases = client.get("/api/bioshield/lab/cases")
        assert cases.status_code == 200
        values = cases.json()
        assert values["synthetic_only"] is True
        assert values["count"] == 30
        assert all(c["source"] == "synthetic_fixture" and
                   not c["contact_eligible"] for c in values["cases"])
        assert "no-store" in cases.headers["cache-control"]
        lab = client.get("/api/bioshield/lab/report")
        assert lab.status_code == 200
        report = lab.json()
        assert report["synthetic_only"] and not report["production_supabase_connected"]
        assert report["throughput"]["iterations"] == 1200
        assert report["mock_normal"]["real_provider_calls"] == 0
        assert "no-store" in lab.headers["cache-control"]
        assert client.get("/api/bioshield/candidates").status_code == 403
        assert client.post("/api/bioshield/handoff").status_code == 403
        assert client.post("/api/bioshield/discover").status_code == 403
