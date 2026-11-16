"""BIO-21: source-grounded geography and audience routing.

Faraway public tenders and verified B2B opportunities belong to a SECONDARY
list regardless of value; faraway private-individual requests are excluded.
Missing actual place-of-performance or uncertain buyer role is NOT distant.
No contact permission or active B2B provider is inferred.
"""

from bioshield.geographic_focus import location_policy

VALID_AUDIENCES = frozenset({"public_sector", "business", "individual"})
BUSINESS_PRIMARY_EVIDENCE = frozenset({
    "verified_primary_source", "verified_primary_business_request",
    "official_primary_publication"
})


def audience_type(item):
    """Recognize source-backed roles, not title or ad-keyword guesses."""
    audience = item.get("audience_segment")
    if audience not in VALID_AUDIENCES or item.get("audience_needs_review") is True:
        return None
    if audience == "public_sector":
        # Government tender evidence is either official TED metadata, or
        # a separately verified original official public document.
        if item.get("evidence_level") in (
            "official_ted_metadata", "official_primary_publication"
        ):
            return audience
        return None
    if audience == "business":
        if item.get("evidence_level") in BUSINESS_PRIMARY_EVIDENCE:
            return audience
        return None
    # Individuals are never shown in the faraway list, regardless of evidence.
    return audience


def partition_opportunities(notices, *, policy=None):
    """Return independent lists with explicit review/exclusion statistics.

    Source NUTS codes must be exact *place of performance*, not buyer HQ.
    Deduplicate a repeated source ID before classification; order follows
    supplied source publication date. Unlocated records never become remote.
    """
    policy = policy or location_policy()
    covered = set(policy["combined_nuts"])
    result = {
        "nearby": [], "remote_public": [], "remote_business": [],
        "needs_location_review": [], "needs_audience_review": [],
        "excluded_remote_individual_count": 0,
    }
    seen = set()
    for item in notices:
        if not isinstance(item, dict):
            continue
        sid = item.get("id") or item.get("notice_number")
        if not isinstance(sid, str) or not sid or sid in seen:
            continue
        seen.add(sid)
        # No inferred worksite or false "remote" for source without exact NUTS.
        nuts = {
            code for code in (item.get("place_of_performance_nuts") or [])
            if isinstance(code, str) and len(code) == 5
            and code.startswith("EL") and code[2:].isdigit()
        }
        if not nuts:
            result["needs_location_review"].append(item)
            continue
        if covered & nuts:
            result["nearby"].append(item)
            continue
        audience = audience_type(item)
        if audience == "public_sector":
            result["remote_public"].append(item)
        elif audience == "business":
            result["remote_business"].append(item)
        elif audience == "individual":
            result["excluded_remote_individual_count"] += 1
        else:
            result["needs_audience_review"].append(item)
    result["counts"] = {
        key:len(value) for key,value in result.items() if isinstance(value,list)
    }
    result["counts"]["excluded_remote_individual"] = (
        result["excluded_remote_individual_count"]
    )
    result["remote_requires_minimum_eur"] = False
    result["remote_individuals_displayed"] = False
    result["business_source_is_live"] = False
    result["qualification"] = (
        "Public TED procurement metadata or reviewed primary B2B requests "
        "only. No assurance of open bidding, service eligibility or contact consent."
    )
    return result
