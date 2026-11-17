# ADR-0004: Scheduled retraining of the growth model, promoted only when it beats the current one

**Status:** Accepted (API built; web button and the weekly task pending)
**Date:** 2026-11-17
**Deciders:** API maintainers
**Extends:** `api/context/01-architecture.md` §12 (Growth Forecast)

## Context

`POST /forecasts` predicts 7 days for every crab with enough logs, using a small PyTorch model (`infrastructure/ml.GrowthLstm`): an **LSTM** reads the last days and a **linear regression output layer** (`nn.Linear`) turns its summary into the next day's width and weight. Both parts are trained together as one model, and "the model" below always means both. The model is trained by `ml/train_growth_model.py`, by hand. The current state has three gaps:

- **Training is never repeated.** New crabs, batches and seasons are added every day, but the model only learns from the logs it saw at its one training run.
- **Training doesn't check quality.** The script saves whatever it trains to `forecast_model_path`, replacing the previous model. A bad run replaces a good model, and there's no rollback.
- **The API never reloads.** `load_growth_forecaster()` is wrapped in `@functools.cache`, so a new checkpoint is used only after the API restarts.

The forces are:

- **Very little data.** About 14 days per crab, a few dozen crabs. Each retrain on more logs should help a lot, but every quality score is noisy.
- **The app never trains** (§12). Training stays out of the API process: it takes CPU, and two concurrent trainings would race on the model file.
- **Results must be explainable.** A forecast is tied to the `model_version` that made it, and the assistant explains stored numbers. The model must not change between two forecast calls without a recorded reason.
- **No worker process yet,** and no MLOps platform. One server, CPU only.
- **Training takes seconds** (2 features, 16 hidden units, a few hundred windows).

## Decision

Use **scheduled retraining with a champion/challenger gate.** This is the "continuous training" pattern: retrain on a schedule, score the new model, and promote it only if it wins.

```
 Task Scheduler / cron (weekly)            API process
   or Retrain model button                 ───────────
   (POST /forecasts/model-trainings → 202)
 ─────────────────────────────
 ml.retrain_growth_model                   POST /forecasts
   1. enough new data? ── no ──▶ exit        │
   2. train challenger on actual logs        ▼
   3. hold out each crab's last 7 days     load_growth_forecaster()
      score challenger, champion,            reads ml/models/growth/current.json
      straight-line baseline (MAE)           reloads when its mtime changes
   4. challenger wins? ── no ──▶ log, keep champion
   5. save growth-lstm-<version>.pt
      write current.json (atomic replace) ───────────▶ next forecast uses it
```

1. **When it runs:** on a weekly schedule, outside the API. It retrains only if there are at least `forecast_retrain_min_new_days` (default 20) new logged crab-days since the champion was trained. Until the worker exists, the OS scheduler (Windows Task Scheduler or cron) runs `poetry run python -m ml.retrain_growth_model` from `api/`. Later the same function runs as the worker job `jobs/growth_retrain.py`.
2. **Manual trigger from the web, DEVELOPER and ADMIN only.** This is the same pipeline started by a button, not a shortcut around it:
   - `POST /forecasts/model-trainings` (`DeveloperOrAdmin`, no body) answers `202 MODEL_TRAINING_QUEUED` with `{training_id, status: queued}` (02 §9). The API never trains in the request. Until the worker exists, it starts `ml.retrain_growth_model` as a **separate process**. Later it publishes `worker.model.retrain` and the worker runs it.
   - **Single-flight:** a lock file (`ml/models/growth/.training.lock`) allows one training at a time. A second request while one runs gets `409 MODEL_TRAINING_RUNNING`. The weekly schedule respects the same lock.
   - **Same gate:** a manual run skips only the "enough new data" check. It still holds out the last days, scores against the champion and the straight-line baseline, and promotes only if it wins. There's no force-promote.
   - **Status:** `GET /forecasts/model-trainings/{training_id}` returns `{training_id (UUID), status: queued | running | succeeded | failed | insufficient_data, outcome: promoted | rejected | skipped | null, trigger, started_by, started_at, finished_at, version, scores: {challenger, champion, baseline: {mae_width_mm, mae_weight_g, mape_pct}}, reason}`, read from `ml/models/growth/trainings/<training_id>.json`. The web polls it while a training runs. `GET /forecasts/model-trainings` pages the history (the last 100 kept), newest first; the latest is `?size=1`. The statuses follow 02 §9; whether the model was promoted is the separate `outcome`. A `model.training.finished` SSE event can replace polling later.
   - **Audit:** `model_training.create` when it's queued (the actor) and `model_training.list` for the history. The result is written to the training's record and, once promoted, shows in `current.json`.
   - **Web:** a **Retrain model** button next to **Run prediction** on the Logs page, shown only to DEVELOPER and ADMIN. It shows the result, for example "Not promoted: new model 2.1 mm off vs current 1.8 mm".
3. **What it trains on:** `LogServices.list_measured()`, so actual logs only. The model never learns from its own predictions.
4. **The gate:**
   - Hold out each crab's last `forecast_horizon_days` logged days. Train on the rest.
   - Forecast the held-out days and score the mean absolute error (width mm and weight g).
   - Score three models the same way: the **challenger** (the LSTM + linear regression model, just trained), the **champion** (the same kind of model, currently served) and a **straight-line baseline**. The baseline is a separate per-crab linear trend over the window, with no LSTM. It's a yardstick only and is never served.
   - Promote only if the challenger beats the baseline **and** is no worse than the champion.
   - If there's no champion yet, beating the baseline is enough.
   - If fewer than 3 crabs can be held out, don't promote, and log why.
   - After the gate passes, retrain the challenger on all data, including the held-out days, before saving.
5. **Versioned artifacts:** `ml/models/growth/growth-lstm-<YYYYMMDD-HHMMSS>.pt` (the file is `<version>.pt`), never overwritten. `ml/models/growth/current.json` names the champion and records `version`, `file`, `trained_at`, the training data size and the gate scores. It's written to a temp file and moved into place with `os.replace`, so the API never reads half a file. Keep the last 5 checkpoints. Rollback means pointing `current.json` back at an older file.
6. **Serving reload:** `load_growth_forecaster()` (`ServedForecaster`) rereads `current.json` at most every `forecast_reload_seconds` (60) and reloads when it names a new version. No API restart.
7. **Traceability:** the version that made each forecast is already returned as `model_version` and stored in the `forecast.create` audit event. Every retrain attempt, promoted or not, logs its scores.

## Options Considered

### Option A: Train once, retrain by hand when someone remembers

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low (the current state) |
| Cost | None |
| Scalability | Gets worse as data and seasons change |
| Team familiarity | High |

**Pros:** nothing to build, and forecasts are fully reproducible.
**Cons:** the model goes stale, a manual run overwrites the good model with no check, and the API needs a restart.

### Option B: Retrain inside `POST /forecasts` before predicting

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low to build, high to operate |
| Cost | CPU on every request |
| Scalability | Poor: concurrent requests race on the model file |
| Team familiarity | Medium |

**Pros:** always uses the newest data.
**Cons:** breaks "the app never trains". Two calls on the same day can give different numbers for the same crab, and `model_version` stops meaning anything. There's no quality gate, so a bad run serves bad forecasts immediately. Slower requests.

### Option C: Scheduled retrain, champion/challenger gate, versioned files, hot reload (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium: one script, one manifest file, a loader change |
| Cost | Seconds of CPU a week |
| Scalability | Fine for one farm; moves to the worker unchanged |
| Team familiarity | Uses only what the repo already has (torch, numpy, the logs service) |

**Pros:** the model keeps up with new data, a bad run can never replace a good model, rollback is one file edit, there are no restarts, and every forecast traces to a version.
**Cons:** more moving parts than A. The gate is noisy with so little data, so it can occasionally reject a better model or accept a slightly worse one. Someone has to set up and watch the scheduled task.

### Option D: A full MLOps stack (MLflow model registry, a pipeline orchestrator such as Airflow or Prefect)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High: new services to run and secure |
| Cost | Extra containers and upkeep |
| Scalability | Built for many models and teams |
| Team familiarity | Low |

**Pros:** experiment tracking, a model registry UI, staged rollouts.
**Cons:** far too heavy for one 2-feature model on one server. Revisit only if more models are added (for example a custom YOLO crab detector) or several people train models.

## Trade-off Analysis

The choice is between **freshness** and **stability**. Option B maximises freshness and gives up stability and traceability. Option A does the reverse. Option C gets both by splitting *when the model learns* (weekly, gated) from *when it's used* (every forecast, read-only).

The gate is what makes automation safe. Without it, automating retraining just automates the risk of replacing a good model with a bad one. Including the straight-line baseline matters most while data is small: if the LSTM can't beat a straight line, it isn't worth serving. That result is also the evidence for whether to keep the LSTM or move to gradient boosting.

Files plus a manifest replace a model registry. One `current.json` gives versioning, promotion and rollback, with no new service.

## Consequences

- **Easier:** keeping forecasts current without anyone remembering to retrain, retraining right after a big batch of new logs (the button), rolling back a bad model, and answering "which model made this forecast?".
- **Harder:** two new pieces need looking after, the scheduled task and `ml/models/growth/`. Disk use grows slowly; keeping 5 checkpoints of about 50 KB each is negligible.
- **Revisit when:**
  - The worker exists: move the schedule into `jobs/growth_retrain.py`.
  - Molt flags are logged: add days-since-molt as a feature, which changes the checkpoint format, so bump it.
  - More models appear: reconsider Option D.
  - The gate keeps rejecting the LSTM: switch the model family. The gate and files stay the same.
- **Not covered:** forecasts already saved as prediction logs aren't recomputed when a new model is promoted. They keep the version recorded in their audit event.

## Action Items

1. [x] Add `forecast_retrain_min_new_days` and `forecast_model_dir` (`ml/models/growth`) to `Settings`. `current.json` replaces `forecast_model_path`.
2. [x] Add holdout scoring (challenger, champion, straight-line baseline). It lives in `ml/retrain_growth_model.py` and reads days through `build_features()`, so training and evaluation share the same features.
3. [x] Add `ml/retrain_growth_model.py`: data check, train, gate, versioned save, atomic `current.json`, keep the last 5. `train_growth_model.py` stays for manual runs.
4. [x] Change `load_growth_forecaster()` to reload when `current.json` names a new version (checked at most every `forecast_reload_seconds`, 60).
4a. [x] Add the training lock and per-training records to the retrain script, then `POST /forecasts/model-trainings` (202, starts the script as a separate process, 409 while one runs), `GET /forecasts/model-trainings` and `GET /forecasts/model-trainings/{training_id}`, all `DeveloperOrAdmin`.
4b. [ ] Web: a **Retrain model** button next to **Run prediction** on the Logs page (DEVELOPER and ADMIN only) that polls the latest status and shows the scores and why a model was or wasn't promoted.
5. [ ] Register the weekly task (Task Scheduler on the server) and document the command in `AGENT.md` §2.
6. [x] Update `api/context/01-architecture.md` §12 once this ADR is accepted.
7. [ ] Later: move the schedule into the worker, and add a `system.model_promoted` event so the dashboard can show the active model version.
