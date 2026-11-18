# 01 — API Architecture

These are the architecture rules for `api/`. Read this file before adding or changing any backend code.
If code and this document disagree, the code is wrong unless this document is updated first.

---

## 1. Style

- **Modular monolith.** One deployable codebase, split into **domains**. Each domain is split into **resources**.
- **Layered inside every resource:** router → services → models. Schemas form the contract at the edges.
- **Two processes, one codebase:**
  - `api`: FastAPI (HTTP, SSE, publishing commands, live object detection over WebSocket with YOLO loaded in this process, [ADR-0003](../../docs/adr/0003-live-object-detection-over-websocket.md)).
  - `worker`: a custom long-running process (growth forecasts, background consumers).
  Both import the same `app.*` packages.

## 2. Stack

| Concern | Choice |
|---|---|
| HTTP framework | FastAPI |
| Validation / DTOs | Pydantic v2 |
| ORM / tables | SQLModel (sync `Session`) on PostgreSQL via psycopg 3 |
| Migrations | Alembic (`api/migrations`) |
| Auth | JWT (PyJWT) + role checks (`core/dependencies.py`) |
| Broker | RabbitMQ with the MQTT plugin (devices speak MQTT, the backend speaks AMQP) |
| Realtime to browser | Server-Sent Events (SSE). A WebSocket only for live detection (§8) |
| Computer vision | Ultralytics YOLO, built-in pretrained `yolo11n.pt` (COCO object detection) for now, in the API process. OpenCV (`opencv-python`, pulled in by Ultralytics) for decoding and the sticker's QR. Width in mm from the 40 mm sticker, or the stand's camera distance and field of view. QR decoding |
| AI orchestration | LangGraph (one router graph, one file per node) |
| LLM provider | DeepInfra, through its OpenAI-compatible endpoint (`langchain-openai` `ChatOpenAI` with `base_url`) |
| Growth forecasting | PyTorch LSTM + linear regression output layer (`GrowthLstm`: `nn.LSTM` → `nn.Linear`, trained together): a window of daily (width, weight) rows → the next day, rolled forward 7 days. Min-max scaling is fixed at training and saved in the checkpoint (`.pt`, loaded with `weights_only=True`). Features in plain Python + NumPy, no pandas |

## 3. System Data Flow

```
LIVE DEVICE DATA (one way)
Device ──MQTT──▶ RabbitMQ ──AMQP──▶ FastAPI GET /<resource>/stream ──SSE──▶ Next.js
                    └──AMQP──▶ worker (saves water sensor logs every 30 minutes, audits connect/disconnect)
Built today: the crab scale (ESP32) publishes MQTT crab/scale {"weight": 554.00, "unit": "grams"} every 2 s;
the StreamHub binds crab.scale on amq.topic, devices/scales serves GET /scales/stream, which emits
scale.reading {device_id: null, weight_g, received_at (stamped by the API)}, and Scan's Weight (g)
fills live from it. Live only, nothing stored. SSE, not WebSocket: the data only flows down to the browser.
Built today: the water sensors (ESP32) publish MQTT crab/sensor {"temperature", "ph", "salinity", "ammonia", "turbidity",
"dissolved_oxygen"}; the StreamHub binds crab.sensor on amq.topic, devices/water_sensors serves GET /water-sensors/stream,
which emits water_sensor.reading {device_id: null, temperature_c, ph, salinity_ppt, ammonia_mg_l, turbidity_ntu, do_mg_l,
statuses (normal | warning | danger per sensor), received_at (stamped by the API)}, and the Dashboard's Water now tiles fill
live from it. The stream stores nothing; the worker keeps the history (§10). Thresholds come from the root .env (WATER_THRESHOLD_<SENSOR>, defaults in core/config.py), read by the API and the worker in devices/water_sensors/thresholds.py; the web gets them from GET /water-sensors/thresholds.
Device presence: devices/registry serves GET /devices/stream, which emits device.status {device: scale | water_sensors, seen_at, alerts: water sensors reading warning or danger}
at most every 2 s per device while that device sends valid messages. Devices have no presence signal, so the web's top bar
treats 10 s of silence as not connected.

CONTROL COMMANDS
Next.js ──POST──▶ FastAPI POST /devices/{id}/commands ──AMQP──▶ RabbitMQ ──MQTT──▶ Device runs command

LIVE DETECTION (browser webcam, no broker; ADR-0003, docs/yolo/README.md)
Next.js Server Action ──BFF──▶ FastAPI POST /detections/tickets ──▶ 30 s single-use ticket
Browser webcam ──wss <web origin>/ws/detections (Next rewrite)──▶ FastAPI WS /detections/ws
   ──▶ decode (OpenCV) ──▶ YOLO (1-thread executor) ──▶ width in mm (40 mm sticker, else stand distance + field of view) ──▶ JSON boxes + measurement ──▶ browser overlay
(live only: detection results are not stored in the database)

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
| Crab scale weight (today, one scale, no device id) | `crab/scale` | `crab.scale` (`CRAB_SCALES`) | `amq.topic` |
| Water sensors (today, one device, no device id) | `crab/sensor` | `crab.sensor` (`CRAB_SENSORS`) | `amq.topic` |
| Device commands | `farm/{device_id}/cmd` | `farm.{device_id}.cmd` | `amq.topic` |
| Device ack/status | `farm/{device_id}/status` | `farm.{device_id}.status` | `amq.topic` |
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
│   ├── security/           # jwt_manager, roles, rate_limit
│   └── audit/              # audit trail
├── infrastructure/         # technical clients only, no business rules, no routers
│   ├── messaging/          # RabbitMQ connection, publisher, consumer, topics.py
│   ├── streaming/          # SSE hub: AMQP → in-process fan-out → per-client queues
│   ├── vision/             # YoloDetector (loaded in lifespan, 1-thread executor), JPEG decode, px → mm measurement, QR decoder
│   ├── ml/                 # GrowthLstm, GrowthForecaster, ModelRegistry (versioned checkpoints, current.json, training lock), load_growth_forecaster() (reloads on promotion), TrainingRunner (ADR-0004)
│   └── ai/                 # LLM client factory, in-memory LangGraph checkpointer
├── authentication/
│   ├── api.py              # ROUTERS
│   └── users/
├── crab_management/
│   ├── api.py
│   ├── crab/
│   └── logs/               # /logs, plus /forecasts (7-day forecast, saved as prediction logs) /forecasts/model + /forecasts/stream (growth model status, ADR-0005) and /forecasts/model-trainings (retrain the model)
├── devices/                # every MQTT device on the farm
│   ├── api.py
│   ├── scales/             # GET /scales/stream: the crab scale's live weight (built, live only, no tables)
│   ├── water_sensors/      # GET /water-sensors/stream (live readings), /water-sensors/logs (saved every 30 min), thresholds
│   └── registry/           # GET /devices/stream: which devices are sending, connection audit (built, no tables); device registry and commands planned
├── artificial_intelligence/
│   ├── api.py
│   ├── vision/             # POST /detections/tickets + WS /detections/ws: live boxes + width from the browser webcam (no tables)
│   └── qr/                 # QR scan (planned)
├── audit/                  # reads the audit trail that core.audit writes (no tables of its own)
│   ├── api.py
│   └── events/             # GET /audit-events: filtered, paginated, scoped by role
├── system/                 # cross-cutting live channel (no tables)
│   ├── api.py
│   └── events/             # GET /events/stream: system.<type> events over SSE
├── assistant/
│   ├── api.py
│   └── chat/               # single chat endpoint + LangGraph (graph/); no tables
└── worker/
    ├── __main__.py         # python -m app.worker
    ├── runner.py           # starts/stops jobs, handles signals
    └── jobs/               # device_presence_monitor.py, water_sensor_monitor.py (built), growth_forecast.py (planned)

api/ml/                     # OUTSIDE app/: offline training only, never imported by app/
├── train_growth_model.py   # trains on every crab and promotes WITHOUT the gate (first model, manual override)
├── retrain_growth_model.py # gated retrain: holdout score vs current model + straight line, promote only if it wins (ADR-0004)
└── models/                 # saved artifacts (gitignored): growth/ (growth-lstm-<version>.pt, current.json, trainings/<training_id>.json), yolo11n.pt
```

Domains: `authentication`, `crab_management`, `devices`, `artificial_intelligence`, `assistant`, `audit`, `system`.

`audit/events` has no `models` layer: `core.audit` owns `audit.audit_events` and writes it, and this domain only reads it (through `core.audit`'s `AuditEvents`). A STAFF caller only ever sees their own events; the service enforces it, because the rule depends on the query (01 §13).

`system/events` has no `models` layer (like `artificial_intelligence/vision`, `devices/scales`, `devices/registry` and `assistant/chat`). It's the reference stream: copy its router/services/dependencies when a domain adds its own `/<resource>/stream`.
To add a domain, update this file first.

## 5. Resource Anatomy (non-negotiable)

Every resource (`<domain>/<resource>/`) has these parts:

| Part | Responsibility | Must NOT |
|---|---|---|
| `__init__.py` | The resource's public surface. Re-exports router, services, schemas and dependencies through `__all__`, so callers import the **package**, never a file inside it. | contain logic |
| `router` | HTTP only: declare the endpoint, inject dependencies, call **one** service method, return a schema. | query the DB, hold business rules, touch the broker |
| `schemas` | Pydantic v2 request/response/event models (`*Request`, `*Response`, `*Read`, `*Event`). A resource with nothing to hide returns its own table model instead of a `*Read` (02 §5). | import services, or another domain's models |
| `models` | SQLModel `table=True` classes, inheriting `core.Base`. Leave it out **only** when the resource owns no tables (e.g. `assistant/chat`, §11). | contain business logic or import schemas |
| `services` | Business logic: queries, transactions, rules, publishing via `infrastructure`, audit. Class with methods (`CrabServices`). | import `fastapi` (except `HTTPException`-free domain errors), know about request objects |
| `dependencies` | `Depends()` providers: current user, role guards, "load resource or 404". The guards and role aliases live in `core.dependencies`: `get_current_user`, `require_roles(*roles)`, and the `AuthUser`-typed aliases `CurrentUser`, `DeveloperOnly`, `DeveloperOrAdmin`, `AnyRole`. `get_current_user` builds `core.AuthUser` (`id`, `role`, `email`, `expires_at`) from the access token's claims in one decode, with no DB read, so core never knows the `Users` model. Every domain imports the guards from `app.core` and uses them as `actor: DeveloperOrAdmin`, so no domain depends on `authentication`. Only `authentication.users` reads the row, through `load_user(token)`: `get_refresh_user` (refresh and PIN) and `AccountUser` (the endpoints that change the user's own account). Never copy a guard into another domain. | contain business rules |

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
- Every endpoint declares `response_model`, `status_code` and its role dependency.
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
| WebSocket endpoints | `async def`, **never** take a `Session`; a receive task and a work task under `asyncio.wait(FIRST_COMPLETED, timeout=<session left>)`, both cancelled on exit |
| YOLO inference (API) | `await detector.infer(image)`, which runs on the detector's own `ThreadPoolExecutor(max_workers=1)`, never on the event loop or the shared threadpool |
| Broker publish/consume (`infrastructure/messaging`) | `async` (aio-pika) |
| LangGraph run (`ainvoke` / `astream`) | `async` |
| Async code that needs the DB | `await run_in_threadpool(fn, ...)`, where `fn` opens its own `SessionFactory()` session |
| Worker jobs | their own loop; DB through `SessionFactory()` per unit of work |

Never call a sync `Session` directly inside an `async def`.

## 8. Realtime: SSE

- `infrastructure/streaming` runs **one** AMQP consumer per API process. It binds an exclusive auto-delete queue to the keys it needs and fans messages out to an `asyncio.Queue` for each connected client.
- The SSE endpoint subscribes a client queue, yields `event:`/`data:` frames, sends a heartbeat comment every 15 s, and unsubscribes on disconnect.
- Filtering (by device, pond or camera) happens in the hub, not in RabbitMQ bindings per client.
- **Built:** `infrastructure/messaging` (`RabbitClient`, `publish()`, `topics.py`) and `infrastructure/streaming` (`StreamHub`, `event_stream()`, `format_event()`). The FastAPI `lifespan` connects the client, declares `crabfarm.events` and starts one hub bound to the keys streams need (today `system.#`); add a domain's keys there. The broker is **off by default** (`rabbitmq_enabled=false`) until a feature needs it; set `RABBITMQ_ENABLED=true` to connect. While it's off or unreachable at startup the API still starts, and stream endpoints answer `503` + `Retry-After` until a restart. Live detection never uses the broker.
- **Growth model status ([ADR-0005](../../docs/adr/0005-growth-model-status-over-sse.md)):** the hub also binds `forecast.#`. `ModelStatusWatcher` (`logs/services/model_status_services.py`, started in the lifespan only when the hub is ready) checks `ModelRegistry.fingerprint()` every `forecast_status_poll_seconds` (5) and recomputes anyway every `forecast_status_refresh_seconds` (60, new logs make a model due). It publishes a `ModelStatus` on `forecast.model` only when it differs from the last one. `GET /forecasts/stream` sends the caller's snapshot first (read by a sync dependency, off the event loop), then every `forecast.model` event. The retrain process stays broker-free.
- **Per client:** a bounded queue (`sse_client_queue_size`, oldest dropped when full), a `retry: 5000` frame first, `: ping` every `sse_heartbeat_seconds`, every broker body validated by the stream's `*Event` schema (invalid ones are logged and dropped), and the stream **ends when the access token expires**, so the client reconnects with a fresh token.
- **Auth:** the browser never calls FastAPI; the Next.js BFF (`/api/stream/...`) sends the access token as `Authorization: Bearer`, so stream endpoints use the normal `get_current_user` + `require_roles`. Cookie or `?token=` auth is only needed if a non-BFF client ever streams directly.
- SSE is one-way. All client actions go through normal `POST` endpoints.

### WebSocket: live detection (the only WebSocket)

Browser frames have to go up and per-frame results come back, so detection uses a WebSocket ([ADR-0003](../../docs/adr/0003-live-object-detection-over-websocket.md)). The full protocol is in `docs/yolo/README.md`.
- **Path:** `WS {api_prefix}/detections/ws`. The browser reaches it on the web origin at `/ws/detections` through a `next.config.ts` rewrite. Next proxies the upgrade, and Route Handlers can't.
- **Auth: ticket, never a JWT in the browser.**
  - `POST /detections/tickets` (Bearer from the BFF, `AnyRole`) returns a 30 s JWT with `type: "detection"`, a `jti` and `session_exp`, where `session_exp` is the caller's access-token `exp`.
  - The first socket message must be `{"type":"auth","ticket":…}` within `detection_auth_timeout_seconds`.
  - The `jti` is consumed in an in-process set (single use).
  - `Origin` is checked against `detection_allowed_origins` before accepting.
- **Frames:** binary, `[u32 big-endian frame_id][JPEG]` (the page sends up to 1280 px on the long side), at most `detection_max_frame_bytes`. A one-slot latest-frame buffer: newer frames replace unprocessed ones, so nothing queues.
- **Replies:** text JSON validated by Pydantic: `ready`, `result {frame_id, width, height, inference_ms, boxes[] (normalized), measurement | null}`, `error`. The mm scale comes from the sticker (`detection_sticker_mm`) or the stand (`detection_camera_distance_mm`, `detection_camera_fov_deg`).
- **Close codes:**
  - 4001: session expired. The socket closes at `session_exp`, like SSE.
  - 4401: bad, used or late ticket.
  - 4403: origin not allowed.
  - 4413: frame too large.
  - 1013: model not loaded, or `detection_max_sessions` reached.
- **Limits:** the `jti` set, the session cap and the model live in memory, so run the API as a single process (as for the assistant).

## 9. Device Commands

- `POST /devices/{device_id}/commands` validates the command against the device's allowed commands and checks the caller's role. It then publishes to `farm.{device_id}.cmd`, writes an audit row and returns `202 Accepted` with a `command_id`.
- The device reports back on `farm.{device_id}.status`. The result reaches the UI through SSE, not through the POST response.

## 10. Worker

- Separate process: `python -m app.worker`. Same settings and codebase, no FastAPI.
- **Device presence monitor (`jobs/device_presence_monitor.py`), runs 24/7:** audits only connection changes for every device in `devices.registry.DEVICES`, by `actor_type = SYSTEM`, `service = worker`: `scale.connected` / `scale.disconnected` and `water_sensor.connected` / `water_sensor.disconnected` (no valid message for `device_offline_seconds`, 30). It reads each device's last audited state at startup so restarts don't repeat it.
- **Water sensor monitor (`jobs/water_sensor_monitor.py`), runs 24/7 and doesn't depend on the web app:** an exclusive queue bound to `crab.sensor` keeps only the latest valid reading.
  - **Logs:** once per `water_sensor_log_interval_minutes` (30) slot on the clock (:00 and :30), it saves all six sensors with their status to `devices.water_sensor_logs`. A slot with no current reading is saved when the sensors return within it, otherwise it stays empty. The unique `(sensor, slot_at)` makes a restart harmless.
  - Normal, warning and danger are not audited, because the logs already record them.
- RabbitMQ or PostgreSQL being down restarts the jobs after 5 s.
- The worker never exposes HTTP.
- **Detection is not a worker job** ([ADR-0003](../../docs/adr/0003-live-object-detection-over-websocket.md)). Frames come from the browser webcam over the WebSocket (§8), and the **API process** loads YOLO once in `lifespan` through `infrastructure/vision.YoloDetector`.
  - If the model can't load, the API still starts and detection sockets close with 1013.
  - **Vision writes nothing to the database.** A width becomes permanent only when a user saves it as a crab log (`POST /logs`).
  - The fixed-camera job (RTSP/USB, `/cameras`, `/detections/stream`, `vision.detection.*` and `worker.camera.*`) is dropped. If it returns, it reuses `YoloDetector` in the worker.
- **Model:** the built-in pretrained `yolo11n.pt` (COCO object detection), downloaded by Ultralytics on first load into `api/ml/models/` (gitignored). A custom crab model later only changes `yolo_weights` (and optionally `yolo_classes`).
- **Width in mm (fixed stand + 40 mm sticker):** the camera is on a stand 12 in above the crab, pointing down. `infrastructure/vision/measurement.py` multiplies the most confident box's **horizontal** span by a scale. The scale is the crab's sticker when its QR is in view (`detection_sticker_mm` 40 × 0.62 = 24.8 mm QR ÷ its px), otherwise the stand (`2 × detection_camera_distance_mm × tan(detection_camera_fov_deg ÷ 2) ÷ frame long side`; defaults 304.8 mm lens-to-shell, 51.4° calibrated on the farm's stand camera). With the sticker in view, the result also reports the `fov_deg` it implies, so each camera model is calibrated by copying that into `.env`. Frames are up to 1280 px so the QR is big enough to read.
- QR decoding is light, so it runs **in the API** (`artificial_intelligence/qr` service, called through `run_in_threadpool`). It decodes and looks up the crab or batch, and stores nothing.
- The `artificial_intelligence` domain has no `models` layer.

## 11. Assistant (LangGraph)

```
assistant/chat/
├── __init__.py
├── router.py          # POST /assistant/chat (SSE stream) — the ONLY assistant endpoint
├── schemas.py         # ChatRequest {thread_id, message}, stream event schemas
├── services.py        # builds graph input + config {thread_id, user}, streams graph output
├── dependencies.py    # current user, role guard, compiled graph provider
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
  - The app has **no** conversation, message or report tables, so `assistant/chat` has no `models` layer (an exception to §5, like `artificial_intelligence/vision`).
  - Conversation memory lives in LangGraph's state, held by LangGraph's **in-memory checkpointer** (`InMemorySaver`, created once in `infrastructure/ai`) and keyed by `thread_id`. **Nothing is written to PostgreSQL.**
  - **No chat history.** Memory lasts only for the live session. Once the user closes the chat, or the API restarts, the conversation is gone. There is no endpoint to list, reload or export past chats.
  - Memory lives in one API process, so run the API as a single process or use sticky sessions for `/assistant/chat`.
  - The client keeps `thread_id` in memory only (not `localStorage`) to continue the current conversation, or omits it and the server creates a UUID and returns it in the first stream event. An unknown or expired `thread_id` silently starts a new conversation.
  - `thread_id` is scoped to the user: the service prefixes or validates it against `current_user.id`, so users can't read each other's threads.
  - History, trimming and summarising are done with LangGraph features (`add_messages` reducer, message trimming inside nodes). Never hand-roll them with your own tables.
  - Domain data the assistant reads (sensors, logs, forecasts) stays in its own domain. The assistant only reads it through tools.
- Nodes get data **only** through `tools.py`, which calls domain services (`devices.water_sensors`, `crab_management.logs`, …). Nodes never query the DB or broker directly.
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

**Code:** inside the `crab_management/logs/` resource, split per concern (03 §2), because forecasts are prediction logs: no tables of their own, each predicted day is a `crab_management.logs` row with `log_type = prediction`.

| Part | Contents |
|---|---|
| `logs/router/` | `logs.py` (`/logs`), `forecasts.py` (`POST /forecasts`, `DeveloperOrAdmin`; body optional: `{}` forecasts every crab, `{crab_id}` one crab → `201 FORECAST_CREATED`), `model_trainings.py` (`POST /forecasts/model-trainings` → 202, `GET /forecasts/model-trainings`, `GET /forecasts/model-trainings/{training_id}`; ADR-0004) |
| `logs/schemas/` | `log_schemas.py`; `forecast_schemas.py` (`CreateForecastRequest`, `GrowthDay`, `PredictedDay`, `CrabForecast`, `ForecastResult`: `model_version`, `forecasts`, `skipped_crab_ids`); `training_schemas.py` (`ListModelTrainingsQuery`) |
| `logs/services/` | `forecast_services.py`: `ForecastServices`: `build_features()` (measured logs → one row per crab per logged day, from that day's **latest** log, never averaged and never mixing crabs), `to_rows()`, `forecast(crab_id=None)` (predicts, stores nothing), `create()` (forecasts, builds each predicted day as `Logs.model_validate({..., log_type: prediction, created_at: that day})` so the model's bounds apply, saves them all in one transaction with `LogServices.create_many()`, audited once as `forecast.create`). `training_services.py`: `ModelTrainingServices` (`create()` takes the training lock and starts the retrain process; `list()` and `get()` read `trainings/<training_id>.json`). `log_services.py`: `LogServices`, incl. `list_measured()` (the forecast's and training's input: each crab's latest actual log per UTC day, `DISTINCT ON (crab_id, day)`) and `create_many()` (rows built in code, one transaction, no per-log audit). `Logs` carries the same bounds as `CreateLogRequest` (ids > 0, width 0–300 mm, weight 0–5000 g, at least one measurement); a table model skips validation in `Logs(...)`, so code-built rows use `Logs.model_validate`. |

**Rules**
- **Who runs it:** on demand, **in the API request** (`POST /forecasts`). The model is small (milliseconds per crab), so a worker isn't needed yet. A nightly run for every crab, if added, goes in the worker (`jobs/growth_forecast.py`) and calls the same `ForecastServices.create()`.
- **Scope:** every crab with enough logged days in the window, or one crab when `crab_id` is sent. Crabs with some logs but too few days are listed in `skipped_crab_ids`; if no crab qualifies, `422 insufficient_data`.
- **Input window:** the last `forecast_history_days` (14) of actual logs that have both width and weight, read through `LogServices.list_measured()`. Days are calendar days of `created_at` in UTC. Sensor aggregates from `devices.water_sensors` may be added as features later, read through that domain's service.
- **Not enough data:** a crab needs at least `max(forecast_min_logged_days, the model's window_days)` logged days. Never pad or invent rows.
- **Results are stored as prediction logs:** each predicted day is one `logs` row (`log_type = prediction`, `created_at` = the predicted day at 00:00 UTC, `user_id` = the caller, `batch_id` = the crab's latest batch). Every run **inserts**; earlier predictions are kept, never replaced or deleted.
- **Old logs, only when asked:** `include_old_logs` also forecasts a crab without enough recent days. `GET /forecasts/readiness` reports these crabs so the web can warn first.
- **Input and dates:** every forecast reads the crab's latest `forecast_history_days` (14) logged days, which can be from earlier months. The forecast covers the next `forecast_horizon_days` from today on the farm clock (`farm_time_zone`), or from tomorrow if the crab was measured today. The model doesn't roll forward across a gap in the logs.
- **No overlapping forecasts:** while the crab's latest prediction log is on or after the new forecast's first day, the crab isn't forecast again (`LogServices.last_predicted_days()`): `{crab_id}` gets `409 forecast_already_exists`, and `{}` skips it into `already_forecast_crab_ids` (409 if that leaves no crab). Once its last predicted day has passed in the logs, it can be forecast again. The web's Predicted (dashed) line reads these rows.
- **Model missing:** no `current.json` in `forecast_model_dir` → `503 MODEL_UNAVAILABLE`.
- **Model status:** `GET /forecasts/model` (any role, not audited) returns `ModelStatus` `{state: training | missing | due | ready, version, trained_at, new_logged_days, retrain_after_days, training}`. First match wins: `training` (latest record queued/running, holds the lock, started within `forecast_training_timeout_minutes`), `missing` (no `current.json`), `due` (`new_logged_days` ≥ `forecast_retrain_min_new_days`, counted exactly like the retrain), else `ready`. Live over `GET /forecasts/stream` (§8, ADR-0005).
- **Feature code is shared:** training (`api/ml/train_growth_model.py`) and inference use the **same** `ForecastServices.build_features()`, so features never drift between the two.
- **Model versions:** the checkpoint stores its version (set by the training script) and the response returns it as `model_version`. The API serves the checkpoint `current.json` names, through `infrastructure/ml.load_growth_forecaster()`, and reloads when a new version is promoted (checked every `forecast_reload_seconds`). The checkpoint holds the weights, hidden size, window length, scaling and version, all as tensors or plain values, so it loads with `weights_only=True`.
- **Training is offline, retraining is gated** ([ADR-0004](../../docs/adr/0004-growth-model-retraining.md)): `ml.retrain_growth_model` runs weekly (OS scheduler, later the worker) and from the web's Retrain button through `POST /forecasts/model-trainings` (`DeveloperOrAdmin`, 202), which takes the training lock and starts it as a **separate process**; the API never trains. It holds out each scored crab's last 7 days and promotes only if the new model beats the straight-line baseline and isn't worse than the current model (`mape_pct`). One training at a time (`.training.lock`, 409). Each training is a record in `ml/models/growth/trainings/` (the last 100 kept), read by `GET /forecasts/model-trainings` and `GET /forecasts/model-trainings/{training_id}`. `ml.train_growth_model` promotes without the gate (the first model). Artifacts are never committed.

## 13. Errors, Auth, Audit

- Services raise domain errors (`FieldException` or domain-specific exceptions in `core/exceptions.py`). `register_exception_handlers` maps them to HTTP responses. Routers don't build error responses by hand.
- **Authentication and authorization (two layers, both from `app.core`):**
  1. **Router level: who are you.** Every protected router declares `APIRouter(..., dependencies=[Depends(get_current_user)])`. It validates the access token (present, signed, unexpired, type `access`, valid `sub`/`role` claims) and returns the `AuthUser` it states, or `401`. It does not read the DB. A router that mixes public, refresh-token and access-token routes (only `/auth`) puts the dependency on each endpoint instead.
  2. **Endpoint level: which roles may call it.** Every protected endpoint names its allowed roles with a role alias (`DeveloperOnly` = `DEVELOPER`; `DeveloperOrAdmin` = `DEVELOPER`, `ADMIN`; `AnyRole` = every `Role`, so a new role is included automatically). Endpoints that don't use the actor put `Depends(require_roles(...))` in `dependencies=[...]`. A wrong role gets `403` and is audited as `auth.role_denied` by core's `AuditServices`. This is the **only** place an endpoint's access is checked. FastAPI resolves `get_current_user` once per request, so the two layers don't decode the token twice.
  - Roles: `DEVELOPER` (everything), `ADMIN` (the farm admin), `STAFF`. The member name, the stored value and the API value are the same string. New users default to `STAFF`, the least-privileged role. Which endpoints each may call is in the endpoint catalog (02 §11).
  - **The role comes from the access token, by decision** ([ADR-0002](../../docs/adr/0002-current-user-from-access-token.md)). Access tokens carry `sub`, `role` and `email`. A role change or deactivation takes effect when the user's access token expires (≤ `jwt_access_token_expire_minutes`, 15 min): refresh and PIN load the row, refuse `is_active = false`, and issue a token with the current role. `AccountUser` endpoints (`/auth/me`, onboarding, change password or PIN) also load the row and refuse deactivated users.
  - **Tokens are stateless JWTs, by decision.** Neither access nor refresh tokens are stored server-side: there's no session table, no revocation list, no rotation. A token stays valid until its `exp`; sign-out deletes the client's cookies, and `POST /auth/sign-out` only records the `auth.sign_out` audit event. Deactivation takes effect at the next refresh, because `get_refresh_user` reloads the user and rejects `is_active = false`. Keep access tokens short (`jwt_access_token_expire_minutes`): it bounds both a stolen token and how long a demoted or deactivated user keeps access. Locking everyone out at once means rotating `jwt_secret_key`.
  - Brute-force protection is `core/security/rate_limit.py` (`rate_limit("<scope>")` as an endpoint dependency, per client IP, in-process).
  - **Role checks inside a service only when the router can't decide.** When the rule depends on request data or a DB row (the role being assigned, the target user's role), the service compares roles (`actor.role != Role.DEVELOPER`) and returns a failure code that the router maps to `403` (for example `DEVELOPER_ROLE_REQUIRED` when a non-`DEVELOPER` touches a `DEVELOPER` account).
- State-changing actions (create/update/delete, device commands, worker control) write an audit entry through `core.audit`.
- **Audit is one unified writer: `core.audit.AuditServices`.** It writes every `audit.audit_events` row (`record`), records service result codes (`record_code`: `code → (Outcome, http_status)` from `outcomes`, a failure in `errors` becomes the `{"errors": [...]}` `changes` payload), and records a code against a resource row (`record_target`).
  - **Nothing resource-specific → no audit file.** The service builds the core class with its own maps: `self.audit = audit or AuditServices(outcomes=BATCH_OUTCOMES, errors=BATCH_ERRORS)`, then `self.audit.record_target("batch.create", code, request, actor, target_type="batch", target=batch)`.
  - **Resource-specific events → `<resource>/services/audit_services.py`** with a subclass named `<Resource>AuditServices(AuditServices)` that passes its maps to `super().__init__` and adds only the named events no other module needs. Today only `authentication.users` has one: `AuthAuditServices` (sign-in, PIN, onboarding). Token-rejected and role-denied events are recorded by core's `AuditServices` inside the core guards.
  - Never copy outcome maps, error builders or the writer into a resource. If two resources need the same helper, it moves into `core.audit`.

## 14. Configuration

- All settings live in `core/config.py` (`Settings`, pydantic-settings, `.env`). This includes DB URI, JWT, RabbitMQ URL, exchange names, YOLO (`yolo_weights`, `yolo_weights_dir`, `yolo_classes`, `yolo_image_size`, `yolo_confidence`, `yolo_device`, `yolo_threads`), detection (`detection_ticket_seconds`, `detection_auth_timeout_seconds`, `detection_max_frame_bytes`, `detection_max_sessions`, `detection_ticket_rate_limit`, `detection_allowed_origins`, `detection_sticker_mm`, `detection_camera_distance_mm`, `detection_camera_fov_deg`, `detection_width_offset_mm`), DeepInfra settings (`deepinfra_api_key`, `deepinfra_base_url`, and model IDs for each purpose), and forecast settings (`forecast_model_dir`, `forecast_history_days=14`, `forecast_horizon_days=7`, `forecast_min_logged_days=5`, `forecast_reload_seconds=60`, `forecast_retrain_min_new_days=20`, `forecast_retrain_min_scored_crabs=3`, `forecast_keep_models=5`, `forecast_training_timeout_minutes=30`).
- Long-lived clients (AMQP connection, SSE hub, YOLO detector, in-memory checkpointer + compiled graph) are created in the FastAPI `lifespan` and closed on shutdown. Don't create them at import time.

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
- `crab_management/logs/` has list and create only; `GET`/`PATCH`/`DELETE /logs/{log_id}` aren't built yet.
