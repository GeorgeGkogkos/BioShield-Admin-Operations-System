"""BIO-20: focused official TED queries; no social crawling or private location.

Home Ilion searches place of performance in Attica/Evia/Corinthia; a *coarse*
opt-in travel zone adds a separate targeted query, never replaces home.
Failed official requests are explicit, not fabricated zero-result successes.
"""
import json
import re
import time
from datetime import datetime, timezone
from threading import RLock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from bioshield.geographic_focus import (
    LOCATIONS, location_policy, classify_notice,
    posted_eur_from_fields, official_nuts_from_value
)
from bioshield.ted_discovery import (
    ENDPOINT, CPVS, FIELDS, MAX_BODY_BYTES, MAX_NOTICES, _request_body,
    extract_notices, live_ted_report
)

CACHE_S = 900
MIN_FORCE_INTERVAL = 180
_lock = RLock()
_cache = {}
_last_force = 0.0

def _query_regions(codes):
    # Codes are static from the official NUTS-2024 registry, never user-provided.
    if not codes or not all(re.fullmatch(r"EL\d{3}", x) for x in codes):
        raise ValueError("Invalid official region code")
    today=datetime.now(timezone.utc).date()
    body=_request_body(today)
    standard=body["query"].split(" SORT BY ")[0]
    body["query"]= standard + " AND place-of-performance IN (" + " ".join(codes) + ") SORT BY publication-date DESC"
    body["fields"]=list(dict.fromkeys([*FIELDS, "place-of-performance", "total-value", "total-value-cur"]))
    return body

def query_official_region(codes, *, timeout=10):
    body=_query_regions(codes)
    request=Request(ENDPOINT, data=json.dumps(body).encode(), method="POST",
                    headers={"User-Agent":"BioShield-official-TED-region-research/1.0",
                             "Content-Type":"application/json",
                             "Accept":"application/json"})
    with urlopen(request,timeout=timeout) as resp:
        data=resp.read(MAX_BODY_BYTES+1)
        if len(data)>MAX_BODY_BYTES: raise ValueError("Oversized TED response")
    payload=json.loads(data)
    today=datetime.now(timezone.utc).date()
    records=extract_notices(payload,today=today)
    originals={str(x.get("publication-number")):x for x in payload.get("notices",[]) if isinstance(x,dict)}
    for row in records:
        orig=originals.get(row["notice_number"],{})
        nuts=official_nuts_from_value(orig.get("place-of-performance"))
        row["place_of_performance_nuts"]=nuts
        row["official_total_value_eur"]=posted_eur_from_fields(orig)
        row["geography_evidence"]=(
            "official_ted_performance_nuts" if nuts else
            "region_query_match_unlocated_field_review_required"
        )
    return {"status":"ok","source":"EU TED official place-of-performance query",
            "searched_at_utc":datetime.now(timezone.utc).isoformat(),
            "query":body["query"],"count":len(records),"notices":records}

def focused_report(*,home="ilion",temporary="",force=False):
    global _last_force
    if home not in LOCATIONS:
        raise ValueError("Unsupported permanent region")
    if temporary and temporary not in LOCATIONS:
        raise ValueError("Unsupported travel region")
    policy=location_policy(home=home,temporary=temporary)
    now=time.monotonic()
    key=home+":"+(temporary or "_home")
    with _lock:
        if force and now-_last_force<MIN_FORCE_INTERVAL:
            return {"status":"rate_limited","retry_after_seconds":int(MIN_FORCE_INTERVAL-(now-_last_force))+1,
                    "checked_at_utc":datetime.now(timezone.utc).isoformat(),
                    "policy":policy,"manual_executed":False}
        if force:_last_force=now
        entry=_cache.get(key)
        if not force and entry and entry[0]>now:
            return dict(entry[1],cached=True)
        # The home area is always searched and the *additional* travel area
        # is searched independently if it is not already within home scope.
        groups=[("permanent",tuple(policy["home_nuts"]))]
        extra=tuple(x for x in policy["temporary_nuts"] if x not in policy["home_nuts"])
        if extra: groups.append(("temporary",extra))
        lanes=[]
        unique={}
        for lane,codes in groups:
            try:
                result=query_official_region(codes)
            except (HTTPError,URLError,TimeoutError,OSError,ValueError,json.JSONDecodeError):
                result={"status":"unavailable","notices":[],"count":0,
                        "checked_at_utc":datetime.now(timezone.utc).isoformat()}
            result["lane"]=lane
            result["region_codes"]=list(codes)
            lanes.append(result)
            if result["status"]=="ok":
                for item in result["notices"]:
                    item=dict(item)
                    item["search_lane"]=lane
                    item["geographic_tier"]=classify_notice(item,policy)
                    # When official query returns a matching NUTS but the
                    # export field omitted, flag as query-scoped / unlocated.
                    if not item["place_of_performance_nuts"]:
                        item["geographic_tier"]="regional_query_requires_place_verification"
                    unique[item["id"]]=item
        ok=any(x["status"]=="ok" for x in lanes)
        output={
            "version":"bio20_focused_official_ted_v1",
            "status":"ok" if ok else "unavailable",
            "checked_at_utc":datetime.now(timezone.utc).isoformat(),
            "policy":policy,
            "lanes":[{"lane":x["lane"],"status":x["status"],"count":x["count"],
                      "searched_at_utc":x.get("searched_at_utc"),
                      "region_codes":x["region_codes"]} for x in lanes],
            "notices":sorted(unique.values(),key=lambda x:x["published_on"],reverse=True),
            "count":len(unique),
            "scope":"official_regional_ted_only",
            "temporary_location_coordinates_stored":False,
            "private_location_collected":False,
            "no_private_social_crawling":True,
            "notes":"Only official TED results; performance area reflects NUTS search, not verified street worksite. No proof of current bidding or nearby private demand.",
            "manual_executed":bool(force),
            "cached":False,
        }
        _cache[key]=(time.monotonic()+(CACHE_S if ok else 120),output)
        return output
