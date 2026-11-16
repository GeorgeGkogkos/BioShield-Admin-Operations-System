"""Manually examined PUBLIC evidence snapshot, 2026-11-16, not a lead database.

Organizational procurement and public forum discussions are DIFFERENT evidence
classes. Real third-party source content is paraphrased, never bulk-copied.
The application makes NO automatic source requests and stores NO personal contact
fields. All records remain blocked from outbound contact and CRM publication.
"""
from urllib.parse import urlsplit

OBSERVED_ON = "2026-11-16"
TENDERS = (
    {
        "id": "ORG-001", "authority": "Δήμος Πειραιά",
        "region": "Αττική — Πειραιάς",
        "service": "Κουνουποκτονίες, απεντομώσεις, μυοκτονίες (2027–2028)",
        "budget_eur_ex_vat": 483400.00, "deadline": "2026-11-30T14:00:00+02:00",
        "published_on": "2026-11-02", "notice_id": "26PROC020101899 / TED 758868-2026",
        "evidence_level": "republished_full_notice",
        "evidence_note": "Αναγνώστηκε δημόσια αναδημοσίευση της προκήρυξης TED. Το επίσημο TED δεν ήταν προσβάσιμο αυτοματοποιημένα.",
        "source_url": "https://www.hellotender.eu/el/dimosioi-diagonismoi/758868-2026",
        "additional_url": "https://www.akep.gr/contestdetails/1346070",
    },
    {
        "id": "ORG-002", "authority": "Δήμος Περάματος",
        "region": "Αττική — Πέραμα",
        "service": "Εργασίες μυοκτονίας και απεντόμωσης",
        "budget_eur_ex_vat": 121257.00, "deadline": "2026-11-20T13:00:00+02:00",
        "published_on": "2026-10-30", "notice_id": "26PROC020089295",
        "evidence_level": "official_issuer_listing",
        "evidence_note": "Επιβεβαιώθηκε η ίδια η προκήρυξη στον δημόσιο κατάλογο του Δήμου· ποσό και λήξη διασταυρώθηκαν με δημοσιευμένο μητρώο.",
        "source_url": "https://perama.gr/διαγωνισμοί-προσκλήσεις/",
        "additional_url": "https://diagonismoi.cy/tender/kimdis/26PROC020089295",
    },
    {
        "id": "ORG-003", "authority": "Δήμος Κασσάνδρας",
        "region": "Χαλκιδική",
        "service": "Απεντόμωση και μυοκτονία Δ.Ε. Κασσάνδρας",
        "budget_eur_ex_vat": 25136.40, "deadline": "2026-11-16T15:00:00+02:00",
        "published_on": "2026-11-11", "notice_id": "26PROC020174144",
        "evidence_level": "indexed_notice_only",
        "evidence_note": "Ο πρωτογενής ιστότοπος ΚΗΜΔΗΣ δεν άνοιξε· δημοσιευμένα μεταδεδομένα από δύο ανεξάρτητους καταλόγους.",
        "source_url": "https://diavgis.gr/act/26PROC020174144",
        "additional_url": "https://el-vinculo.com/gr/diagonismos/prosklisi-gia-ypovoli-oikonomikis-prosforas-apentomosi-myoktonia-de-kas-mel-105-173991576",
    },
    {
        "id": "ORG-004", "authority": "Δημοτική Εταιρεία Πληροφόρησης Θεάματος και Επικοινωνίας",
        "region": "Θεσσαλονίκη",
        "service": "Υπηρεσία απολύμανσης και απεντόμωσης εγκαταστάσεων",
        "budget_eur_ex_vat": 2419.35, "deadline": "2026-11-17T10:00:00+02:00",
        "published_on": "2026-11-10", "notice_id": "26PROC020167152",
        "evidence_level": "indexed_notice_only",
        "evidence_note": "Μόνο δημοσιευμένα μεταδεδομένα ΚΗΜΔΗΣ από μητρώο αναζήτησης· απαιτείται πρωτότυπη διακήρυξη.",
        "source_url": "https://diavgis.gr/act/26PROC020167152",
        "additional_url": None,
    },
    {
        "id": "ORG-005", "authority": "6η Υγειονομική Περιφέρεια — ΚΥ Κάτω Αχαΐας",
        "region": "Αχαΐα",
        "service": "Απολύμανση, απεντόμωση, μυοκτονία και οφιοαπώθηση",
        "budget_eur_ex_vat": 1700.00, "deadline": "2026-11-18T13:00:00+02:00",
        "published_on": "2026-11-11", "notice_id": "26PROC020167136",
        "evidence_level": "indexed_notice_only",
        "evidence_note": "Μόνο μεταδεδομένα καταλόγου προκήρυξης· απευθείας πρόσκληση, ενδέχεται να έχει περιορισμό αποδεκτών.",
        "source_url": "https://diavgis.gr/act/26PROC020167136",
        "additional_url": None,
    },
    {
        "id": "ORG-006", "authority": "Δήμος Πέλλας",
        "region": "Πέλλα",
        "service": "Μυοκτονία, απολύμανση και προμήθεια δολωματικών σταθμών",
        "budget_eur_ex_vat": 367.00, "deadline": "2026-11-18T15:00:00+02:00",
        "published_on": "2026-11-13", "notice_id": "26PROC020194253",
        "evidence_level": "indexed_notice_only",
        "evidence_note": "Μόνο μεταδεδομένα· μικτός χαρακτήρας υπηρεσίας και προμήθειας, απευθείας πρόσκληση.",
        "source_url": "https://diavgis.gr/act/26PROC020194253",
        "additional_url": None,
    },
    {
        "id": "ORG-007", "authority": "Δήμος Ελασσόνας",
        "region": "Θεσσαλία — Ελασσόνα",
        "service": "Απεντόμωση και μυοκτονία σε σχολικές μονάδες",
        "budget_eur_ex_vat": 1300.00, "deadline": None,
        "deadline_day_reported": "2026-11-18",
        "published_on": "2026-11-10", "notice_id": "26PROC020162777",
        "evidence_level": "indexed_notice_only",
        "evidence_note": "Αναφέρεται μόνο ημερομηνία λήξης, όχι επιβεβαιωμένη ώρα· απευθείας πρόσκληση.",
        "source_url": "https://diavgis.gr/act/26PROC020162777",
        "additional_url": None,
    },
)

COMMUNITY_CASES = (
    {
        "id": "FORUM-001", "publisher": "Reddit / r/thessaloniki",
        "posted_on": "2026-09-10", "service": "Απεντόμωση κοριών",
        "finding": "explicit_service_recommendation_request",
        "summary": "Δημόσια ερώτηση που ζητά σύσταση αποτελεσματικής υπηρεσίας για ύποπτους κοριούς στη Θεσσαλονίκη.",
        "gate": "historical_not_confirmed_active",
        "source_url": "https://www.reddit.com/r/thessaloniki/comments/1wcczb3/",
        "source_opened": True,
    },
    {
        "id": "FORUM-002", "publisher": "Reddit / r/greece",
        "posted_on": "2026-06-02", "service": "Απεντόμωση για κατσαρίδες",
        "finding": "general_advice_not_hiring",
        "summary": "Ζητείται συμβουλή για αποτελεσματικότητα απεντόμωσης και σίτες, όχι σύσταση επαγγελματία.",
        "gate": "not_hiring",
        "source_url": "https://www.reddit.com/r/greece/comments/1tuhn7b/",
        "source_opened": True,
    },
    {
        "id": "FORUM-003", "publisher": "Reddit / r/greece",
        "posted_on": "2026-06-21", "service": "Κατσαρίδες σε ισόγειο",
        "finding": "discussion_about_possible_service",
        "summary": "Δημόσια συζήτηση για επιλογές αντιμετώπισης και ευθύνη ιδιοκτήτη· δεν ζητείται προσφορά ή συνεργείο.",
        "gate": "not_hiring",
        "source_url": "https://www.reddit.com/r/greece/comments/1ubnlr1/",
        "source_opened": True,
    },
    {
        "id": "FORUM-004", "publisher": "Reddit / r/greece",
        "posted_on": "2021-11-09", "service": "Απεντόμωση κατσαρίδων",
        "finding": "explicit_request_but_stale",
        "summary": "Παλαιά ερώτηση για σύσταση εταιρείας στην Αθήνα· η ανάρτηση έχει αρχειοθετηθεί.",
        "gate": "stale_archived",
        "source_url": "https://www.reddit.com/r/greece/comments/qq5p0s/",
        "source_opened": True,
    },
    {
        "id": "FORUM-005", "publisher": "Reddit / r/greece",
        "posted_on": "2026-07-12", "service": "Κοριοί",
        "finding": "already_booked_a_company",
        "summary": "Περιγράφεται πρόβλημα με κοριούς, αλλά στη συζήτηση δηλώνεται ότι έχει ήδη κληθεί συνεργείο.",
        "gate": "service_already_arranged",
        "source_url": "https://www.reddit.com/r/greece/comments/1uul302/",
        "source_opened": False,
    },
)

def pilot_report() -> dict:
    """Static, review-only desk-research ledger: no provider or database reads."""
    source_count = len(TENDERS) + len(COMMUNITY_CASES)
    return {
        "version": "bio10_manual_public_evidence_v1",
        "as_of_date": OBSERVED_ON,
        "real_public_sources": True,
        "synthetic": False,
        "collection_mode": "one_time_manual_public_web_research",
        "coverage": "non_exhaustive; a search sample, not nationwide market coverage",
        "live_provider_in_app": False,
        "external_supabase_connected": False,
        "confirmed_contactable_private_leads": 0,
        "contact_eligible": 0,
        "public_sources_reviewed": source_count,
        "public_procurement_notices": len(TENDERS),
        "public_discussions_reviewed": len(COMMUNITY_CASES),
        "historical_explicit_requests": sum(
            x["finding"] in ("explicit_service_recommendation_request", "explicit_request_but_stale")
            for x in COMMUNITY_CASES
        ),
        "source_access_notes": {
            "firecrawl_accounts": "primary+two backup accounts: 0 available credits on 2026-11-16",
            "unopened_primaries": "Some KIMDIS and TED origin pages blocked automated inspection; do not mark these offers as verified open.",
            "eligible_for_outreach": "None. Public posting or tender listings do not authorize unsolicited personal marketing.",
        },
        "tenders": list(TENDERS),
        "community_cases": list(COMMUNITY_CASES),
    }
