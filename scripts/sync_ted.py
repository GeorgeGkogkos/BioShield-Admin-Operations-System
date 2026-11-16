"""Scheduled official TED metadata-only sync. No synthetic requests or secrets."""
import argparse
import json
from pathlib import Path
from bioshield.ted_discovery import request_official_ted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/ted-current.json")
    args = parser.parse_args()
    report = request_official_ted(timeout=20)
    if report["status"] != "ok":
        raise SystemExit("TED provider was not verified; refusing snapshot publication")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Stable first seen from the exact prior official hourly snapshot;
    # the timestamp of a new reply/updated index never alters original date.
    try:
        previous=json.loads(output.read_text(encoding="utf-8")) if output.exists() else {}
        if not isinstance(previous,dict):previous={}
    except (ValueError,OSError):
        previous={}
    prior={item.get("id"):item for item in previous.get("notices",[])
           if isinstance(item,dict) and isinstance(item.get("id"),str)}
    checked_at=report["searched_at_utc"]
    for item in report["notices"]:
        old=prior.get(item["id"],{})
        item["first_seen_at_utc"]=old.get("first_seen_at_utc") or checked_at
        item["last_seen_at_utc"]=checked_at
    report["discovery_clock_semantics"]="first_seen_at_utc tracks initial observation in hourly snapshot since this feature; publication-date is a separate official field"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                      encoding="utf-8")
    print("Verified official TED results:", report["count"], "out of", report["raw_count"])
    print("Snapshot:", output)


if __name__ == "__main__":
    main()
