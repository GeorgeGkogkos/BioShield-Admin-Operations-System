"""Pre-Supabase customer-segment routing with explicit evidence and a safe unknown state.

Audience (who seeks service) is independent of service category (what is needed),
request intent and legal permission for outreach. Classification never authorizes
contact or silently turns a public discussion into a qualified lead.
"""
from dataclasses import dataclass
from typing import Literal

from .engine import normalize

Segment = Literal["individual", "public_sector", "business"]
AllowedBuyer = Literal["individual", "public_sector", "business"]


@dataclass(frozen=True)
class AudienceDecision:
    segment: Segment | None
    reason: str
    needs_review: bool = True
    contact_eligible: bool = False


# Narrow contexts describing the BUYER, not every mention of a workplace.
BUSINESS_BUYER = (
    "εκ μερους της εταιρειας μας",
    "της επιχειρησης μας",
    "στο καταστημα μας",
    "για το καταστημα μας",
    "στο εστιατοριο μας",
    "στο ξενοδοχειο μας",
    "στα γραφεια της εταιρειας μας",
    "για την εταιρεια μας",
    "για την επιχειρηση μας",
)
PRIVATE_BUYER = (
    "στο σπιτι μου", "στο σπιτι μας",
    "στο διαμερισμα μου", "στο διαμερισμα μας",
    "στην κατοικια μου", "στην κατοικια μας",
    "στην κρεβατοκαμαρα μου",
)

def classify_audience(
    text: str,
    *,
    source_type: str = "public_post",
    buyer_role: str | None = None,
    public_issuer_verified: bool = False,
) -> AudienceDecision:
    """One segment only, or None when identity is uncertain or contradictory.

    buyer_role is an explicitly reviewed input, not something scraped from a
    contact profile. Public procurement requires the issuer to be evidenced.
    """
    if not isinstance(text, str) or len(text) > 12_000:
        raise ValueError("Expected at most 12000 characters")
    if buyer_role not in (None, "individual", "public_sector", "business"):
        raise ValueError("Unknown buyer role")
    if source_type not in ("public_post", "community_post", "procurement_notice", "business_request"):
        raise ValueError("Unknown source type")
    if source_type == "procurement_notice":
        if buyer_role == "public_sector" and public_issuer_verified:
            return AudienceDecision("public_sector", "evidenced_public_buyer")
        return AudienceDecision(None, "procurement_issuer_not_verified")
    if buyer_role == "public_sector":
        # A post that just mentions the government is not a public procurement.
        return AudienceDecision(None, "public_issuer_requires_procurement_source")
    if buyer_role in ("individual", "business"):
        if source_type == "business_request" and buyer_role == "individual":
            return AudienceDecision(None, "conflicting_buyer_source")
        return AudienceDecision(buyer_role, "human_reviewed_buyer_role")
    if source_type == "business_request":
        return AudienceDecision(None, "business_request_buyer_unverified")
    norm = normalize(text)
    private_match = any(normalize(c) in norm for c in PRIVATE_BUYER)
    business_match = any(normalize(c) in norm for c in BUSINESS_BUYER)
    if private_match and business_match:
        return AudienceDecision(None, "conflicting_individual_and_business_context")
    if business_match:
        return AudienceDecision("business", "explicit_business_buyer_context")
    if private_match:
        return AudienceDecision("individual", "explicit_residential_buyer_context")
    return AudienceDecision(None, "buyer_identity_not_established")
