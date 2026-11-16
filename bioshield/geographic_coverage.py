"""Conservative public-source geography for a coverage *research* map.

The saved TED publication gives a geographic scope only when its TITLE names
it explicitly. A municipal buying authority provides a separate
issuer-only geographic proxy, NEVER the location of the work or an incident.

Pins use representative administrative centers, not extracted addresses,
personal locations, or precise service coordinates. No online geocoder.
"""
import re
import unicodedata
from datetime import datetime, timezone

ADMIN_REGIONS = (
    "Αττική", "Κεντρική Μακεδονία", "Ανατολική Μακεδονία και Θράκη",
    "Δυτική Μακεδονία", "Ήπειρος", "Θεσσαλία",
    "Ιόνια Νησιά", "Δυτική Ελλάδα", "Στερεά Ελλάδα",
    "Πελοπόννησος", "Βόρειο Αιγαίο", "Νότιο Αιγαίο", "Κρήτη",
)

# These approximate representative *admin-area centers*, not work locations.
# Do not add a row unless a geographic scope/issuer can be corroborated from
# official public document fields.
LOCATIONS = {
    "peloponnese": {
        "name": "Πελοπόννησος", "region": "Πελοπόννησος",
        "lat": 37.570, "lon": 22.420,
        "match": ("περιφερεια πελοποννησου", "στη περιφερεια πελοποννησου"),
        "precision": "region_representative_point",
        "source": "explicit_notice_title",
    },
    "piraeus": {
        "name": "Πειραιάς", "region": "Αττική",
        "lat": 37.943, "lon": 23.647,
        "match": ("δημου πειραια", "δημος πειραια"),
        "precision": "municipality_representative_point",
        "source": "explicit_notice_title",
    },
    "rhodes_issuer": {
        "name": "Ρόδος — φορέας", "region": "Νότιο Αιγαίο",
        "lat": 36.435, "lon": 28.217,
        "match": ("δημου ροδου",),
        "precision": "issuer_city_representative_point",
        "source": "buyer_name_only",
    },
}


def _normalize(text):
    clean = unicodedata.normalize("NFD", str(text or "").casefold())
    return re.sub(r"\s+", " ", "".join(
        ch for ch in clean if unicodedata.category(ch) != "Mn"
    )).strip()


def locate_notice(notice):
    """Use title first, or clearly label an issuer-only location as a proxy."""
    title = _normalize(notice.get("title"))
    buyer = _normalize(notice.get("buyer"))
    for key in ("peloponnese", "piraeus"):
        loc = LOCATIONS[key]
        if any(k in title for k in loc["match"]):
            return dict(loc, location_basis="notice_title", explicit_work_location=False)
    loc = LOCATIONS["rhodes_issuer"]
    if any(k in buyer for k in loc["match"]):
        return dict(loc, location_basis="buyer_only_not_work_site",
                    explicit_work_location=False)
    return None


def coverage_report(ted_report):
    """Never confuse an absent observation with a region without actual demand."""
    notices = (ted_report.get("notices") or []) if ted_report.get("status") == "ok" else []
    if not isinstance(notices, list):
        notices = []
    points = []
    unlocated = 0
    counts = {region: 0 for region in ADMIN_REGIONS}
    seen = set()
    for item in notices:
        if not isinstance(item, dict):
            continue
        ident = item.get("notice_number")
        if not isinstance(ident, str) or not re.fullmatch(r"\d{5,7}-20\d{2}", ident):
            continue
        if ident in seen:
            continue
        seen.add(ident)
        loc = locate_notice(item)
        if not loc:
            unlocated += 1
            continue
        counts[loc["region"]] += 1
        points.append({
            "id": "TED-" + ident, "notice_number": ident,
            "title": str(item.get("title", ""))[:320],
            "buyer": str(item.get("buyer", ""))[:320],
            "published_on": item.get("published_on"),
            "source_url": f"https://ted.europa.eu/en/notice/-/detail/{ident}",
            "source_type": "ted",
            "service_codes": [c for c in item.get("service_codes", []) if c in
                              ("pest_control","rodent_control","disinfection",
                               "plumbing","drain_unblocking")],
            "audience_segment": "public_sector",
            "location_text": loc["name"],
            "region": loc["region"], "latitude": loc["lat"], "longitude": loc["lon"],
            "location_basis": loc["location_basis"], "precision": loc["precision"],
            "is_actual_work_site": False, "contact_eligible": False,
            "confidence": "administrative_scope" if loc["location_basis"] ==
                          "notice_title" else "issuer_location_only",
        })
    points.sort(key=lambda x: (x["published_on"] or "", x["id"]), reverse=True)
    coverage = [
        {"region": region, "observed_count": num,
         "research_priority": "review_source_coverage" if num <= 1 else "sampled"}
        for region, num in sorted(counts.items(), key=lambda kv:(kv[1], kv[0]))
    ]
    return {
        "version": "bio17_public_geographic_coverage_v1",
        "status": "ok" if ted_report.get("status") == "ok" else "source_unavailable",
        "source": "EU TED official publication metadata; last 30 days",
        "source_freshness_days": 30,
        "map_point_type": "representative_administrative_center_not_work_site",
        "mapped_notice_count": len(points), "unlocated_notice_count": unlocated,
        "total_source_notices": len(seen),
        "points": points,
        "regions": coverage,
        "zero_observed_regions": sum(row["observed_count"] == 0 for row in coverage),
        "lowest_observation_regions": [
            row["region"] for row in coverage if row["observed_count"] <= 1
        ],
        "scope_warning": (
            "Only geographies named in verified public TED title or explicitly "
            "associated with issuing authority. Points approximate administrative "
            "centers and are NOT worksite/incident locations. Zero or low "
            "observations do NOT imply zero demand: only TED last 30 days "
            "was surveyed; source coverage is partial and biased."
        ),
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "notices_with_no_verified_location_are_omitted": True,
    }
