"""Fetch completed ERA5 years through the repository's own weather_provider and cache them."""
import os
import json, sys, dataclasses, pickle
sys.path.insert(0, os.environ.get("CROP_MODEL_DIR", "crop_model"))
from weather_provider import fetch_daily_weather
LAT, LON = (lambda w: (w["lat"], w["lon"]))(json.load(open(os.path.join(os.environ.get("CROP_MODEL_DIR", "crop_model"), "trials", "_active.json")))["weather"])  # the trial file's own weather point
out = {}
for y in range(2011, 2026):
    w = fetch_daily_weather(LAT, LON, y)
    out[y] = w
    zero = sum(1 for d in w[59:274] if d.Irradiance == 0 and d.MaximumTemperature == 0)
    print(y, len(w), "all-zero days Mar-Sep:", zero, flush=True)
pickle.dump(out, open("weather_2011_2025.pkl", "wb"))
