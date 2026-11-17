# ADR-0003: Live object detection from the browser webcam over a ticketed WebSocket

**Status:** Proposed
**Date:** 2026-11-17
**Deciders:** API and web maintainers
**Supersedes:** the camera-detection parts of `api/context/01-architecture.md` §3 and §10 (worker reads RTSP/USB cameras, runs YOLO, publishes `vision.detection.*` and the API streams them over SSE)

## Context

The Scan page already opens the phone or laptop camera with `react-webcam` to read QR stickers. The next step is to show live detection boxes over that same video and, later, to measure the carapace width so the user doesn't type it. The target design is `docs/yolo/plan.png`.

The current rules don't allow that design:

- **web 01 §1:** the browser talks only to the Next.js BFF and never sees a JWT. Live data reaches the browser as SSE proxied by a BFF Route Handler.
- **api 01 §10:** only the worker loads YOLO. It reads fixed cameras over RTSP/USB, and results go out over RabbitMQ and then SSE. The API never loads YOLO.

The forces are:

- **Frames start in the browser, not at a fixed camera.** The data has to go up from the browser (several frames a second) and results have to come back per frame. SSE only goes one way.
- **Next.js Route Handlers can't upgrade to a WebSocket,** so the BFF can't proxy a socket the way it proxies SSE. A Next.js **rewrite** to an external URL does proxy upgrades: `next/dist/server/lib/router-server.js` calls `proxyRequest` for upgrade requests that resolve to a URL with a protocol.
- **Latency matters.** Boxes that lag the video by a second are useless. Every extra hop (BFF HTTP, RabbitMQ RPC) adds delay.
- **No custom model yet.** This round uses a built-in pretrained Ultralytics model (`yolo11n.pt`, the 80 COCO classes). It detects everyday objects, not crabs, and proves the pipeline end to end.
- **No RabbitMQ for this feature,** by decision.
- **Scale is one farm:** a handful of phones at once, CPU-only server.

## Decision

1. **Transport:** a WebSocket at `WS /api/v1/detections/ws`, reached by the browser on its own origin at `/ws/detections` through a `next.config.ts` rewrite. The browser still never calls FastAPI's origin.
2. **Auth: a single-use ticket, never the JWT.**
   - A Server Action calls `POST /detections/tickets` through the BFF client using the access cookie.
   - FastAPI returns a 30 s JWT with `type: "detection"`, a `jti` and `session_exp`, where `session_exp` is the expiry of the caller's access token.
   - The browser sends that ticket as the first WebSocket message. FastAPI checks `Origin`, the ticket type and expiry, and consumes the `jti` in an in-process set.
   - The socket closes when `session_exp` passes (code 4001), the same way SSE streams end with the access token.
3. **Inference:** in the **API process**.
   - `infrastructure/vision.YoloDetector` loads the model once in the FastAPI `lifespan` and runs `predict` on its own `ThreadPoolExecutor(max_workers=1)`. Ultralytics models aren't thread-safe, and this keeps the event loop free.
   - If the model can't load, the API still starts and the socket closes with 1013.
4. **Nothing is stored.** Detection is live only. A width becomes permanent only when the user saves a crab log (`POST /logs`).
5. **The worker camera job, `GET /cameras`, `POST /cameras/{id}/start|stop`, `GET /detections/stream` and the `vision.detection.*` and `worker.camera.*` routing keys are dropped.** If fixed cameras come back, they reuse `YoloDetector` in the worker.

## Options Considered

### Option A: Ticketed WebSocket on the same origin, YOLO in the API process (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Medium: one rewrite, a ticket endpoint, a WebSocket session loop |
| Latency | Lowest: browser → Next rewrite → FastAPI, binary frames, no broker |
| Security | No JWT in the browser. The ticket is single-use, lasts 30 s, works only for detection, and is checked against `Origin` |
| Cost | CPU inference shares the API process |

**Pros:**
- Matches `plan.png`.
- Bidirectional, one frame in flight.
- No new infrastructure (no Caddy or nginx needed, since the Next rewrite proxies upgrades).

**Cons:**
- It's an exception to the "browser talks only to the BFF" rule. The bytes still pass through Next, but the BFF doesn't add the Bearer itself.
- The API must run as a single process, because the `jti` set and the model live in memory.
- Heavy inference can slow CRUD a little. That's bounded by the 1-thread executor and `detection_max_sessions`.

### Option B: HTTP POST per frame through the BFF

| Dimension | Assessment |
|---|---|
| Complexity | Low: one Route Handler, one endpoint |
| Latency | Higher: two HTTP round trips per frame, plus multipart overhead |
| Security | Rules unchanged: the Bearer is added by the BFF |
| Cost | Same inference cost, more request overhead |

**Pros:** No rule changes.
**Cons:** About 2–4 fps at best on a phone network, and the boxes lag. It also needs per-request auth and parsing for every frame.

### Option C: YOLO in the worker, the API forwards frames over RabbitMQ RPC

| Dimension | Assessment |
|---|---|
| Complexity | High: RPC correlation, reply queues, timeouts |
| Latency | Extra broker hop per frame |
| Security | Same as A or B for the browser leg |
| Cost | Keeps CPU load out of the API |

**Pros:** Keeps the "API never loads YOLO" rule.
**Cons:** It goes against the decision not to use RabbitMQ for this feature, and it's the most moving parts for one farm.

### Option D: The browser connects straight to FastAPI's origin with the access JWT

**Rejected.** It puts a JWT in JavaScript, which web 01 §4 forbids, and needs cross-origin WebSocket handling.

## Trade-off Analysis

The real choice is between A and B: **is live, low-lag tracking worth one documented exception to the BFF rule?**
- Phase 2 measures width from a steady run of frames, so frame rate matters. B can't deliver a smooth overlay on a phone.
- A keeps the important guarantee (no JWT in the browser) and drops only the "BFF adds the Bearer" part, replacing it with a ticket that is narrower than the access token.
- C buys process isolation at the cost of the broker and RPC complexity the user ruled out. If the API ever slows down under inference, the fix is a separate vision process behind the same WebSocket contract, not RabbitMQ.

## Consequences

- **Easier:**
  - Live boxes on any device with a camera.
  - Swapping in a custom crab model later is a settings change (`yolo_weights`).
  - One protocol serves Phase 1 (boxes) and Phase 2 (width in mm).
- **Harder:**
  - The API runs as a single process.
  - The API image grows (Torch CPU, OpenCV).
  - Phones need https (`getUserMedia` and `wss` require a secure context).
  - The ticket store and session cap are per process.
- **Revisit when:**
  - API latency rises while detection sessions are open (move inference to its own process or a GPU host).
  - A custom crab model is trained (replace `yolo11n.pt` and set `yolo_classes`).
  - Fixed farm cameras return (run `YoloDetector` in the worker).

## Action Items

1. [x] Update the context docs: api 01 (§1–4, §7, §8, §10, §14, broker table), api 02 (§10, §11 vision), web 01 (§1, §2, §5, §9 scan row), and the AGENT.md index.
2. [x] Backend: `infrastructure/vision` (detector, codec), lifespan wiring, settings, dependencies (`ultralytics`, `websockets`, CPU Torch).
3. [x] Backend: the `artificial_intelligence/vision` resource (`POST /detections/tickets`, `WS /detections/ws`).
4. [x] Web: rewrite `/ws/detections`, exclude `/ws` in `proxy.ts`, `partysocket`, socket and capture hooks, overlay on the Scan camera.
5. [x] Phase 2: width in mm from a fixed stand (12 in, camera field of view), written live into the Scan form.
6. [ ] Check against calipers on about 10 crabs, with a mean absolute error target of 3 mm or less. Needs a crab model: the built-in COCO boxes aren't carapaces.

Design details (protocol, close codes, file layout, Phase 2 math): [`docs/yolo/README.md`](../yolo/README.md).
