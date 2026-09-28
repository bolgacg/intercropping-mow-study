"""Standing on 1 May 2026: weather known to 30 April, the rest of the year from each analogue year and their mean."""
import os
import sys, pickle, dataclasses, json
from datetime import datetime
sys.path.insert(0, os.environ.get("CROP_MODEL_DIR", "crop_model"))
import mow_decision as md
from lintul1strip_sim import DailyWeather, run_treatment_physics
from weather_provider import fetch_daily_weather_range
from sweep import W
LAT, LON = (lambda w: (w["lat"], w["lon"]))(json.load(open(os.path.join(os.environ.get("CROP_MODEL_DIR", "crop_model"), "trials", "_active.json")))["weather"])  # the trial file's own weather point
known = fetch_daily_weather_range(LAT, LON, "2026-01-01", "2026-04-30")
pickle.dump(known, open("weather_2026_to_0430.pkl", "wb"))
K = len(known)  # 120 days
print("known days", K)
ANALOGUE = list(range(2015, 2026))
def spliced(fill):
    return known + fill[K:366]
def mean_year():
    out = []
    for i in range(366):
        ds = [W[y][i] for y in ANALOGUE]
        d = {}
        for f in dataclasses.fields(DailyWeather):
            vals = [getattr(x, f.name) for x in ds]
            d[f.name] = sum(vals) / len(vals) if isinstance(vals[0], (int, float)) else vals[0]
        out.append(DailyWeather(**d))
    return out
def closed(weather, t=0.25):
    cuts = []
    for _ in range(12):
        p = run_treatment_physics("Vårhvede", weather, datetime(2026, 5, 1), datetime(2026, 10, 1), 4, 5, 2026, datetime(2026, 3, 1), list(cuts))
        r = md.apply_mow_decision(p, t)
        new = [x for x in r["mowRecommendations"] if not cuts or x["date"] > cuts[-1]]
        if not new: break
        cuts.append(new[0]["date"])
    return cuts
runs = {str(y): closed(spliced(W[y])) for y in ANALOGUE}
runs["mean"] = closed(spliced(mean_year()))
for k, v in runs.items(): print(k, v)
json.dump(runs, open("analogue_2026.json", "w"), indent=1)
