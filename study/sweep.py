"""Closed-loop sweep of their mow rule, unchanged, over completed weather years.

Policy: accept the first recommendation of each window (the date the rule logs), cut on that
day, re-run, repeat until the rule recommends nothing new. Trial shape from trials/Spring 2026.json.
"""
import os
import sys, pickle, json, itertools
from datetime import datetime
sys.path.insert(0, os.environ.get("CROP_MODEL_DIR", "crop_model"))
import mow_decision as md
from lintul1strip_sim import run_treatment_physics

W = pickle.load(open("weather_2011_2025.pkl", "rb"))

def season(year, threshold, height=None, crop="Vårhvede", sow=(5, 1), regrow=(3, 1)):
    if height is not None:
        md.MIN_MOW_HEIGHT_CM = height
    cuts = []
    for _ in range(12):
        phys = run_treatment_physics(crop, W[year], datetime(year, *sow), datetime(year, 10, 1),
                                     4, 5, year, datetime(year, *regrow), list(cuts))
        res = md.apply_mow_decision(phys, threshold)
        new = [r for r in res["mowRecommendations"] if not cuts or r["date"] > cuts[-1]]
        if not new:
            break
        cuts.append(new[0]["date"])
    return cuts, res

def doy(s):
    return datetime.strptime(s, "%Y-%m-%d").timetuple().tm_yday

if __name__ == "__main__":
    H = [5, 8, 10, 15, 20, 25, 30]
    T = [0.15, 0.20, 0.25, 0.30, 0.40, 0.50]
    YEARS = list(range(2011, 2026))
    rows = []
    for h, t, y in itertools.product(H, T, YEARS):
        cuts, _ = season(y, t, h)
        rows.append({"h": h, "t": t, "y": y, "cuts": cuts})
    md.MIN_MOW_HEIGHT_CM = 15.0
    json.dump(rows, open("grid.json", "w"))
    print("height | " + " | ".join(f"{t:.2f}" for t in T))
    for h in H:
        cells = []
        for t in T:
            f = [doy(r["cuts"][0]) for r in rows if r["h"] == h and r["t"] == t and r["cuts"]]
            n = sum(1 for r in rows if r["h"] == h and r["t"] == t and not r["cuts"])
            cells.append(f"{sum(f)/len(f):.1f}" + (f" ({n} none)" if n else ""))
        print(f"{h:>3} cm | " + " | ".join(cells))
