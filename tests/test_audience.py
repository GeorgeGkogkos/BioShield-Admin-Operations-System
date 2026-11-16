"""BIO-11: buyer audience is independent of request intent and always no-contact."""
import pytest
from fastapi.testclient import TestClient
from app import app
from bioshield.audience import classify_audience
from bioshield.engine import classify
from bioshield.real_pilot import pilot_report

@pytest.mark.parametrize("description,source,role,issuer,segment,reason", [
    ("Ζητεί ο Δήμος απεντόμωση σχολείων", "procurement_notice", "public_sector", True, "public_sector", "named_in_procurement_notice"),
    ("Δήμος ζητά μυοκτονία", "procurement_notice", "public_sector", False, None, "procurement_issuer_not_verified"),
    ("Ο δήμος ψέκασε την πλατεία μας", "community_post", None, False, None, "buyer_identity_not_established"),
    ("Θέλω απολύμανση στο σπίτι μου", "community_post", None, False, "individual", "explicit_residential_buyer_context"),
    ("Χρειάζομαι απεντόμωση στο διαμέρισμά μου", "public_post", None, False, "individual", "explicit_residential_buyer_context"),
    ("Χρειαζόμαστε μυοκτονία για το κατάστημά μας", "public_post", None, False, "business", "explicit_business_buyer_context"),
    ("Ψάχνουμε για απεντόμωση στο ξενοδοχείο μας", "public_post", None, False, "business", "explicit_business_buyer_context"),
    ("Εκ μέρους της εταιρείας μας ζητάμε προσφορά για απεντόμωση", "business_request", "business", False, "business", "human_reviewed_buyer_role"),
    ("Αναλαμβάνουμε απεντομώσεις. Καλέστε μας!", "public_post", None, False, None, "buyer_identity_not_established"),
    ("Θέλω απεντόμωση σε έναν χώρο", "public_post", None, False, None, "buyer_identity_not_established"),
    ("Χρειάζομαι απεντόμωση στο σπίτι μου και στο κατάστημά μας", "public_post", None, False, None, "conflicting_individual_and_business_context"),
    ("Δημοτικό σχολείο αναζητά υπηρεσία", "public_post", "public_sector", False, None, "public_issuer_requires_procurement_source"),
    ("Ζητάμε υπηρεσίες", "business_request", None, False, None, "business_request_buyer_unverified"),
    ("Απεντόμωση ιδιώτη", "business_request", "individual", False, None, "conflicting_buyer_source"),
])
def test_audience_fails_closed_on_ambiguity(description,source,role,issuer,segment,reason):
    out = classify_audience(description,source_type=source,buyer_role=role,public_issuer_identified=issuer)
    assert out.segment == segment
    assert out.reason == reason
    assert out.needs_review is True
    assert out.contact_eligible is False

@pytest.mark.parametrize("bad", ["procurement", "anonymous_login", ""])
def test_unrecognized_source_types_not_treated_as_business(bad):
    with pytest.raises(ValueError):
        classify_audience("Θέλω απεντόμωση στο κατάστημά μας",source_type=bad)

def test_service_intent_stays_separate_from_customer_segment():
    # An advertisement is neither explicit buyer intent nor a contactable lead.
    advertisement="Αναλαμβάνουμε απεντομώσεις. Καλέστε μας!"
    assert classify(advertisement).is_request is False
    assert classify_audience(advertisement).segment is None
    # A procurement issuer may be a public buyer even before verified bid eligibility.
    out = classify_audience("Παροχή υπηρεσιών απεντόμωσης",source_type="procurement_notice",
                           buyer_role="public_sector",public_issuer_identified=True)
    assert out.segment == "public_sector"
    assert out.contact_eligible is False

def test_real_snapshot_has_three_exclusive_segments_and_unresolved_case():
    data=pilot_report()
    assert data["version"] == "bio11_segmented_public_evidence_v1"
    assert data["segment_counts"] == {"individual":4,"public_sector":7,"business":0,"needs_review":1}
    assert data["public_sources_reviewed"] == 12
    assert data["business_requests"] == []
    assert data["business_requests_count"] == 0
    for rec in data["tenders"]:
        assert rec["audience_segment"] == "public_sector"
        assert rec["contact_eligible"] is False
    assert sum(rec["audience_segment"]=="individual" for rec in data["community_cases"]) == 4
    assert sum(rec["audience_segment"] is None for rec in data["community_cases"]) == 1
    for rec in data["community_cases"]:
        assert rec["audience_needs_review"] and not rec["contact_eligible"]
        assert "phone" not in rec and "email" not in rec and "username" not in rec

def test_live_api_contract_and_403_gates():
    with TestClient(app) as client:
        r=client.get("/api/bioshield/pilot/evidence")
        assert r.status_code == 200
        payload=r.json()
        assert payload["segment_counts"]["business"] == 0
        assert payload["segment_counts"]["public_sector"] == 7
        assert payload["segment_counts"]["individual"] == 4
        assert payload["segment_counts"]["needs_review"] == 1
        assert payload["external_supabase_connected"] is False
        assert payload["contact_eligible"] == 0
        assert r.headers["cache-control"] == "no-store"
        assert client.get("/api/bioshield/candidates").status_code == 403
        assert client.post("/api/bioshield/discover").status_code == 403
        assert client.post("/api/bioshield/handoff").status_code == 403
