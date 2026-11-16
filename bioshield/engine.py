"""Conservative keyword prototype for offline ONLY. NOT ML or calibrated accuracy."""
from dataclasses import dataclass
import hashlib
import ipaddress
import re
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

def normalize(text: str) -> str:
    norm = unicodedata.normalize("NFD", text.casefold())
    return re.sub(r"\s+", " ", "".join(c for c in norm if unicodedata.category(c) != "Mn")).strip()

SERVICE = {
    # Specific drain blockage first: "φραγμένη σωλήνα" must not be
    # mislabeled as generic plumbing simply because it says σωλήνα.
    "drain_unblocking": (
        "αποφραξ", "αποφρακτ", "βουλωμ", "βουλωσε", "βουλωμεν",
        "φραγμεν", "ξεβουλω", "αποχετευ", "σιφων", "φρεατι",
        "drain unblock", "blocked drain", "clogged drain",
    ),
    "plumbing": (
        "υδραυλικ", "βρυση", "διαρρο", "σωλην", "καζανακ",
        "θερμοσιφων", "σπασε ο σωληνα", "plumber", "plumbing",
    ),
    "rodent_control": ("μυοκτον", "ποντικ", "αρουραι", "τρωκτικ"),
    "disinfection": ("απολυμαν",),
    "pest_control": ("απεντομ", "κατσαριδ", "κορι", "μυρμηγκ", "ψυλλ", "σαρακ", "τερμιτ", "σκορ", "ασημοψαρ", "ψαρακ", "σκουληκακ", "σφηκο", "κουνουπ", "εντομοκτον"),
}
REQUEST = ("ψαχνω", "αναζητω", "αναζητουμε", "χρειαζομαι", "χρειαζομαστε",
           "θελω", "θελουμε", "ζηταω", "ζηταμε", "μπορει καποιος", "προτεινετε",
           "προτεινει", "που θα βρω", "που μπορω να βρω", "υπαρχει συνεργειο",
           "εχει καποιος διαθεσιμο", "ποιος αναλαμβανει", "ραντεβου", "προσφορα για")
# PDF-inspired explicit request phrases extend, but never authorize outreach.
from bioshield.research_catalog import KEYWORDS as RESEARCH_KEYWORDS, AD_SIGNALS
REQUEST += tuple(RESEARCH_KEYWORDS['request_intent']['terms'])
EXCLUDE = ("αναλαμβανουμε", "προσφερουμε", "προσφερει", "υπηρεσιες μας",
           "καλεστε μας", "ελα σε εμας", "εκπτωση", "οδηγος", "πουλαω",
           "πωλω", "πωλουνται", "προσωπικο", "πληροφοριες για το πως",
           "τι κανω", "τι κανουμε", "περυσι", "να αγορασω", "εξοπλισμο",
           "πωληση", "σεμιναριο")
EXCLUDE += tuple(AD_SIGNALS)

@dataclass(frozen=True)
class Decision:
    is_request: bool
    category: str | None
    confidence: float
    reason: str
    contact_eligible: bool = False

def classify(text: str) -> Decision:
    if not isinstance(text, str) or len(text) > 12000:
        raise ValueError("Text must be at most 12000 characters")
    clean = normalize(text)
    category = next((k for k, v in SERVICE.items() if any(normalize(stem) in clean for stem in v)), None)
    if category is None:
        return Decision(False, None, .02, "out_of_service_scope")
    if any(normalize(term) in clean for term in EXCLUDE):
        return Decision(False, category, .07, "advertisement_or_non_hiring")
    if any(normalize(term) in clean for term in REQUEST):
        return Decision(True, category, .90, "explicit_hiring_intent")
    return Decision(False, category, .25, "discussion_without_request")

def canonical_url(value: str) -> str:
    """Normalize URL for provenance dedup; NEVER fetch remote data."""
    if not isinstance(value, str) or not 1 <= len(value) <= 2048:
        raise ValueError("Invalid URL")
    try:
        parsed = urlsplit(value.strip())
        if parsed.scheme.lower() not in ("http", "https") or not parsed.hostname:
            raise ValueError("Non-HTTP URL")
        if parsed.username is not None or parsed.password is not None:
            raise ValueError("Embedded credentials")
        host = parsed.hostname.encode("idna").decode("ascii").lower()
        if host in ("localhost", "localhost.localdomain") or host.endswith((".local", ".internal")):
            raise ValueError("Internal host")
        try:
            ip = ipaddress.ip_address(host)
        except ValueError:
            ip = None
        if ip is not None and not ip.is_global:
            raise ValueError("Non-public IP")
        port = parsed.port
        if port is not None and not 1 <= port <= 65535:
            raise ValueError("Invalid port")
    except (ValueError, UnicodeError) as exc:
        raise ValueError("Invalid or unsafe source URL") from exc
    hostport = "[" + host + "]" if ":" in host else host
    if port and port != (443 if parsed.scheme == "https" else 80):
        hostport += ":" + str(port)
    query = sorted((k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
                   if not k.casefold().startswith("utm_")
                   and k.casefold() not in {"fbclid", "gclid", "yclid", "mc_cid", "mc_eid"})
    return urlunsplit((parsed.scheme.lower(), hostport,
                       parsed.path.rstrip("/") or "/", urlencode(query), ""))

def source_key(url: str) -> str:
    return hashlib.sha256(canonical_url(url).encode()).hexdigest()

