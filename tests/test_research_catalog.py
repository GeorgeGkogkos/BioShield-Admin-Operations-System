"""BIO-19 PDF-inspired search and multi-page regression.

No social scraping/outreach is activated by a search vocabulary.
"""
from datetime import datetime, timezone
from pathlib import Path
from fastapi.testclient import TestClient

from app import app
from bioshield.research_catalog import (
    KEYWORDS, EXCLUDED_DOMAINS, CANDIDATE_RESEARCH_SOURCES,
    evaluate_discussion, exclude_url, public_research_config, normalize,
)

AT = datetime(2026, 11, 16, 12, 0, tzinfo=timezone.utc)
SOURCE = "https://www.insomnia.gr/forums/topic/812727-cockroaches"


def triage(text, published_at, *, verified=True, url=SOURCE, now=AT,
           last_reply=None):
    return evaluate_discussion(
        text=text, published_at=published_at, original_post_verified=verified,
        source_url=url, now=now, last_reply_at=last_reply
    )


def test_pdf_lexicon_has_greek_technical_colloquial_intent_and_places():
    assert set(KEYWORDS) == {
        "services", "pests", "request_intent", "problem_intent",
        "spaces", "attica", "other_services",
    }
    assert sum(len(g["terms"]) for g in KEYWORDS.values()) >= 160
    assert "απεντόμωση" in KEYWORDS["services"]["terms"]
    assert "κοριούς" in KEYWORDS["pests"]["terms"]
    assert "σφηκοφωλιά" in KEYWORDS["pests"]["terms"]
    assert "έχετε να προτείνετε" in KEYWORDS["request_intent"]["terms"]
    assert "βγαίνουν από το σιφόνι" in KEYWORDS["problem_intent"]["terms"]
    assert "Ίλιον" in KEYWORDS["attica"]["terms"]
    assert "Περιστέρι" in KEYWORDS["attica"]["terms"]
    assert "απόφραξη" in KEYWORDS["other_services"]["terms"]


def test_excluded_marketplaces_not_sources_of_public_discussion_leads():
    assert set(EXCLUDED_DOMAINS) == {
        "douleutaras.gr", "myconstructor.gr", "texnitesonline.gr",
        "vrisko.gr", "xo.gr",
    }
    for host in EXCLUDED_DOMAINS:
        assert exclude_url(f"https://www.{host}/job") is True
    assert exclude_url(SOURCE) is False
    assert normalize("katsarides και απολίμανση") == "κατσαριδες και απολυμανση"
    assert triage(
        "Ψάχνω απεντόμωση στο Περιστέρι",
        "2026-11-15T12:00:00+00:00",
        url="https://www.douleutaras.gr/job",
    )["review_status"] == "excluded_source"


def test_seven_day_verified_publication_is_required_and_no_contact():
    valid=triage(
        "Ψάχνω συνεργείο, έχουμε κατσαρίδες στο Περιστέρι",
        "2026-11-15T12:00:00+00:00",
    )
    assert valid["in_recent_primary_list"] is True
    assert valid["priority"] == "explicit_request"
    assert valid["contact_eligible"] is False
    assert triage(
        "Ψάχνω συνεργείο για κατσαρίδες στο Περιστέρι",
        "2026-11-15T12:00:00+00:00", verified=False,
    )["in_recent_primary_list"] is False
    assert triage(
        "Ψάχνω συνεργείο για κατσαρίδες στο Περιστέρι",
        "2021-10-24T10:00:00Z", last_reply="2026-11-16T11:00:00Z",
    )["in_recent_primary_list"] is False
    assert triage(
        "Ψάχνω συνεργείο για κατσαρίδες στο Περιστέρι", "unknown",
    )["in_recent_primary_list"] is False
    assert triage(
        "Ψάχνω συνεργείο για κατσαρίδες στο Περιστέρι",
        "2026-11-17T12:00:00+00:00",
    )["in_recent_primary_list"] is False


def test_separate_problem_lane_ad_flags_and_attica_scope():
    problem=triage(
        "Έχω πρόβλημα με κοριούς στο Ίλιον.",
        "2026-11-14T12:00:00Z",
    )
    assert problem["in_recent_primary_list"] is True
    assert problem["priority"] == "problem_only"
    assert problem["contact_eligible"] is False
    ad=triage(
        "Η εταιρεία μας αναλαμβάνουμε απεντόμωση στο Περιστέρι. Θέλω προσφορά!",
        "2026-11-15T12:00:00Z",
    )
    assert ad["in_recent_primary_list"] is False
    assert ad["ad_signals"]
    outside=triage(
        "Ψάχνω απεντόμωση, έχουμε κατσαρίδες",
        "2026-11-15T12:00:00Z",
    )
    assert outside["in_recent_primary_list"] is False
    assert outside["attica_mentioned"] is False


def test_research_config_stays_nonoperational_read_only():
    info=public_research_config()
    assert info["publication_recency"]["default_days"] == 7
    assert info["publication_recency"]["original_post_date_required"] is True
    assert info["publication_recency"]["index_last_updated_is_not_publication_date"] is True
    assert info["publication_recency"]["new_reply_is_separate_signal"] is True
    assert info["automated_private_social_discovery_enabled"] is False
    assert info["reddit_rss_used"] is False
    assert info["contact_eligible"] is False
    assert info["no_provider_rights_granted_by_pdf"] is True
    assert len(CANDIDATE_RESEARCH_SOURCES) >= 5
    assert all(s["status"] != "enabled" for s in CANDIDATE_RESEARCH_SOURCES)
    assert len(info["examples"]) >= 8


def test_new_read_only_deep_link_pages_and_search_api():
    with TestClient(app) as client:
        for slug in ("overview", "discovery", "evidence", "map", "sources"):
            page=client.get("/admin/operations/"+slug)
            assert page.status_code == 200, slug
            assert "BioShield" in page.text
            assert page.headers["cache-control"] == "no-store"
        assert client.get("/admin/operations/unrecognized").status_code == 404
        config=client.get("/api/bioshield/research/config")
        assert config.status_code == 200
        assert config.json()["version"] == "bio19_public_discussion_research_v1"
        assert config.headers["cache-control"] == "no-store"
        assert client.post("/api/bioshield/handoff").status_code == 403
        assert client.get("/api/bioshield/candidates").status_code == 403


def test_compiled_ts_navigation_and_pdf_research_are_connected():
    root=Path(__file__).resolve().parents[1]
    nav=(root/"src/navigation.ts").read_text()
    research=(root/"src/research-view.ts").read_text()
    browser=(root/"static/bioshield-admin.js").read_text()
    real=(root/"static/real-pilot.js").read_text()
    assert "export type Screen" in nav
    assert "startViewTransition" not in nav
    assert "render();" in nav  # route still updates without top-layer snapshots
    assert "history.pushState" in nav
    for path in ("overview","discovery","evidence","map","sources"):
        assert "/admin/operations/"+path in nav
    assert "researchMarkup" in research
    assert "bio-keyword-find" in research
    assert "setupResearchPlaybook" in browser
    assert "installNavigation(page,selectTab)" in browser
    assert "api('/bioshield/research/config')" in browser
    assert 'value="7d">Reddit · έως 7 ημέρες' in real
    assert "data-bio-tab" in browser
    compiled=(root/"static/typed/navigation.js").read_text()
    assert " as Screen" not in compiled
    assert "return canonical(legacy);" in compiled
    assert "return 'overview';" in compiled
    assert (root/"static/typed/research-view.js").exists()
