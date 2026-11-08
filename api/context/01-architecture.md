# 01 — API Architecture

These are the architecture rules for `api/`. Read this file before adding or changing any backend code.
If code and this document disagree, the code is wrong unless this document is updated first.

---

## 1. Style

- **Modular monolith.** One deployable codebase, split into **domains**. Each domain is split into **resources**.
- **Layered inside every resource:** router → services → models. Schemas form the contract at the edges.
- **Two processes, one codebase:**
  - `api`: FastAPI (HTTP, SSE, publishing commands).
  - `worker`: a custom long-running process (camera capture, YOLOv8, growth forecasts, background consumers).
  Both import the same `app.*` packages.

## 2. Stack

| Concern | Choice |
|---|---|
| HTTP framework | FastAPI |
| Validation / DTOs | Pydantic v2 |
| ORM / tables | SQLModel (sync `Session`) on PostgreSQL via psycopg 3 |
| Migrations | Alembic (`api/migrations`) |
| Auth | JWT (PyJWT) + role/permission checks (`core/security`) |
| Broker | RabbitMQ with the MQTT plugin (devices speak MQTT, the backend speaks AMQP) |
| Realtime to browser | Server-Sent Events (SSE) |
| Computer vision | YOLOv8 (crab detection + carapace width), QR decoding |
| AI orchestration | LangGraph (one router graph, one file per node) |
| LLM provider | DeepInfra, through its OpenAI-compatible endpoint (`langchain-openai` `ChatOpenAI` with `base_url`) |
| Growth forecasting | scikit-learn-compatible regressor (e.g. LightGBM / GradientBoosting), pandas for features, saved with `joblib` |

## 3. System Data Flow

```
LIVE SENSOR DATA (one way)
Device ──MQTT──▶ RabbitMQ ──AMQP──▶ FastAPI GET /sensors/stream ──SSE──▶ Next.js live charts
                    └──AMQP──▶ worker (persists readings to PostgreSQL)

CONTROL COMMANDS
Next.js ──POST──▶ FastAPI POST /devices/{id}/commands ──AMQP──▶ RabbitMQ ──MQTT──▶ Device runs command

CRAB MEASUREMENT
Camera ──RTSP/USB──▶ worker (YOLOv8) ──AMQP event──▶ FastAPI GET /detections/stream ──SSE──▶ Next.js
(live only: vision results are not stored in the database)

QR SCAN
Next.js ──POST image──▶ FastAPI POST /qr/scan ──▶ decode ──▶ look up crab/batch ──▶ JSON response

ASSISTANT (one chat, routed by intent)
Next.js ──POST {thread_id, message}──▶ FastAPI /assistant/chat ──▶ LangGraph: intent_router → intent node
                                                                    │        └──tools──▶ domain services (read-only)
                                                                    └──SSE token stream──▶ Next.js
Conversation memory = LangGraph in-memory checkpointer (keyed by thread_id). Temporary: no saved history, nothing in the database.

GROWTH FORECAST (7 days from the last 14 days of logs)
worker scheduler (nightly) ─┐
Next.js ──POST──▶ FastAPI POST /forecasts ─────────────AMQP worker.forecast.run──┤
                                                                                  ▼
                worker: load 14-day logs → features → ML model → 7 daily predictions → PostgreSQL
                   └──AMQP forecast.completed.{batch_id}──▶ FastAPI SSE ──▶ Next.js
Next.js ──GET──▶ FastAPI GET /forecasts/... ──▶ stored forecast rows
Assistant ──tool──▶ forecast service (reads stored rows) ──▶ LLM explains the numbers
```

### Broker topology

The RabbitMQ MQTT plugin maps MQTT topics onto the `amq.topic` exchange and turns `/` into `.`.

| Purpose | MQTT topic (device side) | AMQP routing key (backend side) | Exchange |
|---|---|---|---|
| Sensor readings | `farm/{device_id}/sensors/{sensor_type}` | `farm.{device_id}.sensors.{sensor_type}` | `amq.topic` |
| Device commands | `farm/{device_id}/cmd` | `farm.{device_id}.cmd` | `amq.topic` |
| Device ack/status | `farm/{device_id}/status` | `farm.{device_id}.status` | `amq.topic` |
| Vision results | — | `vision.detection.{camera_id}` | `crabfarm.events` (topic) |
| Worker control | — | `worker.camera.{start\|stop}` | `crabfarm.events` (topic) |
| Forecast request | — | `worker.forecast.run` | `crabfarm.events` (topic) |
| Forecast finished | — | `forecast.completed.{batch_id}` | `crabfarm.events` (topic) |

- Routing keys, exchange names and queue names are constants in `app/infrastructure/messaging/topics.py`. Never write them as string literals anywhere else.
- Every message body is JSON and is validated against a Pydantic schema on both publish and consume.

## 4. Folder Layout

```
api/app/
├── main.py                 # create_app(), mounts every domain's ROUTERS, lifespan starts/stops infra
├── core/                   # cross-cutting, no business features
│   ├── config.py           # Settings (pydantic-settings)
│   ├── database.py         # engine, SessionFactory, get_db, Base
│   ├── exceptions.py       # FieldException, handlers
│   ├── security/           # jwt_manager, roles, permissions
│   └── audit/              # audit trail
├── infrastructure/         # technical clients only, no business rules, no routers
│   ├── messaging/          # RabbitMQ connection, publisher, consumer, topics.py
│   ├── streaming/          # SSE hub: AMQP → in-process fan-out → per-client queues
│   ├── vision/             # YOLOv8 loader + width calc, QR decoder
│   ├── ml/                 # forecast model loader (joblib), model registry/version lookup
│   └── ai/                 # LLM client factory, in-memory LangGraph checkpointer
├── authentication/
│   ├── api.py              # ROUTERS
│   └── users/
├── crab_management/
│   ├── api.py
│   ├── crab/
│   ├── logs/
│   └── forecasts/          # 7-day growth forecasts: request, read, features, prediction rows
├── monitoring/
│   ├── api.py
│   ├── sensors/            # readings, SSE stream, thresholds
│   └── devices/            # device registry, commands
├── vision/
│   ├── api.py
│   ├── detection/          # camera start/stop, live SSE stream of results (no tables)
│   └── qr/                 # QR scan
├── assistant/
│   ├── api.py
│   └── chat/               # single chat endpoint + LangGraph (graph/); no tables
└── worker/
    ├── __main__.py         # python -m app.worker
    ├── runner.py           # starts/stops jobs, handles signals
    └── jobs/               # camera_detection.py, sensor_persistence.py, growth_forecast.py

api/ml/                     # OUTSIDE app/: offline training only, never imported by app/
├── train_growth_model.py   # builds dataset from DB, trains, evaluates, saves artifact
└── models/                 # saved artifacts (gitignored), e.g. growth_v3.joblib
```

Domains: `authentication`, `crab_management`, `monitoring`, `vision`, `assistant`.
To add a domain, update this file first.

## 5. Resource Anatomy (non-negotiable)

Every resource (`<domain>/<resource>/`) has these parts:

| Part | Responsibility | Must NOT |
|---|---|---|
| `__init__.py` | The resource's public surface. Re-exports router, services, schemas and dependencies through `__all__`, so callers import the **package**, never a file inside it. | contain logic |
| `router` | HTTP only: declare the endpoint, inject dependencies, call **one** service method, return a schema. | query the DB, hold business rules, touch the broker |
| `schemas` | Pydantic v2 request/response/event models (`*Request`, `*Response`, `*Read`, `*Event`). | import models or services |
| `models` | SQLModel `table=True` classes, inheriting `core.Base`. Leave it out **only** when the resource owns no tables (e.g. `assistant/chat`, §11). | contain business logic or import schemas |
| `services` | Business logic: queries, transactions, rules, publishing via `infrastructure`, audit. Class with methods (`CrabServices`). | import `fastapi` (except `HTTPException`-free domain errors), know about request objects |
| `dependencies` | `Depends()` providers: current user, permission guards, "load resource or 404". | contain business rules |

Each **domain** also has:

| Part | Responsibility |
|---|---|
| `api.py` | `ROUTERS = [...]`, the list of resource routers in this domain. `main.py` is the only consumer. |
| `__init__.py` | Re-exports `ROUTERS`. |

### File vs. folder

A layer **starts as a single file** (`router.py`, `schemas.py`, `models.py`, `services.py`, `dependencies.py`).
When it holds more than one concern (for example two entities, or auth and user endpoints), turn it into a **folder** with the same name. The folder's `__init__.py` re-exports the same public names, so imports elsewhere don't change.

```
crab/router.py            →   crab/router/__init__.py   (exports `router`)
                               crab/router/crabs.py
                               crab/router/batches.py
```

Inside a folder, name files by entity or concern: `crab_services.py`, `batch_services.py`, `user_schemas.py`.

### Resource router conventions

- One `APIRouter(prefix="/<resource-plural>", tags=["<Domain> - <Resource>"])` per resource.
- `main.py` adds `settings.api_prefix`. Routers never hard-code it.
- Every endpoint declares `response_model`, `status_code` and its permission dependency.
- Every endpoint input (body, path, query, header, upload) and output is validated by Pydantic. Full rules and status codes are in `02-api-design.md`.

## 6. Dependency Direction

```
router ──▶ dependencies ──▶ services ──▶ models
   │                           │
   └──────▶ schemas ◀──────────┘
                               │
                               ▼
                         infrastructure ──▶ core
```

- Each layer depends only on layers to its right or below. Nothing imports `router` except `api.py`.
- `infrastructure` never imports a domain. `core` never imports `infrastructure` or a domain.
- **Cross-domain:** a service may call another resource's service only through that resource's package:
  `from app.crab_management.crab import CrabServices` is allowed.
  `from app.crab_management.crab.services.crab_services import CrabServices` is not.
- A domain never imports another domain's `models` directly. Ask its service instead.
- **No foreign keys between modules in the database.** Cross-module references are plain indexed ID columns, validated by services (04 §5).
- No domain imports `app.worker`. The worker imports domains (services and models), never routers.
- Circular imports between domains mean a boundary is wrong. Fix the boundary instead of using a local import.

## 7. Concurrency Rules

The DB layer is **sync**: SQLModel `Session` from `core.database.get_db`.

| Code | Style |
|---|---|
| CRUD endpoints (anything that uses `get_db`) | plain `def` (FastAPI runs it in the threadpool) |
| Services | plain `def`, receive `db: Session` as the first argument |
| SSE endpoints | `async def`, return `StreamingResponse` / `EventSourceResponse`, **never** take a `Session` |
| Broker publish/consume (`infrastructure/messaging`) | `async` (aio-pika) |
| LangGraph run (`ainvoke` / `astream`) | `async` |
| Async code that needs the DB | `await run_in_threadpool(fn, ...)`, where `fn` opens its own `SessionFactory()` session |
| Worker jobs | their own loop; DB through `SessionFactory()` per unit of work; YOLO inference in a thread/process, never on the event loop |

Never call a sync `Session` directly inside an `async def`.

## 8. Realtime: SSE

- `infrastructure/streaming` runs **one** AMQP consumer per API process. It binds an exclusive auto-delete queue to the keys it needs and fans messages out to an `asyncio.Queue` for each connected client.
- The SSE endpoint subscribes a client queue, yields `event:`/`data:` frames, sends a heartbeat comment every 15 s, and unsubscribes on disconnect.
- Filtering (by device, pond or camera) happens in the hub, not in RabbitMQ bindings per client.
- **Auth:** browser `EventSource` can't send headers, so SSE endpoints accept the JWT from an httpOnly cookie or a `?token=` query param. They validate it with the same `core.security` code.
- SSE is one-way. All client actions go through normal `POST` endpoints.

## 9. Device Commands

- `POST /devices/{device_id}/commands` validates the command against the device's allowed commands and checks permissions. It then publishes to `farm.{device_id}.cmd`, writes an audit row and returns `202 Accepted` with a `command_id`.
- The device reports back on `farm.{device_id}.status`. The result reaches the UI through SSE, not through the POST response.

## 10. Worker

- Separate process: `python -m app.worker`. Same settings and codebase, no FastAPI.
- **Camera detection job:** reads cameras directly (RTSP/USB) → YOLOv8 → computes crab width (px → mm using the camera's calibration) → publishes `vision.detection.{camera_id}`. **Vision writes nothing to the database.** Results are live-only (SSE). A width becomes permanent only when a user records it as a crab log (`POST /crabs/{crab_id}/logs`).
- **Sensor persistence job:** durable queue bound to `farm.*.sensors.#` → validates → batch-inserts readings through `monitoring.sensors` services.
- Cameras are started and stopped by `worker.camera.{start|stop}` events that the API publishes. The worker never exposes HTTP.
- The YOLOv8 model is loaded once at worker start through `infrastructure/vision`. The API process never loads YOLO.
- QR decoding is light, so it runs **in the API** (`vision/qr` service, called through `run_in_threadpool`). It decodes and looks up the crab or batch, and stores nothing.
- Cameras (id, source URL, calibration) are configured in `Settings`, not in a table. The `vision` domain has no `models` layer.

## 11. Assistant (LangGraph)

```
assistant/chat/
├── __init__.py
├── router.py          # POST /assistant/chat (SSE stream) — the ONLY assistant endpoint
├── schemas.py         # ChatRequest {thread_id, message}, stream event schemas
├── services.py        # builds graph input + config {thread_id, user}, streams graph output
├── dependencies.py    # current user, permission, compiled graph provider
└── graph/
    ├── state.py       # AssistantState (TypedDict)
    ├── builder.py     # StateGraph wiring + compile(); compiled once at startup
    ├── tools.py       # thin wrappers over domain services (read-only)
    ├── prompts/       # one prompt file per node
    └── nodes/
        ├── intent_router.py       # classifies → next node
        ├── sensor_interpreter.py  # explains events, e.g. why a sensor dropped
        ├── sensor_analyst.py      # analyses current/recent readings
        ├── log_reporter.py        # generates reports from crab logs
        ├── forecast_explainer.py  # explains stored 7-day growth forecasts
        └── farming_qa.py          # general crab-farming assistance
```

- **One chat, routed by intent.** There is a single endpoint (`POST /assistant/chat`) and a single compiled graph. Every question enters at `intent_router`, which classifies it into one intent and sends it to that node through a conditional edge. Each node is one file exporting one function.

  | Intent | Node | Example question |
  |---|---|---|
  | `sensor_event` | `sensor_interpreter` | "Why did the DO drop last night?" |
  | `sensor_analysis` | `sensor_analyst` | "How is pond 2 water quality right now?" |
  | `log_report` | `log_reporter` | "Make a report of batch 5 for this week." |
  | `growth_forecast` | `forecast_explainer` | "How big will batch 5 be next week?" |
  | `farming_qa` | `farming_qa` | "What salinity is best for mud crabs?" (also the fallback) |

  - Intents are a `Literal`/`Enum` in `graph/state.py`, and `intent_router` returns structured output with one of them. Unknown or unclear intents fall back to `farming_qa`.
  - Reports are just the `log_report` intent answered in chat. There is no separate reports endpoint.
- **Follow LangGraph strictly; the app doesn't store messages.**
  - The app has **no** conversation, message or report tables, so `assistant/chat` has no `models` layer (an exception to §5, like `vision`).
  - Conversation memory lives in LangGraph's state, held by LangGraph's **in-memory checkpointer** (`InMemorySaver`, created once in `infrastructure/ai`) and keyed by `thread_id`. **Nothing is written to PostgreSQL.**
  - **No chat history.** Memory lasts only for the live session. Once the user closes the chat, or the API restarts, the conversation is gone. There is no endpoint to list, reload or export past chats.
  - Memory lives in one API process, so run the API as a single process or use sticky sessions for `/assistant/chat`.
  - The client keeps `thread_id` in memory only (not `localStorage`) to continue the current conversation, or omits it and the server creates a UUID and returns it in the first stream event. An unknown or expired `thread_id` silently starts a new conversation.
  - `thread_id` is scoped to the user: the service prefixes or validates it against `current_user.id`, so users can't read each other's threads.
  - History, trimming and summarising are done with LangGraph features (`add_messages` reducer, message trimming inside nodes). Never hand-roll them with your own tables.
  - Domain data the assistant reads (sensors, logs, forecasts) stays in its own domain. The assistant only reads it through tools.
- Nodes get data **only** through `tools.py`, which calls domain services (`monitoring.sensors`, `crab_management.logs`, …). Nodes never query the DB or broker directly.
- Tools are read-only. The assistant never sends device commands.
- **LLM provider is DeepInfra.** `infrastructure/ai/llm.py` exposes `get_chat_model(purpose)`, which returns a `ChatOpenAI` pointed at DeepInfra's OpenAI-compatible API:
  ```python
  ChatOpenAI(
      base_url=settings.deepinfra_base_url,   # https://api.deepinfra.com/v1/openai
      api_key=settings.deepinfra_api_key,
      model=settings.deepinfra_chat_model,    # e.g. a DeepInfra-hosted model id
      streaming=True,
  )
  ```
  - Nodes call `get_chat_model(...)`. They never construct a client or import a provider SDK themselves, so switching models or providers only touches `infrastructure/ai`.
  - `purpose` picks a model from settings (for example a small, fast model for `intent_router` and a stronger one for `log_reporter` and `sensor_interpreter`).
  - Only pick DeepInfra models that support tool/function calling for nodes that use `tools.py`.
- Checkpointer and model IDs come from `infrastructure/ai` and `Settings`. Never hard-code keys or model IDs.
- Chat responses stream to the browser over SSE from `graph.astream(...)`.
- Forecast questions are handled by `nodes/forecast_explainer.py` through the `get_growth_forecast` tool. The LLM **explains** stored forecast numbers. It never invents or recomputes predictions (§12).

## 12. Growth Forecast (ML)

Predicts **carapace width and weight for each of the next 7 days**, based on the **last 14 days** of crab logs.

**Resource:** `crab_management/forecasts/` (standard anatomy)

| Part | Contents |
|---|---|
| `router` | `POST /forecasts` (request a run → `202` + `run_id`), `GET /forecasts?batch_id=&crab_id=` (latest), `GET /forecasts/{run_id}`, `GET /forecasts/stream` (SSE) |
| `models` | `ForecastRun` (id, batch_id/crab_id, status, model_version, window_start, window_end, error, timestamps) and `ForecastPoint` (run_id, day_offset 1–7, date, predicted_width_mm, predicted_weight_g, lower/upper bound) |
| `schemas` | `ForecastRequest`, `ForecastRunRead`, `ForecastPointRead`, `ForecastCompletedEvent` |
| `services` | `ForecastServices`: request run, read results, `build_features()` (14-day window → feature frame), `predict()` (calls the `infrastructure/ml` model), save results |

**Rules**
- **Who runs it:** prediction runs in the **worker** (`jobs/growth_forecast.py`), never inside an API request. The API only queues runs and reads results.
- **When it runs:** nightly for every active batch (time set in `Settings`), plus on demand through `POST /forecasts` → `worker.forecast.run`.
- **Input window:** the 14 days of `crab_management.logs` (width, weight, molt flags) up to today, read through the logs service. Sensor aggregates from `monitoring.sensors` (daily mean/min of temperature, salinity, pH, DO) may be added as features. Read them through that domain's service.
- **Not enough data:** if a subject has fewer than the minimum logged days in the window (set in `Settings`), mark the run `status="insufficient_data"` and don't predict. Never pad or invent rows.
- **Feature code is shared:** training (`api/ml/train_growth_model.py`) and inference import the **same** `build_features()` from `crab_management.forecasts` services, so features never drift between the two.
- **Model versions:** every `ForecastRun` stores the `model_version` it used. The worker loads one artifact at start through `infrastructure/ml`, from the path set in `Settings`. To change the model, deploy a new artifact and restart the worker.
- **Training is offline:** run `api/ml/train_growth_model.py` by hand or on a schedule outside the app. Artifacts are never committed, and the app never trains.
- **Results are stored:** forecasts are rows in the DB. Read endpoints and the assistant only read stored runs and never trigger inference synchronously.
- **Granularity:** per batch by default. Per crab only when that crab has its own measurements over the window.

## 13. Errors, Auth, Audit

- Services raise domain errors (`FieldException` or domain-specific exceptions in `core/exceptions.py`). `register_exception_handlers` maps them to HTTP responses. Routers don't build error responses by hand.
- Every non-public endpoint depends on `get_current_user` and `require_permissions(...)` from `authentication.users`.
- State-changing actions (create/update/delete, device commands, worker control) write an audit entry through `core.audit`.

## 14. Configuration

- All settings live in `core/config.py` (`Settings`, pydantic-settings, `.env`). This includes DB URI, JWT, RabbitMQ URL, exchange names, camera list/calibration, YOLO weights path, DeepInfra settings (`deepinfra_api_key`, `deepinfra_base_url`, and model IDs for each purpose), and forecast settings (`forecast_model_path`, `forecast_history_days=14`, `forecast_horizon_days=7`, `forecast_min_logged_days`, `forecast_nightly_time`).
- Long-lived clients (AMQP connection, SSE hub, in-memory checkpointer + compiled graph) are created in the FastAPI `lifespan` and closed on shutdown. Don't create them at import time.

## 15. Checklist: Adding a Resource

1. Create `<domain>/<resource>/` with `__init__.py`, `router.py`, `schemas.py`, `models.py`, `services.py`, `dependencies.py`.
2. Models inherit `core.Base`. Add an Alembic migration.
3. Re-export public names in the resource `__init__.py` with `__all__`.
4. Add the router to the domain's `api.py` `ROUTERS`.
5. If it's a new domain, add its `ROUTERS` to `main.py` and update §4 of this file.
6. Broker keys go in `infrastructure/messaging/topics.py`.

## 16. Known Deviations to Fix

- `authentication/users/router/auth.py` declares `async def` endpoints but uses the sync `Session`. Convert them to `def` (§7).
- `main.py` has `CRAB_ROUTERS` commented out. Re-enable it once `crab_management` routers follow §5.
- `crab_management/crab/` has no `__init__.py`, so `crab_management/api.py` currently picks up `crab.router` as a module, not an `APIRouter`. Add `crab/__init__.py` that exports `router` (and the services).
- `crab_management/logs/` only has `models.py`. Complete the resource anatomy when logs endpoints are built.
