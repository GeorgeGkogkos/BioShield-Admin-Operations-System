"""Source-policy registry for BioShield public demand research.

A commercial crawl is not automatically permitted because pages are public or
a third-party crawler can reach them. No social/forum scraping is performed here.
"""
from datetime import datetime, timezone

SERVICE_LABELS = {
    "pest_control": "Απεντόμωση",
    "rodent_control": "Μυοκτονία",
    "disinfection": "Απολύμανση",
    "plumbing": "Υδραυλικός",
    "drain_unblocking": "Αποφράξεις",
}

SOURCES = (
    {
        "id": "ted", "name": "TED — Ευρωπαϊκές δημόσιες συμβάσεις",
        "kind": "official_open_data", "status": "enabled_official_api",
        "method": "official_api", "original_verification": "official_metadata",
        "services": list(SERVICE_LABELS),
        "url": "https://ted.europa.eu",
        "note": "Μόνο δημοσιευμένες δημόσιες προκηρύξεις· η διακήρυξη απαιτεί έλεγχο.",
    },
    {
        "id": "reddit", "name": "Reddit",
        "kind": "social_forum", "status": "blocked_pending_written_commercial_approval",
        "method": "firecrawl_or_tinyfish_only_after_approval",
        "original_verification": "not_configured",
        "services": list(SERVICE_LABELS),
        "url": "https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy",
        "note": "Δεν χρησιμοποιείται RSS. Δεν επιτρέπεται εμπορικό crawl χωρίς ρητή άδεια Reddit· Firecrawl/TinyFish δεν αλλάζουν τους όρους.",
    },
    {
        "id": "facebook", "name": "Facebook",
        "kind": "social_network", "status": "blocked_pending_platform_permission",
        "method": "approved_meta_api_only",
        "original_verification": "not_configured",
        "services": list(SERVICE_LABELS),
        "url": "https://www.facebook.com/legal/automated_data_collection_terms",
        "note": "Η Meta απαιτεί εξουσιοδότηση για αυτοματοποιημένη συλλογή, ακόμη και από δημόσιες σελίδες.",
    },
    {
        "id": "instagram", "name": "Instagram",
        "kind": "social_network", "status": "blocked_pending_platform_permission",
        "method": "approved_meta_api_only",
        "original_verification": "not_configured",
        "services": list(SERVICE_LABELS),
        "url": "https://www.facebook.com/legal/automated_data_collection_terms",
        "note": "Αυτόματη εμπορική ανάγνωση δημόσιων αναρτήσεων μόνο μέσω κατάλληλης έγκρισης.",
    },
    {
        "id": "tiktok", "name": "TikTok",
        "kind": "social_network", "status": "blocked_pending_eligible_api_access",
        "method": "approved_platform_api_only",
        "original_verification": "not_configured",
        "services": list(SERVICE_LABELS),
        "url": "https://developers.tiktok.com/docs/en/research-api-faq",
        "note": "Το Research API δεν είναι για εμπορικά lead-generation συστήματα.",
    },
    {
        "id": "x", "name": "X (Twitter)",
        "kind": "social_network", "status": "blocked_pending_platform_permission",
        "method": "approved_x_api_only",
        "original_verification": "not_configured",
        "services": list(SERVICE_LABELS),
        "url": "https://x.com/en/tos",
        "note": "Το X απαγορεύει μη εγκεκριμένο crawling/scraping. Απαιτείται επίσημη πρόσβαση API ή ρητή έγγραφη άδεια. Δεν υπάρχει ενεργή συλλογή.",
    },
    {
        "id": "independent_forums", "name": "Ανεξάρτητα ελληνικά forums",
        "kind": "independent_public_web", "status": "candidate_sources_found_policy_review_required",
        "method": "permission_robots_terms_review_then_bounded_crawl",
        "original_verification": "public_index_only",
        "services": list(SERVICE_LABELS),
        "url": "https://www.howtofixit.gr/forum/forumdisplay.php?f=358",
        "note": "Εντοπίστηκε κατηγορία «Υδραυλικά & Θέρμανση». Η αρχική πρόσβαση/robots/όροι και νέες αναρτήσεις δεν έχουν επαληθευθεί για αυτοματοποίηση.",
    },
)

def source_status():
    return {
        "version": "bio17_source_policy_v1",
        "services": SERVICE_LABELS,
        "platforms": list(SOURCES),
        "automated_social_crawls_enabled": False,
        "automated_forum_crawls_enabled": False,
        "reddit_rss_used": False,
        "firecrawl_credit_observation": {
            "checked_on": "2026-11-16",
            "primary_remaining": 0,
            "second_backup_remaining": 0,
            "third_backup_remaining": 0,
            "fourth_backup_remaining": 1400,
            "account_order": ["primary", "second_backup", "third_backup", "fourth_backup"],
            "operational_fallback_status": "connected_to_chat_only_not_to_render_runtime",
            "note": "Balances actually checked 2026-11-16; fourth connector has 1400. "
                    "ChatGPT connectors do not automatically make keys available to "
                    "the Render process. No server-side account rotation is claimed.",
        },
        "verified_new_private_customer_requests": 0,
        "contact_eligible": 0,
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "collection_note": (
            "Only TED has live automatic discovery. Social/forum/X sources require "
            "confirmed rights and original publication evidence; indexed search "
            "results alone do not become leads."
        ),
    }

ALLOWED_CRAWL_PROVIDERS = frozenset({"firecrawl", "tinyfish"})

def permitted_to_crawl(*, source_id, provider, provider_credits,
                       written_commercial_permission=False,
                       robots_and_terms_verified=False):
    """Explicit fail-closed permission gate, not a login/robots bypass."""
    if provider not in ALLOWED_CRAWL_PROVIDERS:
        return False
    if source_id not in {item["id"] for item in SOURCES}:
        return False
    if source_id == "ted":
        return False  # TED uses an official API, not third-party scraping.
    if not isinstance(provider_credits, int) or isinstance(provider_credits, bool) or provider_credits <= 0:
        return False
    if source_id in {"reddit", "facebook", "instagram", "tiktok", "x"}:
        return written_commercial_permission is True and robots_and_terms_verified is True
    return robots_and_terms_verified is True
