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
```

- Next.js is the **only** thing the browser talks to. The browser **never** calls FastAPI directly and **never** sees a JWT.
- The BFF (Server Actions + Route Handlers) reads the tokens from **httpOnly cookies**, adds `Authorization: Bearer <access_token>` and calls FastAPI.
- `API_URL` is a **server-only** env var. There's no `NEXT_PUBLIC_*` API URL.

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
| Realtime | SSE from FastAPI, proxied by a BFF Route Handler, consumed by `events/` hooks |

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
│   │   ├── components/  lib/  actions/  events/  types/
│   │
│   ├── (protected)/                  # requires a session
│   │   ├── layout.tsx                # verifies session server-side → else /sign-in
│   │   │
│   │   ├── team-onboarding/          # DOMAIN: first login → reset password + set pin
│   │   │   ├── layout.tsx            # if already onboarded → portal
│   │   │   ├── page.tsx
│   │   │   ├── components/  lib/  actions/  events/  types/
│   │   │
│   │   └── (portal)/                 # all authenticated app pages
│   │       ├── layout.tsx            # app shell (sidebar, header, assistant); requires onboarding done
│   │       ├── dashboard/            # DOMAIN: briefing, live sensor tiles, alerts, growth forecast
│   │       ├── logs/                 # DOMAIN: crab and sensor logs (tabs), export
│   │       ├── feeding/              # DOMAIN: feeders, schedules, feed now, stop system
│   │       ├── qr-stickers/          # DOMAIN: generate / print crab QR stickers
│   │       ├── scan/                 # DOMAIN: scan QR → weigh/width → save crab log
│   │       ├── assistant/            # DOMAIN: chat page (Ask AI button in the top bar opens it)
│   │       ├── users/                # DOMAIN: invite, roles, deactivate (admin)
│   │       ├── activity/             # DOMAIN: audit trail grouped by day
│   │       └── profile/              # DOMAIN: my profile, password, PIN, theme
│   │           (each portal domain has: page.tsx, layout.tsx?, components/ lib/ actions/ events/ types/)
│   │
│   └── api/                          # BFF Route Handlers (proxy + streams), no UI
│       ├── [...path]/route.ts        # GET proxy for TanStack Query reads
│       ├── stream/[...path]/route.ts # SSE proxy
│       └── assistant/chat/route.ts   # chat stream proxy
│
├── components/                       # GLOBAL shared components (used by ≥ 2 domains)
│   ├── ui/                           # shadcn-generated primitives (untouched; see 03)
│   └── custom/                       # shared custom-<name>.tsx (shell, severity, sensor tile, charts, …)
├── lib/                              # GLOBAL: bff client, session, query client/keys, utils (cn)
├── actions/                          # GLOBAL Server Actions used by ≥ 2 domains (e.g. sign-out)
├── events/                           # GLOBAL SSE hooks used by ≥ 2 domains
├── types/                            # GLOBAL zod schemas + inferred types (envelope, page, user)
├── hooks/                            # GLOBAL non-SSE client hooks (use-mobile, use-debounce)
├── stores/                           # GLOBAL zustand UI stores
└── middleware.ts                     # optimistic cookie check → redirect
```

### Domain layers (every domain has these)

| Folder / file | Holds | Rule |
|---|---|---|
| `page.tsx` | Route entry, a **Server Component**. Fetches or prefetches and composes domain components. | No business logic; thin |
| `layout.tsx` | Domain shell / guard (only where the domain needs one) | Guards run server-side |
| `components/` | Domain UI (`"use client"` only on interactive leaves) | Uses shadcn primitives from `@/components/ui` |
| `lib/` | Domain helpers: query keys, query options, mappers, formatters, table column defs | Pure TS; no JSX unless it's a column def |
| `actions/` | **Server Actions** (`"use server"`) for this domain's writes | Validate with zod → call FastAPI through the BFF client → return `ActionResult` |
| `events/` | **SSE subscription hooks** (`use-<resource>-stream.ts`) | Open `/api/stream/...`, validate each event with zod, write into the TanStack Query cache |
| `types/` | **zod schemas** + `z.infer` types for this domain | The single source for both form validation and response parsing |

- Domain folders (`components/`, `lib/`, …) never contain `page.tsx` or `route.ts`, so they're never routable.
- **The "2 or more" rule:** code starts **inside its domain**. When a second domain needs it, **move it to the global folder** of the same layer (`components/`, `lib/`, `actions/`, `events/`, `types/`).
- A domain **never imports from another domain's folders**. If it needs something from another domain, promote that thing to global first.
- Import direction: `page/layout → components → (events, lib, actions) → types`. Global folders never import from `app/`.

## 4. Authentication (httpOnly cookies only)

| Cookie | Contents | Flags |
|---|---|---|
| `access_token` | FastAPI access JWT | `httpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/`, `maxAge` = token expiry |
| `refresh_token` | FastAPI refresh JWT | `httpOnly`, `Secure` (prod), `SameSite=Strict`, `Path=/`, `maxAge` = refresh expiry |

In production, prefix both with `__Host-`. Tokens are written and read **only** server-side (`cookies()` from `next/headers`) in `lib/session.ts` (`import "server-only"`).

**Flows**

1. **Sign in:** `(auth)/sign-in` form → `signIn` Server Action → zod validates → `POST /auth/sign-in` → sets both cookies → returns `{ name, role, needs_onboarding }` (never the tokens) → redirect to `team-onboarding` or the portal.
2. **PIN unlock:** when the access token is missing or expired but a refresh token exists, the user is sent to `(auth)/pin`. That calls `POST /auth/sign-in/pin` with the refresh token and replaces the cookies.
3. **Team onboarding:** on first sign-in, the user must change their password and set a PIN (`PATCH /auth/change-password`, `PATCH /auth/change-pin`) before `(portal)` is reachable. `(portal)/layout.tsx` redirects un-onboarded users. `team-onboarding/layout.tsx` redirects onboarded users away.
   *Backend dependency:* the sign-in response must include an onboarding flag (e.g. `must_reset_credentials`). It doesn't exist yet in `api/`.
4. **Sign out:** global `actions/sign-out.ts` deletes both cookies → `/sign-in`.
5. **401 from FastAPI** anywhere in the BFF → clear `access_token` and redirect to `/pin` if a refresh token exists, otherwise `/sign-in`.

**Guards**
- `middleware.ts` is **optimistic only**: it checks whether the cookie exists and redirects. It doesn't decode or trust tokens.
- Real checks happen server-side in `(protected)/layout.tsx` (session) and `(portal)/layout.tsx` (onboarding), plus every FastAPI call, which validates the JWT itself.
- Role/permission-based UI hiding is cosmetic. FastAPI enforces permissions.

## 5. Data Flow

| Need | Path | Notes |
|---|---|---|
| **Read** (tables, reports, details) | Client: TanStack Query → `GET /api/<fastapi path>` (BFF proxy) → FastAPI | Query options live in the domain `lib/` (`crabQueries.list(filters)`). The response is parsed with zod. |
| **First paint** | `page.tsx` (Server Component) prefetches with the server BFF client → `HydrationBoundary` | Same query keys as the client |
| **Write** (create, update, delete, commands) | Client form → domain **Server Action** → zod → FastAPI → `ActionResult` | Then `queryClient.invalidateQueries(...)` on the client and a `sonner` toast with `message` |
| **Live** (sensors, devices, detections, forecasts) | `events/` hook → `EventSource("/api/stream/<resource>/stream?...")` → BFF streams the FastAPI SSE body through | Same-origin, so cookies are sent automatically. The BFF adds the Bearer header upstream. |
| **Assistant chat** | `assistant` domain → `POST /api/assistant/chat` (streaming) → FastAPI SSE | `thread_id` is kept only in a non-persisted zustand store. No history (matches the API). |

**BFF client** (`lib/bff/api-client.ts`, server-only):
- Builds `${API_URL}${API_PREFIX}${path}`, attaches the bearer token from cookies and forwards `X-Correlation-ID`.
- Parses success with `apiResponse(schema)`, the zod version of FastAPI's `{ success, message, code, details }`.
- Parses errors into `{ detail, errors[{ field, message, type }] }` and maps `errors[]` back onto form fields (`form.setError(field, …)`).

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
| Env vars | `lib/env.ts` parses `process.env` with zod at startup |

Schemas live in the domain `types/` (or global `types/` once shared), and the types come from them (`type Crab = z.infer<typeof crabSchema>`). Don't hand-write a duplicate interface.

## 7. State Ownership

| State | Owner |
|---|---|
| Server data (anything from FastAPI) | TanStack Query cache **only** |
| Access token + refresh token | **httpOnly cookies only**, set and read by the BFF (server). Never in zustand, `localStorage`, `sessionStorage` or JS-readable cookies. |
| Signed-in user profile (`name`, `email`, `role`, `needs_onboarding`) | zustand `stores/auth-store.ts`, filled from the sign-in / `GET /users/me` result. Display only. |
| URL-worthy UI state (filters, page, tab, date range) | URL search params |
| Form state | `react-hook-form` |
| Cross-component UI-only state (sidebar, assistant open, live-chart paused, current `thread_id`) | zustand store in `stores/` (or a domain store if it's used once) |
| Local UI state | `useState` |

- **zustand is the only client store.** Redux / redux-persist are removed.
- zustand never holds tokens, passwords, PINs or FastAPI list/detail data (that's TanStack Query's job).
- Use `persist` only for harmless preferences (sidebar collapsed, theme). The auth profile store isn't persisted; it's re-filled from `/users/me` on load.

## 8. Rendering Rules

- Server Components by default. Add `"use client"` only on leaves that need state, effects, browser APIs, TanStack Query hooks or event handlers.
- Anything that touches cookies or `API_URL` imports `"server-only"`.
- Each portal domain has `loading.tsx` (skeleton) and `error.tsx` where it needs them. The root has `not-found.tsx`.

## 9. Mapping to the API

| Web domain | FastAPI resources |
|---|---|
| `(auth)`, `team-onboarding` | `/auth/*` |
| `dashboard` | `/sensors`, `/sensors/stream`, `/forecasts`, `/forecasts/stream` |
| `logs` | `/logs`, `/crabs`, `/batches`, `/sensors/{id}/readings` |
| `feeding` | `/devices`, `/devices/{id}/commands`, `/devices/stream` (schedules: API resource to add) |
| `qr-stickers` | `/crabs`, `/batches` |
| `scan` | `/qr/scan`, `/cameras`, `/cameras/{id}/start\|stop`, `/detections/stream`, `POST /crabs/{id}/logs` |
| `assistant` | `/assistant/chat` |
| `users` | `/users` |
| `activity` | audit endpoints |
| `profile` | `/users/me`, `/auth/change-password`, `/auth/change-pin` |

## 10. Checklist: Adding a Portal Domain

1. Create `app/(protected)/(portal)/<domain>/` with `page.tsx` and the folders `components/`, `lib/`, `actions/`, `events/`, `types/`.
2. Write zod schemas in `types/` first, then infer the types.
3. Reads: query options in `lib/`. Writes: Server Actions in `actions/`. Live: hooks in `events/`.
4. Build it from its row in `03-design-systems.md` §13 (shadcn parts, `custom-` components, lucide icons), then run the §18 review checklist.
5. Add it to the sidebar nav and to the mapping in §9.
6. Anything a second domain needs gets promoted to the global folder.
