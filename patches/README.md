# Two patches for intercropingroboticsdigitaltwin

Written against `main` of gitlab.sdu.dk/jehm/intercropingroboticsdigitaltwin as it stood on
28 September 2026. Both touch only `crop_model/`. Apply from the repository root:

```
git am 0001-Make-the-three-other-mow-criteria-configurable-like-.patch
git am 0002-Log-a-recommendation-window-once-on-its-first-day.patch
```

Either can be taken without the other.

## 0001: make the other three mow criteria configurable like mowThreshold

`apply_mow_decision` gains three keyword arguments, `min_height_cm`, `min_interval_days` and
`critical_comp_index`. Each defaults to the existing module constant, so every current caller
gets the same result as before. The trial config and `POST /api/crop/trial-config` accept
`minMowHeightCm`, `minMowIntervalDays` and `criticalCompIndex` beside `mowThreshold`; an unset
value means the rule's default. The local, REST and C# provider wrappers pass them through as
`mow_params`, so the decision layer stays the same whatever model produces the physics.

The three keys join the trial hash in `db.py` only when a trial sets them, so the hashes of
existing trials do not change and no stored run is re-persisted. The per-day criteria payload
already carries each threshold, so the stored recommendation rows record the values used.

One test is added, `test_mow_criteria_overrides`: explicit defaults give byte-identical output,
and a changed height reaches both the decision and the criteria payload through
`run_treatment_simulation`.

The dashboard is not changed. The three values can be set through the API today; an input next
to the threshold control in `crop_panel.js` would be the natural next step and is left to you.

## 0002: log a recommendation window once, on its first day

The window check at `mow_decision.py:107` compares the last logged date with yesterday. Only the
first day of a window is logged, so on the third day of a window the comparison fails and a new
window is logged. A continuous run is recorded as one window every second day. The patch tracks
whether yesterday was actionable instead.

On an uncut spring wheat season at the Spring 2026 trial settings, 2011 weather, 80 actionable
days were logged as 40 windows; with the patch they are the 2 contiguous runs they are. The cut
dates a closed loop produces are the same with and without the patch in all fifteen years
tested (2011 to 2025).

## Tests

`python -m pytest crop_model/test_crop_model_provider.py`: 7 passed, 1 failed, before and after
both patches. The failure is `test_rest_roundtrip_matches_local`, which stops at
`ModuleNotFoundError: No module named 'uvicorn'` because uvicorn is not installed on the machine
these were written on. It fails the same way on unpatched `main`.

Bolgaç Gülen, bolgacg1@gmail.com
