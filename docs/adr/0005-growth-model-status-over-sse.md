# ADR-0005: Tell the web when the growth model is missing, due or retraining, over SSE

**Status:** Accepted
**Date:** 2026-11-18
**Deciders:** API and web maintainers
**Extends:** [ADR-0004](0004-growth-model-retraining.md) (action 4b), `api/context/01-architecture.md` §8 and §12

## Context

Since ADR-0004, `POST /forecasts` answers `503 FORECAST_MODEL_UNAVAILABLE` until a model is promoted, and a served model goes stale as new crab-days are logged. Nobody finds out until they press **Forecast 7 days** and get an error. The Dashboard growth card shows a flat Predicted line with no reason.

The forces:

- **The model's state changes rarely.** It is missing once, becomes due every few weeks, and retrains in seconds to minutes. Only a running training changes from one moment to the next.
- **Training runs in its own process** (ADR-0004) that has no broker connection, and the weekly schedule runs it outside the API entirely.
- **"Due" depends on the logs.** It's the number of logged crab-days since the champion was trained, which changes with every `POST /logs`.
- **The broker is optional** (`rabbitmq_enabled=false` by default). Pages must still say the right thing without it.
- The team asked for live updates (SSE), not a page that has to be reloaded.

## Decision

**A model-status snapshot, pushed over SSE, with a plain read for first paint.**

```
 retrain process (manual or weekly)        API process
 ─────────────────────────────────        ───────────
 writes current.json, trainings/*.json,    ModelStatusWatcher (lifespan, needs the broker)
 .training.lock                              every 5 s: registry.fingerprint() changed?
                                             every 60 s: recompute anyway (new logs → due)
                                             status differs from the last one? ── publish ──▶ crabfarm.events
                                                                                              forecast.model
 Next.js page (server) ── GET /forecasts/model ──▶ ModelStatus (first paint)
 Next.js client ── /api/stream/forecasts/stream ──▶ GET /forecasts/stream
                                                     1. a forecast.model snapshot at once
                                                     2. every forecast.model event from the hub
```

1. **One shape, `ModelStatus`:** `state` (`training` > `missing` > `due` > `ready`, first match wins), `version`, `trained_at`, `new_logged_days`, `retrain_after_days` (`forecast_retrain_min_new_days`), and `training` (the latest training record, running or finished, so the web can explain a failed or rejected run). `training` means the latest record is `queued` or `running`, its id holds the lock, and it started within `forecast_training_timeout_minutes`.
2. **`GET /forecasts/model`:** any signed-in role (STAFF see why predictions are off; only the action is limited). Not audited, since every Logs and Dashboard visit reads it.
3. **`GET /forecasts/stream`:** any signed-in role. It sends the snapshot first, so a client never waits for a change to learn the state. After that it sends each `forecast.model` event. It follows the usual SSE rules (01 §8: heartbeat, ends at token expiry, 503 without the broker).
4. **The watcher lives in the API, not in the training process.** `ModelStatusWatcher` reads only what the registry already writes, plus one measured-logs query. The retrain script stays broker-free, and scheduled and manual runs are reported the same way. Each API process runs one watcher; duplicate identical snapshots from several processes are harmless.
5. **Web:** one shared `custom-forecast-model-alert` on Logs (below the header, above the filters) and on the Dashboard (directly above the growth card it explains):
   - `missing` → **Medium** "Growth forecasts are off", and **Forecast 7 days** is disabled with that reason.
   - `due` → **Low** "Growth model is due for a retrain".
   - `training` → a neutral progress alert, "Retraining the growth model".
   - `ready` → nothing.
   - **Retrain model** (ADMIN and DEVELOPER) sits inside the alert, which completes ADR-0004 action 4b. The 202 response switches the alert to `training` at once, because the server has confirmed it. The person who started the run gets a toast with the outcome and the gate's reason.
   - Without a live stream (broker off, or reconnecting) and while a training runs, the web polls `GET /forecasts/model` every 5 s.

## Options Considered

### Option A: Status endpoint + polling only
| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | A request per open page per interval |
| Scalability | Fine for one farm |
| Team familiarity | High |

**Pros:** no broker dependency, nothing new in the lifespan.
**Cons:** polling all day for a state that changes weekly, or stale pages if it polls rarely. Not what was asked for.

### Option B: The training process publishes to RabbitMQ
| Dimension | Assessment |
|---|---|
| Complexity | Medium: an AMQP connection in a short CLI script, plus the same in the weekly task |
| Cost | Low |
| Scalability | Good |
| Team familiarity | Medium |

**Pros:** events fire the moment a training changes state.
**Cons:** the script then needs the broker, and a run while the broker is down is lost. It still can't report "due", which changes on `POST /logs`, not on training.

### Option C: Snapshot over SSE, published by an API-side watcher (chosen)
| Dimension | Assessment |
|---|---|
| Complexity | Medium: one lifespan task, one stream, one read |
| Cost | One cheap file check every 5 s, one measured-logs query a minute per process |
| Scalability | Fine for one farm; moves to the worker unchanged |
| Team familiarity | Reuses StreamHub, `publish()`, `useEventStream` and the registry |

**Pros:** one source of truth (the registry plus the logs). It covers scheduled runs, manual runs and new logs, and the training script stays as it is.
**Cons:** up to 5 s of delay on training changes and up to 60 s on "due". Several API processes publish duplicates.

## Trade-off Analysis

Option B is the most "event-driven", but it only covers half the states and couples a CLI script to the broker. Option C accepts a few seconds of latency, which nobody notices for a retrain that takes minutes, in exchange for one place that knows every reason the model needs attention. The snapshot-first stream avoids the usual SSE gap where a client connects between events and sees nothing.

## Consequences

- **Easier:** knowing why predictions are missing without trying them, retraining from where the problem is shown, and reporting the gate's verdict.
- **Harder:** one more lifespan task to keep healthy, and one more stream binding (`forecast.#`).
- **Revisit when:**
  - The worker exists: it can publish `forecast.model` itself and the watcher goes away.
  - `POST /logs` gets an event of its own: "due" can be pushed at once instead of on the 60 s recompute.

## Action Items

1. [x] `ModelRegistry.fingerprint()`, `ModelStatus` and `ModelStatusServices`, `GET /forecasts/model`, `GET /forecasts/stream`.
2. [x] `ModelStatusWatcher` in the lifespan, plus the hub binding `forecast.#`.
3. [x] Web: global types, fetchers, `retrainModel` action, `useForecastModelStream`, `custom-forecast-model-alert`, used on Logs and the Dashboard.
4. [x] Context docs, role permissions and ADR-0004 4b.
