# Re-running the study

Needs Python 3 and the `crop_model/` folder of the platform repository; nothing else is installed.

```
export CROP_MODEL_DIR=/path/to/intercropingroboticsdigitaltwin/crop_model
python3 fetch_weather.py   # ERA5 years 2011 to 2025 through weather_provider, about a minute
python3 sweep.py           # 7 heights x 6 thresholds x 15 years, closed loop, about two minutes
python3 analogue.py        # the 1 May 2026 runs; fetches 2026 weather to 30 April
```

`sweep.py` prints the grid on the page and writes `grid.json`. Accept policy: cut on the first day
of each logged recommendation window, re-run with that cut, repeat until nothing new is recommended.
