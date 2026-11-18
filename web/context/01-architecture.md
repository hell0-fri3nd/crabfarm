# 01 — Web Architecture

These are the architecture rules for `web/`. Read this file before adding or changing any frontend code.
Coding style is in `02-coding-rules.md`, and the UI system is in `03-design-systems.md`.

> **Status:** `web/` is being **rewritten to Next.js (App Router)**. The current React Router 7 + Redux + Axios code (and `web/ARCHITECTURE.md`) is **legacy**. Don't extend it. New work follows this file.

---

## 1. Role: Frontend + its own BFF

```
Browser ──(same origin, httpOnly cookies)──▶ Next.js (BFF) ──(Authorization: Bearer)──▶ FastAPI
   ▲                                              │
   └──────────── SSE proxied through BFF ◀────────┘

Browser ──wss /ws/detections (same origin)──▶ Next.js rewrite ──▶ FastAPI WS /detections/ws   (live detection only, ticket auth)
```

- Next.js is the **only** thing the browser talks to. The browser **never** calls FastAPI directly and **never** sees a JWT.
- The BFF (Server Actions + Route Handlers) reads the tokens from **httpOnly cookies**, adds `Authorization: Bearer <access_token>` and calls FastAPI.
- `API_URL` is a **server-only** env var. There's no `NEXT_PUBLIC_*` API URL.
- **One exception: live detection** ([ADR-0003](../../docs/adr/0003-live-object-detection-over-websocket.md), `docs/yolo/README.md`).
  - Route Handlers can't upgrade to a WebSocket, so `next.config.ts` rewrites `/ws/detections` to `${API_URL}${API_PREFIX}/detections/ws` (`beforeFiles`), and Next proxies the upgrade. The browser still only talks to the web origin.
  - **No JWT reaches the browser.** The `startDetection` Server Action gets a 30 s single-use ticket from `POST /detections/tickets` through the BFF client, and the client sends it as the first socket message.
  - `next.config.ts` can't import the `server-only` `lib/env.ts`, so the root-`.env` parsing lives in `lib/root-env.ts`, which both import. `proxy.ts`'s matcher skips `ws/`.
  - No other WebSocket is allowed. Everything else live stays SSE.
- **Docker:** `web/Dockerfile` builds Next.js `standalone` output. nginx (`nginx/`) is the only published service. It serves HTTPS with a self-signed certificate generated for `WEB_ORIGIN` and kept in the `nginx_certs` volume, because browsers only allow the camera on HTTPS or `localhost`, and redirects plain HTTP on the same port to HTTPS. It proxies everything to the web app, with buffering off for streaming and WebSocket upgrades on. It replaces `X-Forwarded-For` with the real client address, so the value the BFF forwards can't be forged. The detection rewrite is fixed at build time, so `API_URL` is a build argument as well as a runtime variable.

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js App Router, React 19, TypeScript (strict) |
| UI | **shadcn ecosystem only**: shadcn/ui (Radix + Tailwind CSS 4), shadcn registries (e.g. `@assistant-ui`), `sonner` toasts, `next-themes` |
| Icons | `lucide-react` only |
| Forms | `react-hook-form` + `zodResolver` (shadcn `Form`) |
| Validation | **zod** for every input and every read (§6) |
| Server state | TanStack Query (tables, reports, lists, live caches) |
| Tables | TanStack Table through the shadcn `data-table` pattern |
| Charts | Recharts through the shadcn `Chart` component |
| Client state | **zustand** (replaces Redux): UI state and the signed-in user's non-secret profile (§7) |
| Tokens | **httpOnly cookies only**: `access_token` and `refresh_token` (§4) |
| HTTP | `fetch` inside the BFF only. No Axios. |
| Realtime | SSE from FastAPI, proxied by a BFF Route Handler, consumed by `events/` hooks. The single exception is the live-detection WebSocket (§1) through `partysocket` (reconnecting `WebSocket`) |
| Camera + QR | `react-webcam` (Scan: rear camera preview) + `barcode-detector` (`scan/lib/qr-reader.ts`): the browser's own `BarcodeDetector` when it supports `qr_code` (Chrome on Android), otherwise its ZXing WebAssembly ponyfill, loaded only when the camera starts (Safari/iPhone, Firefox, Mac). Reads the webcam `video` every 500 ms |

Not allowed: Redux / redux-persist, Axios, other component kits, other icon sets, other chart libraries, and storing tokens in `localStorage`, `sessionStorage` or JS-readable cookies.

## 3. Folder Structure (layered, domain-based)

Everything under `app/` is grouped by **domain**. Each route group or route segment is a domain with its own layers.

```
web/
├── app/
│   ├── layout.tsx                    # root: <html>, ThemeProvider, QueryProvider, Toaster
│   ├── globals.css
│   │
│   ├── (auth)/                       # DOMAIN: authentication (public)
│   │   ├── layout.tsx                # auth shell; redirects to portal if already signed in
│   │   ├── sign-in/page.tsx
│   │   ├── pin/page.tsx
│   │   ├── api/  components/  lib/  actions/  events/  types/
│   │
│   ├── (protected)/                  # requires a session
│   │   ├── layout.tsx                # <Suspense> boundary for every session read (cacheComponents)
│   │   │
│   │   ├── team-onboarding/          # DOMAIN: first login → reset password + set pin
│   │   │   ├── layout.tsx            # <CustomSessionGate stage="onboarding">: already onboarded → portal
│   │   │   ├── page.tsx
│   │   │   ├── api/  components/  lib/  actions/  events/  types/
│   │   │
│   │   └── (portal)/                 # all authenticated app pages
│   │       ├── layout.tsx            # <CustomSessionGate stage="portal"> + app shell; needs onboarding → team-onboarding
│   │       ├── dashboard/            # DOMAIN: briefing, live sensor tiles, alerts, growth forecast
│   │       ├── logs/                 # DOMAIN: crab and sensor logs (tabs), export
│   │       ├── feeding/              # DOMAIN: feeders, schedules, feed now
│   │       ├── qr-stickers/          # DOMAIN: generate / print crab QR stickers
│   │       ├── scan/                 # DOMAIN: scan QR → weigh/width → save crab log
│   │       ├── assistant/            # DOMAIN: chat page (Ask AI button in the top bar opens it)
│   │       ├── users/                # DOMAIN: add users, roles, deactivate (admin)
│   │       ├── activity/             # DOMAIN: audit trail grouped by day
│   │       └── profile/              # DOMAIN: my profile, password, PIN, theme
│   │           (each portal domain has: page.tsx, layout.tsx?, api/ components/ lib/ actions/ events/ types/)
│   │
│   └── api/                          # BFF Route Handlers (proxy + streams), no UI
│       ├── [...path]/route.ts        # GET proxy for TanStack Query reads
│       ├── stream/[...path]/route.ts # SSE proxy
│       ├── assistant/chat/route.ts   # chat stream proxy
│       └── session/end/route.ts      # clears the session cookies → /sign-in (render can't delete cookies)
│
├── components/                       # GLOBAL shared components (used by ≥ 2 domains)
│   ├── ui/                           # shadcn-generated primitives (untouched; see 03)
│   └── custom/                       # shared custom-<name>.tsx (shell, severity, sensor tile, charts, …)
├── api/                              # GLOBAL endpoint fetchers used by ≥ 2 domains
├── lib/                              # GLOBAL: bff client, session, query client/keys, utils (cn)
├── actions/                          # GLOBAL Server Actions used by ≥ 2 domains (e.g. sign-out)
├── events/                           # GLOBAL SSE hooks used by ≥ 2 domains
├── types/                            # GLOBAL zod schemas + inferred types (envelope, page, user)
├── hooks/                            # GLOBAL non-SSE client hooks (use-mobile, use-debounce)
├── stores/                           # GLOBAL zustand UI stores
└── proxy.ts                          # Next 16 name for middleware: optimistic cookie check → redirect
```

### Domain layers (every domain has these)

| Folder / file | Holds | Rule |
|---|---|---|
| `page.tsx` | Route entry, a **Server Component**. Fetches or prefetches and composes domain components. | No business logic; thin |
| `layout.tsx` | Domain shell / guard (only where the domain needs one) | Guards run server-side |
| `components/` | Domain UI (`"use client"` only on interactive leaves) | Uses shadcn primitives from `@/components/ui` |
| `api/` | **Endpoint fetchers**: one `<resource>-api.ts` per FastAPI resource, exporting a `<resource>Api` object with one function per endpoint (`batchApi.list(filters)`, `batchApi.create(input)`). The FastAPI path lives here and nowhere else. | `import "server-only"`; calls FastAPI through the BFF client and parses the response with the domain's zod schema. No UI, no cookies handling of its own. |
| `lib/` | Domain helpers: query keys, query options, mappers, formatters, table column defs | Pure TS; no JSX unless it's a column def |
| `actions/` | **Server Actions** (`"use server"`) for this domain's writes | Validate with zod → call the domain's `api/` fetcher → return `ActionResult`. Never call the BFF client or write a FastAPI path directly. |
| `events/` | **SSE subscription hooks** (`use-<resource>-stream.ts`) | Open `/api/stream/...`, validate each event with zod, write into the TanStack Query cache |
| `types/` | **zod schemas** + `z.infer` types for this domain | The single source for both form validation and response parsing |

- Domain folders (`components/`, `lib/`, …) never contain `page.tsx` or `route.ts`, so they're never routable.
- **The "2 or more" rule:** code starts **inside its domain**. When a second domain needs it, **move it to the global folder** of the same layer (`api/`, `components/`, `lib/`, `actions/`, `events/`, `types/`).
- A domain **never imports from another domain's folders**. If it needs something from another domain, promote that thing to global first.
- Import direction: `page/layout → components → (events, lib, actions) → api → types`. Only server code (`page.tsx`, `layout.tsx`, `actions/`) imports `api/`; client components never do. Global folders never import from `app/`.

## 4. Authentication (httpOnly cookies only)

| Cookie | Contents | Flags |
|---|---|---|
| `access_token` | FastAPI access JWT | `httpOnly` (always), `Secure` = `COOKIE_SECURE`, `SameSite` = `ACCESS_COOKIE_SAMESITE` (default `lax`), `Path` = `COOKIE_PATH` (default `/`), `maxAge` = `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` |
| `refresh_token` | FastAPI refresh JWT | `httpOnly` (always), `Secure` = `COOKIE_SECURE`, `SameSite` = `REFRESH_COOKIE_SAMESITE` (default `strict`), `Path` = `COOKIE_PATH`, `maxAge` = `JWT_REFRESH_TOKEN_REMEMBER_ME_DAYS` when "Keep me signed in" is checked, otherwise `JWT_REFRESH_TOKEN_EXPIRE_DAYS` |

The cookie options come from the root `.env` through `lib/env.ts` (§6). `COOKIE_SECURE` defaults to `true` in production and `false` otherwise. `httpOnly` is never configurable. Secure cookies get the `__Host-` prefix when the path is `/`, otherwise `__Secure-`. `SameSite=none` is rejected at startup unless `COOKIE_SECURE=true`. Cookie lifetimes use the **same JWT expiry keys as FastAPI** (shared root `.env`), so a cookie never outlives or undercuts its token; the BFF never decodes JWTs. The PIN flow, once built, must keep the original remember-me choice. Tokens are written and read **only** server-side (`cookies()` from `next/headers`) in `lib/session.ts` (`import "server-only"`).

**Flows**

1. **Sign in:** `(auth)/sign-in` form → `signIn` Server Action → zod validates → `POST /auth/sign-in` → sets both cookies → returns `{ name, role, needs_onboarding }` (never the tokens) → redirect to `team-onboarding` or the portal.
2. **PIN unlock:** when the access token is missing or expired but a refresh token exists, the user is sent to `(auth)/pin`. That calls `POST /auth/sign-in/pin` with the refresh token as Bearer and replaces **only the access cookie**, so the refresh cookie keeps its remember-me lifetime. The page greets the user from a `user_name` httpOnly cookie set at sign-in with the refresh lifetime and has a "Not you? Sign out" link. A 401 without field errors (refresh token rejected) clears the cookies and goes to `/sign-in`. The PIN only re-issues the access token; it is **not** a sign-in option, so `/sign-in` has no link to `/pin`.
3. **Team onboarding:** on first sign-in, the user must change their password and set a PIN (`PATCH /auth/change-password`, `PATCH /auth/change-pin`) before `(portal)` is reachable. `(portal)/layout.tsx` redirects un-onboarded users. `team-onboarding/layout.tsx` redirects onboarded users away.
   *Backend:* `POST /auth/sign-in`, `POST /auth/sign-in/pin` and `GET /auth/me` return `needs_onboarding`. It turns `false` only after both the password and the pin have been changed. An admin reset (`POST /users/{user_id}/reset-credentials`) sets it back to `true`.
4. **Sign out:** global `actions/sign-out.ts` (a Server Action, so Next.js checks its Origin) calls `POST /auth/sign-out` with the refresh token (for the audit trail; its result is ignored), deletes the cookies → `/sign-in`. Tokens are stateless JWTs (api/context 01 §13), so nothing is revoked server-side; a copied token stays valid until it expires. Used by the profile page, the phone More sheet and the "Not you? Sign out" link on `/pin`. `/api/session/end` is only the internal sink for dead sessions, never a user-facing sign-out.
5. **401 from FastAPI** anywhere in the BFF (render, Server Action, Route Handler) is handled once, in `lib/bff/api-client.ts`: a token 401 (no field errors) on an access-token call redirects to `/pin` if a refresh cookie exists, otherwise to `/api/session/end`. Calls that send their own `bearerToken` (PIN) or are unauthenticated (sign-in) handle their 401s themselves, because there a 401 means wrong credentials. `/api/session/end` clears the cookies and redirects to `/sign-in` (rendering can't delete cookies; this also breaks the `/sign-in` ↔ `/dashboard` loop a rejected access cookie would cause).

**Guards**
- `proxy.ts` is **optimistic only**: it checks whether the cookies exist and redirects (protected path: no access → `/pin` if refresh exists, else `/api/session/end` → `/sign-in`; `/pin` without refresh → `/api/session/end`; `/sign-in` with access → `/dashboard`, with only a refresh → `/pin`). While the refresh token lives, `/sign-in` is unreachable; once it expires, `/pin` is unreachable. The rules: **access expired → PIN**, **refresh expired → forced sign-out**, **`needs_onboarding` → forced onboarding** (`CustomSessionGate`). It doesn't decode or trust tokens. Its `matcher` runs on **every page** except `api/`, `_next/` and static files, and only `/sign-in` and `/pin` are public, so every route under `(portal)` or `team-onboarding` (route groups don't appear in URLs) is protected without being listed. A new public page must be added as an explicit exception in `proxy.ts`.
- Real checks happen server-side through `lib/auth.ts` → `getCurrentUser()` (React `cache`, one `GET /auth/me` per request, via the global `api/session-api.ts`). `components/custom/custom-session-gate.tsx` uses it in the `(portal)` and `team-onboarding` layouts for the onboarding redirect. With `cacheComponents`, every server read of FastAPI is per-request (`lib/bff/api-client.ts` calls `connection()`), so it must sit inside its own `<Suspense>`: the gate renders as a self-suspending **sibling** of the shell (never a wrapper), and user-dependent shell parts like the sidebar's user card get their own boundary with a skeleton fallback. That keeps layouts prerenderable and navigation instant. Every FastAPI call also validates the JWT itself.
- Server code that needs the user calls `getCurrentUser()`; never pass tokens or decode JWTs in the web app.
- The BFF client forwards the browser's `X-Forwarded-For`, so FastAPI's per-IP rate limit and audit see the real client, not the Next.js server.
- `app/(protected)/error.tsx` catches a FastAPI outage or 5xx during the session check (plain cause + Try again).
- Role/permission-based UI hiding is cosmetic. FastAPI enforces permissions.

## 5. Data Flow

| Need | Path | Notes |
|---|---|---|
| **Read** (tables, reports, details) | Client: TanStack Query → `GET /api/<fastapi path>` (BFF proxy) → FastAPI | Query options live in the domain `lib/` (`crabQueries.list(filters)`). The response is parsed with zod. |
| **First paint** | `page.tsx` (Server Component) prefetches through the domain `api/` fetcher → `HydrationBoundary` | Same query keys as the client |
| **Write** (create, update, delete, commands) | Client form → domain **Server Action** → zod → domain `api/` fetcher → FastAPI → `ActionResult` | Then `queryClient.invalidateQueries(...)` on the client and a `sonner` toast with `message` |
| **Live** (system, the crab scale, the water sensors, the growth model status; devices later) | `events/` hook built on `useEventStream` → `EventSource("/api/stream/<resource>/stream?...")` → `app/api/stream/[...path]/route.ts` → `lib/bff/stream-proxy.ts` streams the FastAPI SSE body through | Same-origin, so cookies are sent automatically. The proxy only accepts paths ending in `/stream`, adds the Bearer header and `X-Forwarded-For`, and aborts upstream when the browser leaves. Failures are JSON (`401` no cookie, `404` not a stream, upstream status passed through) because `EventSource` can't follow redirects; `useEventStream` reports `closed`, calls `router.refresh()` once per outage so the server can redirect to `/pin`, and retries after 2, 4, 8, 16, then every 30 s (reset when the stream opens), so a restarted API is picked up within seconds without a page refresh. Each event is validated with its zod schema (`types/events.ts`). Until TanStack Query is added, hooks take an `onEvent` callback; domain hooks then write into the query cache. `custom-device-status-bridge` in the portal layout runs global `events/use-device-status-stream.ts` on `/api/stream/devices/stream`, one connection for every page, and fills zustand `stores/device-status-store.ts`. The top bar's device pill (`custom-live-status`, `lib/device-status.ts`) treats 10 s without a `device.status` as not connected. Water sensors at Warning or Danger raise a toast on any page (again after 5 minutes, or at once on Warning → Danger), a Dashboard alert card held for 30 s after the last sighting so changing readings don't flicker (**Acknowledge** with Undo hides it for that episode; a change of level or a new episode shows it again), and count toward the Dashboard number in the sidebar and phone tabs. |
| **Live detection** (bidirectional, Scan only) | `startDetection` Server Action → ticket; `partysocket` → `wss /ws/detections` → `next.config.ts` rewrite → FastAPI `WS /detections/ws`. Binary `[u32 frame_id][JPEG]` up, JSON `result` down | One frame in flight (send the next after its `result`), at most 8 fps, JPEG long side ≤ 640. Each message is validated with zod (`scan/types/detection.ts`). Close `4001`/`4401`: get a new ticket and reconnect, and if the action gets 401, `router.refresh()` (→ `/pin`). `1013`: back off. Nothing is stored |
| **Assistant chat** | `assistant` domain → `POST /api/assistant/chat` (streaming) → FastAPI SSE | `thread_id` is kept only in a non-persisted zustand store. No history (matches the API). |

**BFF client** (`lib/bff/api-client.ts`, server-only):
- Builds `${API_URL}${API_PREFIX}${path}`, attaches the bearer token from cookies and forwards `X-Correlation-ID`.
- Parses success with `apiResponse(schema)`, the zod version of FastAPI's `{ success, message, code, details }`.
- Parses errors into `{ detail, errors[{ field, message, type }] }` and maps `errors[]` back onto form fields (`form.setError(field, …)`).
- Returns an `ApiResult<T>` and never throws: a network failure or timeout (10 s) becomes `{ ok: false, status: 0, message }`, and an unparseable body becomes a generic error. The form shows `errors[]` under matching fields and `message` as an error toast when no field matches.

**Live charts:** `events/` hooks append incoming events into the query cache (`queryClient.setQueryData`) with a bounded window (e.g. last N points). Charts just read the query, so components never manage socket state.

**Tables:** server-side pagination, sorting and filtering that match the API (`page`, `size`, `sort`, filters). Table state lives in **URL search params**, so it's shareable and survives a refresh.

## 6. Validation: zod on every input and every read

| Boundary | Validated by |
|---|---|
| Form input (client) | `zodResolver(schema)` in `react-hook-form` |
| Server Action input | the **same** schema, `schema.safeParse(input)` again on the server (never trust the client) |
| FastAPI responses (BFF + query fns) | `apiResponse(DetailSchema).parse(json)` |
| SSE events | `EventSchema.safeParse(JSON.parse(e.data))`. Invalid events are dropped and logged. |
| Search params / route params | `searchParamsSchema.parse(...)` in `page.tsx` |
| Env vars | `lib/env.ts` parses `process.env` with zod at startup. Every value comes from the **repo-root `.env`** (read by `lib/env.ts`; real environment variables override it), shared with FastAPI and docker compose: `API_URL` (FastAPI origin, e.g. `http://localhost:8000`), `API_PREFIX` (same key FastAPI uses), the optional cookie keys `COOKIE_SECURE`, `COOKIE_PATH`, `ACCESS_COOKIE_SAMESITE`, `REFRESH_COOKIE_SAMESITE`, and the JWT expiry keys shared with FastAPI `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRE_DAYS`, `JWT_REFRESH_TOKEN_REMEMBER_ME_DAYS` (§4). Code reads `env.*`, never `process.env` directly. No `web/.env*` files. |

Schemas live in the domain `types/` (or global `types/` once shared), and the types come from them (`type Crab = z.infer<typeof crabSchema>`). Don't hand-write a duplicate interface.

## 7. State Ownership

| State | Owner |
|---|---|
| Server data (anything from FastAPI) | TanStack Query cache **only** |
| Access token + refresh token | **httpOnly cookies only**, set and read by the BFF (server). Never in zustand, `localStorage`, `sessionStorage` or JS-readable cookies. |
| Signed-in user profile (`name`, `email`, `role`, `needs_onboarding`) | zustand `stores/auth-store.ts`, filled from the sign-in / `GET /auth/me` result. Display only. |
| URL-worthy UI state (filters, page, tab, date range) | URL search params |
| Form state | `react-hook-form` |
| Cross-component UI-only state (sidebar, assistant open, live-chart paused, current `thread_id`) | zustand store in `stores/` (or a domain store if it's used once) |
| Local UI state | `useState` |

- **zustand is the only client store.** Redux / redux-persist are removed.
- zustand never holds tokens, passwords, PINs or FastAPI list/detail data (that's TanStack Query's job).
- Use `persist` only for harmless preferences (sidebar collapsed, theme). The auth profile store isn't persisted; it's re-filled from `/auth/me` on load.

## 8. Rendering Rules

- Server Components by default. Add `"use client"` only on leaves that need state, effects, browser APIs, TanStack Query hooks or event handlers.
- `cacheComponents` is on: reading `cookies()` (directly or through `getCurrentUser()`) outside a `<Suspense>` boundary is a build error. Protected routes get theirs from `(protected)/layout.tsx`; anything else that reads the session (e.g. `/pin`) wraps the reading component in its own `<Suspense>` with a skeleton.
- Anything that touches cookies or `API_URL` imports `"server-only"`.
- Each portal domain has `loading.tsx` (skeleton) and `error.tsx` where it needs them. The root has `not-found.tsx`.

## 9. Mapping to the API

| Web domain | FastAPI resources |
|---|---|
| `(auth)`, `team-onboarding` | `/auth/*` |
| `dashboard` | Growth model alert above the growth card (ADR-0005): `GET /forecasts/model` on the server, then live `forecast.model` events from `/api/stream/forecasts/stream` (global `events/use-forecast-model-stream.ts`, `components/custom/custom-forecast-model-alert.tsx`, `actions/retrain-model.ts` → `POST /forecasts/model-trainings`, `api/forecast-model-api.ts`, `types/forecast-model.ts`; shared with `logs`). Growth card: `GET /logs/daily-summary?from=…` + `/batches`; a **date range** select (`growth` URL param: Last 12 months by default, per month; Last 30 days and Last 7 days, per day) plots averages of actual (solid) and forecast (dashed) logs, weighted by log count, by batch and Weight (g) / Width (mm), in its own `<Suspense>`. **Water now** is live from `/api/stream/water-sensors/stream` (`dashboard/events/use-water-sensor-stream.ts`, `water_sensor.reading` events; normal ranges and meter scales from `GET /water-sensors/thresholds`, which the API reads from the root `.env`, through the global `lib/water-sensors.ts`): each event carries the API's Normal, Warning or Danger per sensor, and after 10 s without a reading (the board publishes about every 0.8 s) the tiles show "No reading" with the last-seen time. The sensors send no presence signal, so `custom-sensor-connection` derives its state from the stream and that 10 s window: Checking sensors…, Sensors connected, Sensors not connected, or Live feed offline (the SSE stream itself is down). `use-sensor-connection-alerts` turns a lost connection into a warning toast plus a Medium alert inside Water now that stays until it recovers, then a "reconnected" success toast. Live feed offline waits 10 s first, so the stream's normal reconnect at access-token renewal stays silent. **Water sensor updates** (`custom-water-updates`, under Water now, in its own `<Suspense>`) reads the saved logs from `GET /water-sensors/logs` through the global `api/water-sensor-logs-api.ts`: the latest ten 30-minute logs, one row each with its worst status, newest first, refreshed just after each :00 and :30. **See all sensor logs** opens the Logs page's Sensor logs tab. **Summary stats** are live: **Water in range** (sensors not at Warning or Danger) from the device status store, and **Crabs logged today** and **Next feed** from `GET /dashboard/summary` on the server, then `dashboard.summary` events from `/api/stream/dashboard/stream` (`dashboard/events/use-dashboard-summary-stream.ts`). The briefing is preview text, and the alert list shows live water alerts only. `GET /logs` and its schema are global (`api/crab-logs-api.ts`, `types/crab-log.ts`), shared with `logs` |
| `logs` | Crab logs tab: `GET /logs` (server-side `page`/`size=7`, `batch_id`, `crab_id`, `log_type` (Type filter: all, actual, prediction), `from`/`to` from the farm-day date range, `sort=-created_at`; the search box takes a crab code `B1-A1`, `A1` or `B1`), `/crabs` (crab names), `/batches` (batch filter), `/users` for "Logged by" names (ADMIN/DEVELOPER only; STAFF see "You" or "Teammate"). Columns follow `crab_management.logs`: crab, batch, type, width mm, weight g, logged by, when. Export CSV is a Server Action that pages through every match (100 per call, up to 5,000 rows). **Table / Chart** switch (`view=chart`): the chart follows **one crab** (the crab in the search box, otherwise the crab with the newest actual log; its **Crab** select lists only crabs with logs in the current dates and batch, from `GET /logs/crab-ids`, and writes the crab into `q`, keeping a typed batch). Weight (g) and Width (mm) each merge **Actual** (solid, filled dots) and **Forecast** (dashed, hollow dots, days after the last actual log shaded) on one axis, one point per farm day from that day's latest log (what the growth model reads), up to the crab's newest 500 logs. The Type dropdown and pagination hide in chart view. **Forecast 7 days** (outline, next to Export CSV, ADMIN/DEVELOPER only via `forecasts.run`; hidden for STAFF) calls `POST /forecasts` with `{}` through `actions/run-prediction.ts` (`api/forecasts-api.ts`). It runs in the request (milliseconds), so the button only shows "Forecasting…"; it first reads `GET /forecasts/readiness`. With only recent logs it runs at once, because nothing physical happens and the API refuses overlapping forecasts. If crabs have only old logs, an `AlertDialog` says how old they are, that the forecast starts today from each crab's latest 14 logged days and that saved forecasts stay, then offers Cancel, the recent crabs only (when there are any) or all of them (`include_old_logs`). 201 → success toast (crabs forecast, plus how many already had a forecast or lacked logged days). The same growth model alert as the Dashboard sits above the filters on the Crab logs tab; while the model is missing, Forecast 7 days is disabled and points at it (`aria-describedby`) and `router.refresh()` so the new forecast rows feed the dashed line; 409 → info "Forecasts are up to date"; 400 → warning "No crab has enough logs to forecast yet"; 503 / other → error toast with the fix and "Nothing was saved." Sensor logs tab: `GET /water-sensors/logs` (server-side `page`/`size=7`, `sensor` from the name search, `status` from the level filter: Normal, Warning, Danger, `from`/`to`) and `/water-sensors/logs/status-counts` for the header; Export CSV is a Server Action that pages through every match, up to 5,000 rows |
| `feeding` | `/devices`, `/devices/{id}/commands`, `/devices/stream` (**Feed now** and **Feed group** are still simulated in the browser). Group cards: `GET /cages` on the server, one card per `group_code`; each cage's **Scheduled** switch calls `PATCH /cages/{id}` through `actions/set-cage-active.ts` (`api/cages-api.ts`; every role, optimistic, reverted on failure, Undo after turning off). Schedules card: `GET /schedules` on the server, with its groups taken from the cages; **Add schedule** and each row's edit and delete buttons (ADMIN/DEVELOPER only via `schedules.manage`, hidden for STAFF) call `POST /schedules`, `PATCH /schedules/{id}` (same form, prefilled) and `DELETE /schedules/{id}`, and delete's Undo calls `POST /schedules/{id}/restore`. Every role can use the row's switch (`PATCH /schedules/{id}`, optimistic, reverted on failure, Undo after turning off), and **Feed now** and **Feed group** stay open to every role. All writes go through `actions/` and `api/schedules-api.ts` |
| `qr-stickers` | `/batches` (list, create), `/crabs` (groups and crabs for every batch), `POST /crabs/sticker-downloads` (called before each PDF/PNG download; the file is only made when it succeeds, so the API's role check and audit decide), `GET /audit-events?action=crab.sticker_download&outcome=SUCCESS&size=5` (recent downloads: the API returns everyone's for ADMIN/DEVELOPER and only the caller's for STAFF; **See all** opens `/activity?type=stickers&range=12m&result=success` (the same slice, so the counts match)) |
| `scan` | `/batches` + `/crabs` (a scanned or typed code `B<batch>-<crab>` must name an existing batch and crab; zod rejects it otherwise, e.g. "There's no Batch 3 yet"), `POST /logs` (Save log: `weight_g` and `width_mm` sent exactly as typed, no unit conversion; weight fills live from the crab scale (`scan/events/use-weight-stream.ts` → `/api/stream/scales/stream`, `scale.reading` events; "Scale connected" while a reading arrived in the last 6 s; typing overrides, "Use the scale's … g" resumes)), `GET /logs?from=<farm day start>&size=1` (logged-today count), `GET /audit-events?action=log.create&outcome=SUCCESS&size=5` (recent logs: everyone's for ADMIN/DEVELOPER, the caller's own for STAFF). Live detection (ADR-0003): `POST /detections/tickets` (`actions/start-detection.ts`), then `wss /ws/detections` (`components/use-detection-socket.ts`, `use-frame-capture.ts`, `custom-detection-overlay.tsx`). Whenever the camera is on, it draws labelled boxes over the video (built-in COCO model), alongside QR reading. With more than one camera, a **Camera** select (`use-camera-devices.ts`, listed after permission, updated on `devicechange`) switches the stream. The choice is remembered per device in `localStorage` (`scan/lib/camera-choice.ts`, guarded), and a remembered camera that's gone falls back to the rear camera. After a sticker is read, the status line lists what's in view. **Width in mm:** the API measures the most confident box's horizontal span, scaled by the crab's 40 mm sticker when its QR is in view, else by the 12 in stand's camera settings. Frames go up at up to 1280 px (`use-frame-capture.ts`) so the QR is readable. The overlay labels the measured box `… mm wide`. The status line shows the scale source and, for the sticker, the camera angle to calibrate with. `use-steady-width.ts` keeps a median of the last 7 widths, and after a sticker is read it writes into **Width (mm)** live ("Live from the camera · steady / hold still"). Typing in the field stops live updates, and "Use the camera's … mm" resumes them. Saving a log turns the camera off: the viewport is keyed by the saved count, so it remounts, which stops the webcam and closes the socket. Later: `/qr/scan` |
| `assistant` | `/assistant/chat` |
| `users` | `/users` |
| `activity` | `GET /audit-events` with `action=` repeated for the chosen type (Sign-ins `auth.*` writes, Crab logs `log.create`, Batches `batch.create`, QR stickers `crab.sticker_download`, Users `user.*` writes, Devices `scale.connected`, `scale.disconnected`, `water_sensor.connected` and `water_sensor.disconnected` (by System, so ADMIN/DEVELOPER see them), Security `auth.role_denied` + token rejections; reads like `log.list` are left out), `outcome=` (succeeded / failed / denied), `from` (today, 7 days, 30 days, 12 months on the farm clock), `q`, `mine` / `actor_id` (Person filter, ADMIN/DEVELOPER only), `size` 20 → 100 via **Load older**. STAFF always get only their own events (the API enforces it). `/users` names the actors for ADMIN/DEVELOPER; `/crabs` names crabs in log events |
| `profile` | `/auth/me`, `/auth/change-password`, `/auth/change-pin`, `/auth/me/activity` (recent activity card; **See all** opens `/activity?person=me&result=success&range=12m`, the same slice, so Security events stay out) |

## 10. Checklist: Adding a Portal Domain

1. Create `app/(protected)/(portal)/<domain>/` with `page.tsx` and the folders `api/`, `components/`, `lib/`, `actions/`, `events/`, `types/`.
2. Write zod schemas in `types/` first, then infer the types.
3. Endpoints: one `<resource>-api.ts` per FastAPI resource in `api/`. Reads: query options in `lib/`. Writes: Server Actions in `actions/` that call `api/`. Live: hooks in `events/`.
4. Build it from its row in `03-design-systems.md` §13 (shadcn parts, `custom-` components, lucide icons), then run the §18 review checklist.
5. Add it to the sidebar nav and to the mapping in §9.
6. Anything a second domain needs gets promoted to the global folder.
