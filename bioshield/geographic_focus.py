"""BIO-20: bounded geographic targeting policy for confirmed Greek TED notices.

No browser geolocation is sent to this module. Browser-side consent converts
coordinates to a coarse predefined region. Exact GPS is never collected here.
"""
import re

# Official TED/Eurostat NUTS 2024 level 3:
# https://docs.ted.europa.eu/eforms/latest/reference/code-lists/nuts-grc-lvl3.html
ATTICA_CODES = tuple(f"EL30{i}" for i in range(1,8))
HOME_CODES = (*ATTICA_CODES, "EL642", "EL652")
LOCATIONS = {
    "ilion": {
        "label": "Ίλιον (μόνιμη βάση)",
        "nuts": "EL302",
        "search_codes": HOME_CODES,
        "region": "Αττική, Εύβοια και Κορινθία",
    },
    "attica": {"label":"Αττική", "nuts":"EL30", "search_codes":ATTICA_CODES},
    "evia": {"label":"Εύβοια", "nuts":"EL642", "search_codes":("EL642",)},
    "corinthia": {"label":"Κορινθία", "nuts":"EL652", "search_codes":("EL652",)},
    "thessaloniki": {"label":"Θεσσαλονίκη", "nuts":"EL522", "search_codes":("EL522",)},
    "achaia": {"label":"Αχαΐα", "nuts":"EL632", "search_codes":("EL632",)},
    "heraklion": {"label":"Ηράκλειο", "nuts":"EL431", "search_codes":("EL431",)},
    "larisa": {"label":"Λάρισα", "nuts":"EL612", "search_codes":("EL612",)},
    "rodos": {"label":"Ρόδος", "nuts":"EL421", "search_codes":("EL421",)},
}
# BIO-21: no artificial EUR threshold for faraway public/B2B records.
# Verified audience + official place of performance control routing instead.

def location_policy(*, home="ilion", temporary=""):
    """Base and temporarily visited region ADD to each other; never replace."""
    if home not in LOCATIONS:
        raise ValueError("Unknown permanent region")
    if temporary and temporary not in LOCATIONS:
        raise ValueError("Unknown temporary region")
    home_codes = LOCATIONS[home]["search_codes"]
    visit = LOCATIONS[temporary]["search_codes"] if temporary else ()
    return {
        "home":home,
        "home_label":LOCATIONS[home]["label"],
        "temporary":temporary or None,
        "temporary_label":LOCATIONS[temporary]["label"] if temporary else None,
        "home_nuts":list(home_codes),
        "temporary_nuts":list(visit),
        "combined_nuts":list(dict.fromkeys((*home_codes, *visit))),
        "remote_included_audiences":["public_sector", "business"],
        "remote_individuals_allowed":False,
        "remote_minimum_eur_required":False,
        "consent_required_for_browser_location":True,
        "precision":"coarse_region_only",
        "worksite_location_verified":False,
    }

def classify_notice(notice, policy):
    """No faraway individual jobs or unspecified buyer role.
    
    A published tender's official source is not evidence of precise worksite
    coordinates, bidding eligibility, price or an authorized business lead.
    """
    nuts = set(notice.get("place_of_performance_nuts") or ())
    allowed = set(policy["combined_nuts"])
    if not nuts:
        return "unlocated_review"
    if nuts & allowed:
        return "priority_nearby"
    audience = notice.get("audience_segment")
    if audience == "public_sector" and notice.get("evidence_level") == "official_ted_metadata":
        return "remote_public"
    if (audience == "business" and
        notice.get("audience_needs_review") is not True and
        notice.get("evidence_level") in (
            "verified_primary_source", "verified_primary_business_request",
            "official_primary_publication"
        )):
        return "remote_business"
    if audience == "individual":
        return "remote_individual_excluded"
    return "remote_audience_review_required"

def official_nuts_from_value(value):
    """Accept explicit ELxyz code tokens ONLY; never geocode buyer's HQ as worksite."""
    if not isinstance(value,(str,list,dict)):
        return []
    def flatten(v):
        if isinstance(v,dict):
            for x in v.values():
                yield from flatten(x)
        elif isinstance(v,list):
            for x in v: yield from flatten(x)
        elif isinstance(v,str):
            yield v
    return sorted({m for v in flatten(value) for m in re.findall(r"\bEL\d{3}\b", v.upper())})

def posted_eur_from_fields(item):
    """Only literal numeric official total-value with explicit EUR currency."""
    if not isinstance(item,dict):
        return None
    if item.get("total-value-cur") != "EUR":
        return None
    amount=item.get("total-value")
    if isinstance(amount,(int,float)) and not isinstance(amount,bool):
        return float(amount) if 0 < amount < 10**12 else None
    if isinstance(amount,str) and re.fullmatch(r"\d+(?:\.\d{1,2})?", amount):
        n=float(amount)
        return n if 0 < n < 10**12 else None
    return None
