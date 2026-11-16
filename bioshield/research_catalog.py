"""BIO-19 — source-derived public-discussion search lexicon and review rules.

Adapted from the supplied 28-page Perplexity research (pp. 13–19, Nov 16 2026).
These are SEARCH HYPOTHESES only, not observed requests or crawl permissions.
No network calls, no personal details, no author discovery, no contact eligibility.
"""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit
import unicodedata
import re

# The PDF distinguishes explicit professional requests, problem descriptions,
# services, insect/rodent taxonomy, spaces and Attica local vocabulary.
KEYWORDS = {
    "services": {
        "label": "Υπηρεσίες",
        "terms": [
            "απεντόμωση", "απεντομώσεις", "απεντομωτής", "απεντομωτή",
            "απολύμανση", "απολυμάνσεις", "απολυμαντής", "μυοκτονία",
            "μυοκτονίες", "παρασιτοκτονία", "εντομοκτονία",
            "συνεργείο απεντόμωσης", "εταιρεία απεντόμωσης",
            "συνεργείο απολύμανσης", "ψεκασμός σπιτιού",
            "ψεκασμός πολυκατοικίας",
        ],
    },
    "pests": {
        "label": "Έντομα και τρωκτικά",
        "terms": [
            "κατσαρίδα", "κατσαρίδες", "κατσαριδάκια", "μικρές κατσαρίδες",
            "γερμανικές κατσαρίδες", "ξανθές κατσαρίδες",
            "κατσαρίδες στην κουζίνα", "κοριός", "κοριοί", "κοριούς",
            "έντομα στο στρώμα", "ζωύφια στο κρεβάτι",
            "ψύλλος", "ψύλλοι", "ψύλλους", "ψύλλοι στο σπίτι",
            "μυρμήγκι", "μυρμήγκια", "φωλιά μυρμηγκιών",
            "σαράκι", "σαράκια", "τερμίτες", "τρύπες στα ξύλα",
            "σκόρος", "σκόροι", "σκώρος", "σκόρος τροφίμων",
            "σκουληκάκια στο αλεύρι", "έντομα στο ρύζι", "ασημόψαρα",
            "ψαράκια υγρασίας", "σαρανταποδαρούσες", "μυγάκια",
            "σκνίπες", "κουνούπια", "σφήκες", "σφηκοφωλιά",
            "ποντίκι", "ποντίκια", "ποντικούς", "αρουραίος",
            "αρουραίοι", "αρουραίους", "περιττώματα ποντικιού",
        ],
    },
    "request_intent": {
        "label": "Ζητά επαγγελματία — υψηλή προτεραιότητα",
        "terms": [
            "ψάχνω κάποιον", "ψάχνουμε κάποιον", "ψάχνω συνεργείο",
            "ψάχνω εταιρεία", "χρειάζομαι επαγγελματία",
            "χρειαζόμαστε συνεργείο", "γνωρίζει κανείς", "ξέρει κανείς",
            "έχετε να προτείνετε", "έχετε κάποιον να συστήσετε",
            "μπορείτε να προτείνετε", "έχει κάποιος τηλέφωνο",
            "θέλω προσφορά", "ζητάω προσφορά",
            "ενδιαφέρομαι για απεντόμωση", "να έρθει κάποιος",
            "ποιος αναλαμβάνει", "ποιος μπορεί να έρθει",
            "υπάρχει διαθέσιμος", "χρειάζομαι άμεσα",
        ],
    },
    "problem_intent": {
        "label": "Περιγράφει πρόβλημα — χαμηλότερη προτεραιότητα",
        "terms": [
            "έχω πρόβλημα με", "έχουμε πρόβλημα με", "έχει γεμίσει το σπίτι",
            "γεμίσαμε κατσαρίδες", "βρίσκω συνέχεια",
            "βρήκα μέσα στο σπίτι", "εμφανίστηκαν πάλι", "ξαναβγήκαν",
            "δεν φεύγουν με τίποτα", "δεν μπορώ να τα ξεφορτωθώ",
            "πώς να απαλλαγώ", "τι να κάνω με", "έκανα ψεκασμό αλλά",
            "κάναμε απεντόμωση αλλά", "βγαίνουν από το σιφόνι",
            "έρχονται από τον φωταγωγό", "έχει φωλιά", "τι έντομο είναι",
            "ξέρει κάποιος τι είναι αυτά", "μικρά μαύρα έντομα",
            "μικρά καφέ έντομα", "ζουζούνια στην κουζίνα",
            "μαμούνια στο σπίτι", "σκουληκάκια στα ντουλάπια",
        ],
    },
    "spaces": {
        "label": "Χώροι",
        "terms": [
            "σπίτι", "διαμέρισμα", "μονοκατοικία", "πολυκατοικία",
            "κουζίνα", "μπάνιο", "υπνοδωμάτιο", "ντουλάπια",
            "υπόγειο", "ημιυπόγειο", "αποθήκη", "γκαράζ",
            "αυλή", "κήπος", "φωταγωγός", "φρεάτιο", "σιφόνι",
            "κατάστημα", "εστιατόριο", "φούρνος", "καφετέρια",
            "γραφείο", "κατάλυμα", "Airbnb", "δωμάτιο",
        ],
    },
    "attica": {
        "label": "Δήμοι και γειτονιές Αττικής",
        "terms": [
            "Αθήνα", "Αττική", "κέντρο Αθήνας", "Πειραιάς",
            "Πατήσια", "Κυψέλη", "Αμπελόκηποι", "Παγκράτι", "Νέος Κόσμος",
            "Σεπόλια", "Κολωνός", "Γκύζη", "Ζωγράφου", "Καισαριανή",
            "Βύρωνας", "Περιστέρι", "Αιγάλεω", "Ίλιον", "Πετρούπολη",
            "Χαϊδάρι", "Άγιοι Ανάργυροι", "Καματερό", "Αχαρνές",
            "Μενίδι", "Γαλάτσι", "Νέα Ιωνία", "Ηράκλειο Αττικής",
            "Νέα Φιλαδέλφεια", "Χαλάνδρι", "Μαρούσι", "Αγία Παρασκευή",
            "Βριλήσσια", "Κηφισιά", "Χολαργός", "Παπάγου", "Γέρακας",
            "Παλλήνη", "Καλλιθέα", "Μοσχάτο", "Ταύρος", "Νέα Σμύρνη",
            "Παλαιό Φάληρο", "Άλιμος", "Ηλιούπολη", "Άγιος Δημήτριος",
            "Ελληνικό", "Αργυρούπολη", "Γλυφάδα", "Βούλα", "Βάρη",
            "Βουλιαγμένη", "Νίκαια", "Κορυδαλλός", "Κερατσίνι",
            "Δραπετσώνα", "Πέραμα", "Κορωπί", "Παιανία", "Σπάτα",
            "Αρτέμιδα", "Ραφήνα",
        ],
    },
    "other_services": {
        "label": "Επιπλέον υπηρεσίες BioShield (εκτός λεξιλογίου PDF)",
        "terms": [
            "υδραυλικός", "υδραυλικά", "διαρροή", "βρύση", "σωλήνας",
            "καζανάκι", "θερμοσίφωνας", "απόφραξη", "αποφράξεις",
            "βουλωμένο σιφόνι", "βουλωμένη αποχέτευση",
            "φραγμένο φρεάτιο",
        ],
    },
}
AD_SIGNALS = (
    "αναλαμβάνουμε", "η εταιρεία μας", "οι υπηρεσίες μας",
    "κλείστε ραντεβού", "καλέστε μας", "προσφέρουμε υπηρεσίες",
    "πανελλαδική εξυπηρέτηση",
)
# Explicit PDF exclusions for demand-discussion research, not general B2B research.
EXCLUDED_DOMAINS = (
    "douleutaras.gr", "myconstructor.gr", "texnitesonline.gr",
    "vrisko.gr", "xo.gr",
)
SEARCH_TEMPLATES = (
    {"platform":"reddit","query":'site:reddit.com/r/greece "κατσαρίδες" "ψάχνω"'},
    {"platform":"reddit","query":'site:reddit.com/r/greece "κοριούς" "Αθήνα"'},
    {"platform":"reddit","query":'site:reddit.com/r/athina "απεντόμωση"'},
    {"platform":"insomnia","query":'site:insomnia.gr/forums "απεντόμωση" "προτείνετε"'},
    {"platform":"insomnia","query":'site:insomnia.gr/forums "έντομα" "κουζίνα"'},
    {"platform":"facebook","query":'site:facebook.com/groups "απεντόμωση" "γνωρίζει κανείς"'},
    {"platform":"facebook","query":'site:facebook.com/groups "κατσαρίδες" "Περιστέρι"'},
    {"platform":"facebook","query":'site:facebook.com/groups "ποντίκια" "ψάχνω"'},
    {"platform":"facebook","query":'site:facebook.com/groups "σφηκοφωλιά" "αναλαμβάνει"'},
)
CANDIDATE_RESEARCH_SOURCES = (
    {"id":"insomnia", "name":"Insomnia — δημόσιες συζητήσεις",
     "url":"https://www.insomnia.gr/forums/",
     "status":"review_terms_before_automation",
     "use":"Χειροκίνητος έλεγχος νέων σχολίων/θέματος, όχι αυτόματη ενεργή πηγή"},
    {"id":"facebook_local", "name":"Τοπικές ομάδες Facebook Αττικής",
     "url":"https://www.facebook.com/groups/",
     "status":"requires_meta_approved_access",
     "use":"Αρχική ανάρτηση και κανόνες ομάδας, όχι index snippet"},
    {"id":"facebook_greekrentals", "name":"Greekrentals / Greek Hosts",
     "url":"https://www.facebook.com/groups/greekrentals/",
     "status":"requires_meta_approved_access",
     "use":"Απαιτείται αρχική ανάρτηση, ημερομηνία, και κανόνες ομάδας"},
    {"id":"reddit_athina", "name":"Reddit r/athina / r/greece",
     "url":"https://www.reddit.com/r/athina/",
     "status":"requires_reddit_commercial_approval",
     "use":"Καμία εμπορική συλλογή χωρίς έγκριση, χωρίς Reddit RSS"},
    {"id":"google_alerts", "name":"Google Alerts — έρευνα ευρετηρίου",
     "url":"https://support.google.com/websearch/answer/4815696/create-an-alert",
     "status":"manual_monitoring_only",
     "use":"Ειδοποιεί για νέα ευρετηριασμένα αποτελέσματα, όχι τεκμήριο ημερομηνίας ποστ"},
)
TRANSLITERATION = {
    "katsarides":"κατσαριδες", "korioi":"κοριοι",
    "psylloi":"ψυλλοι", "pontikia":"ποντικια",
    "απολιμανση":"απολυμανση",
}
def normalize(value):
    value = unicodedata.normalize("NFD", str(value or "").casefold())
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = re.sub(r"\s+", " ", value).strip()
    # The PDF explicitly supplies informal Latin spellings and the common
    # misspelling "απολίμανση"; normalize them before lexical triage.
    for latin, greek in TRANSLITERATION.items():
        value = re.sub(r"(?<!\w)" + re.escape(latin) + r"(?!\w)", greek, value)
    return value

def _contains(text, terms):
    # Deliberately only a lexical hint, not ML or a verified identity/need.
    return tuple(term for term in terms if normalize(term) in text)

def exclude_url(url):
    """Research-policy exclusion, independent of official TED tender intake."""
    try:
        host = (urlsplit(url).hostname or "").lower()
    except (TypeError, ValueError):
        return True
    return not host or any(host == d or host.endswith("." + d) for d in EXCLUDED_DOMAINS)

def evaluate_discussion(*, text, published_at, original_post_verified,
                        source_url, now=None, discovered_at=None,
                        last_reply_at=None):
    """Fail-closed read-only triage. Last reply never refreshes original post."""
    if not isinstance(text, str) or len(text) > 12000:
        raise ValueError("Text must be a string of at most 12000 chars")
    if exclude_url(source_url):
        return {"review_status":"excluded_source","in_recent_primary_list":False,
                "contact_eligible":False}
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("now must include timezone")
    try:
        # Only the exact publication timestamp of the specific post/comment
        # determines eligibility; index date or last reply is not a substitute.
        stamp = datetime.fromisoformat(str(published_at).replace("Z","+00:00"))
        if stamp.tzinfo is None:
            raise ValueError("naive date")
        age = (now - stamp).total_seconds()
        valid_date = 0 <= age <= timedelta(days=7).total_seconds()
    except (ValueError, TypeError):
        valid_date = False
    clean = normalize(text)
    domain_hits = _contains(clean, KEYWORDS["pests"]["terms"] +
                            KEYWORDS["services"]["terms"] +
                            KEYWORDS["other_services"]["terms"])
    request_hits = _contains(clean, KEYWORDS["request_intent"]["terms"])
    problem_hits = _contains(clean, KEYWORDS["problem_intent"]["terms"])
    area_hits = _contains(clean, KEYWORDS["attica"]["terms"])
    ads = _contains(clean, AD_SIGNALS)
    review_ready = (original_post_verified is True and valid_date and
                    bool(domain_hits) and bool(area_hits) and
                    bool(request_hits or problem_hits) and not bool(ads))
    return {
        "review_status": ("needs_manual_review" if review_ready
                          else "out_of_primary_recent_attica_scope"),
        "in_recent_primary_list": review_ready,
        "priority": ("explicit_request" if request_hits else
                     "problem_only" if problem_hits else "no_intent"),
        "date_verified": bool(original_post_verified is True and valid_date),
        "attica_mentioned": bool(area_hits),
        "ad_signals": list(ads),
        "matched_services_or_pests": list(domain_hits[:8]),
        "contact_eligible":False,
        "source_url":source_url,
    }

def public_research_config():
    """No background work is implied by this metadata-only catalog."""
    from bioshield.source_policy import source_status
    policy = source_status()
    return {
        "version":"bio19_public_discussion_research_v1",
        "basis":"User-supplied Perplexity PDF, pages 13-19 (2026-11-16)",
        "keyword_groups":KEYWORDS,
        "ad_signals":list(AD_SIGNALS),
        "excluded_discussion_domains":list(EXCLUDED_DOMAINS),
        "examples":list(SEARCH_TEMPLATES),
        "candidate_sources":list(CANDIDATE_RESEARCH_SOURCES),
        "existing_provider_status":policy["platforms"],
        "publication_recency":{
            "default_days":7, "primary_order":"newest_verified_post_first",
            "buckets":[
                {"age":"0–24 ώρες","rank":"άμεσος έλεγχος"},
                {"age":"24–72 ώρες","rank":"πολύ πρόσφατο"},
                {"age":"3–7 ημέρες","rank":"πρόσφατο"},
                {"age":"7–30 ημέρες","rank":"μόνο με προαιρετικό φίλτρο"},
                {"age":">30 ημέρες","rank":"αρχείο"},
                {"age":"άγνωστη ημερομηνία","rank":"εκτός κύριας λίστας"},
            ],
            "original_post_date_required":True,
            "index_last_updated_is_not_publication_date":True,
            "new_reply_is_separate_signal":True,
            "unknown_attica_location":"review_outside_primary_list",
        },
        "automated_private_social_discovery_enabled":False,
        "reddit_rss_used":False,
        "contact_eligible":False,
        "no_provider_rights_granted_by_pdf":True,
        "note":"Keywords and proposed sources are research hypotheses, not confirmed offers, leads or crawling authorization.",
    }
