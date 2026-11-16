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
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                      encoding="utf-8")
    print("Verified official TED results:", report["count"], "out of", report["raw_count"])
    print("Snapshot:", output)


if __name__ == "__main__":
    main()
