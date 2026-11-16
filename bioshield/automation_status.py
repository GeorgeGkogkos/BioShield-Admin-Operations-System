"""BIO-20: verifiable hourly scheduled discovery heartbeat from public GitHub Actions.

A cron expression is not a timestamp. Report ONLY an actual workflow execution
returned by GitHub's official public API, or explicitly unavailable.
"""
import json
import time
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

RUNS_URL=("https://api.github.com/repos/"
          "GeorgeGkogkos/BioShield-Admin-Operations-System/"
          "actions/workflows/discovery.yml/runs?event=schedule&per_page=3")
_lock=Lock()
_cache={"until":0.0,"value":None}

def get_schedule_heartbeat():
    now=time.monotonic()
    with _lock:
        if _cache["value"] is not None and now<_cache["until"]:
            return dict(_cache["value"],cached=True)
        try:
            req=Request(RUNS_URL,headers={"User-Agent":"BioShield-public-discovery-health/1.0",
                                         "Accept":"application/vnd.github+json"})
            with urlopen(req,timeout=5) as resp:
                raw=resp.read(40_000)
            data=json.loads(raw)
            runs=data.get("workflow_runs",[])
            if not isinstance(runs,list) or not runs:
                output={"status":"no_verified_scheduled_runs","latest_run":None}
            else:
                item=runs[0]
                if item.get("event")!="schedule":
                    raise ValueError("Unverified schedule event")
                output={
                    "status":"ok","latest_run":{
                        "id":item.get("id"),
                        "event":"schedule",
                        "run_started_at":item.get("run_started_at"),
                        "created_at":item.get("created_at"),
                        "updated_at":item.get("updated_at"),
                        "status":item.get("status"),
                        "conclusion":item.get("conclusion"),
                        "url":item.get("html_url"),
                    },
                    "source":"GitHub Actions official workflow_runs API",
                    "expected_schedule":"17 * * * *",
                    "schedule_not_guaranteed_exact_time":True,
                }
        except (HTTPError,URLError,OSError,ValueError,TypeError,json.JSONDecodeError):
            output={"status":"unavailable","latest_run":None,
                    "message":"Δεν έγινε ζωντανή επαλήθευση εκτέλεσης GitHub Actions"}
        _cache.update(until=time.monotonic()+300,value=output)
        return dict(output,cached=False)
