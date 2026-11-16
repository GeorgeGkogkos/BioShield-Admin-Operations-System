"""Synthetic CPU speed/quality bench; never substitutes for live source or DB tests."""
import argparse
import json
import statistics
import time

from .engine import canonical_url, classify, mock_run
from .fixtures import CASES

def quality() -> dict:
    tp = fp = tn = fn = 0
    for case in CASES:
        found = classify(case.text).is_request
        if found and case.expected: tp += 1
        elif found: fp += 1
        elif case.expected: fn += 1
        else: tn += 1
    p = tp / max(1, tp+fp)
    r = tp / max(1, tp+fn)
    return {"fixture_count": len(CASES), "tp": tp, "fp": fp, "tn": tn, "fn": fn,
            "precision": round(p,4), "recall": round(r,4),
            "f1": round(2*p*r/max(.000001,p+r),4), "synthetic_only": True}

def throughput(iterations: int=5000) -> dict:
    if not 1 <= iterations <= 100000: raise ValueError("Out-of-range iterations")
    timings = []
    start = time.perf_counter_ns()
    for i in range(iterations):
        c = CASES[i % len(CASES)]
        t0 = time.perf_counter_ns()
        classify(c.text)
        canonical_url("https://example.com/synthetic/"+c.id+"?utm_source=test&post=1")
        timings.append((time.perf_counter_ns()-t0) / 1000000)
    total = (time.perf_counter_ns()-start)/1000000
    timings.sort()
    return {"iterations":iterations, "elapsed_ms":round(total,2),
            "documents_per_second":round(iterations*1000/max(.001,total),1),
            "mean_item_ms":round(statistics.fmean(timings),4),
            "p50_item_ms":round(timings[int((len(timings)-1)*.50)],4),
            "p95_item_ms":round(timings[int((len(timings)-1)*.95)],4),
            "synthetic_only":True,
            "measures":"CPU classification and URL identity (no network, provider, database)",
            "not_measured":["real provider latency","internet throughput","Supabase writes","outreach eligibility"]}

def report(iterations=1200) -> dict:
    return {"version":"synthetic_v1","synthetic_only":True, "quality":quality(),
            "throughput":throughput(iterations),"mock_normal":mock_run(),
            "mock_fallback":mock_run(False),
            "production_supabase_connected":False, "live_provider_search_enabled":False}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--iterations",type=int,default=10000)
    parser.add_argument("--output",default="")
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()
    data=report(args.iterations)
    serial=json.dumps(data,ensure_ascii=False,indent=2)
    print(serial)
    if args.output:
        with open(args.output,"w",encoding="utf-8") as f:
            f.write(serial+"\n")
    if args.check and (data["quality"]["precision"] < .90 or
                       data["quality"]["recall"] < .85 or
                       data["mock_normal"]["duplicates_excluded"] == 0):
        parser.exit(1,"Synthetic quality gate failed\n")

if __name__=="__main__":
    main()
