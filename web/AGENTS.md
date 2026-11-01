# AGENTS.md — web/

Rules for the Crabfarm frontend. Repo-wide rules (API contract with `api/`, commits, verification) are in [../AGENTS.md](../AGENTS.md).

## Stack

React 19 + React Router 7 in framework mode with SSR on, Vite 7, TypeScript (strict), Tailwind CSS 4, shadcn/ui (Radix), Redux Toolkit + redux-persist, TanStack Query, react-hook-form + zod, Axios, Recharts, assistant-ui (AI chat), sonner toasts.

## Commands

Run from `web/`.

```bash
npm install
npm run dev                 # http://localhost:7987, bound to all interfaces (--host)
npm run typecheck           # react-router typegen && tsc (the only static check)
npm run build && npm start  # production server on 0.0.0.0:7987
docker compose up --build   # container on 7987, reads web/.env
```

There are no tests or linters. Run `npm run typecheck` before finishing any change, and don't leave new type errors behind.

## Configuration (`web/.env`, git-ignored)

| Key | Used for |
|-----|----------|
| `VITE_API_URL` | Main backend base URL (both axios instances) |
| `VITE_API_RASPBERRY_URL` | Raspberry Pi device API (`raspberry_api` in `app/store/api.ts`) |
| `VITE_SOCKET_URL` | Realtime socket endpoint |

## Context docs

| Doc | Read before |
|-----|-------------|
| `context/01-schema.md` | Adding or changing types in `app/types/` or the API payloads they mirror |
| `context/02-architecture.md` | New routes, state, or data-flow changes. `ARCHITECTURE.md` also documents the store shape and provider tree |
| `context/03-coding-rules.md` | Any code change; it extends the rules below and wins on conflict |
| `context/04-design-systems.md` | Any UI or styling work |

## Architecture

- **Routing:** routes are declared explicitly in `app/routes.ts`; folder names don't create routes. Layout routes gate access: `page-layout.tsx` (`/page/*`) and `settings-layout.tsx` (`/settings/*`) wrap children in `ProtectedRoutes`, and `pin-layout.tsx` (`/access-token`) uses `PinRoute`. The guards live in `app/components/layout/protected-routes.tsx`. Route modules import generated types from `./+types/<route>`.
- **Provider tree (`app/root.tsx`):** Redux `Provider` → `PersistGate` → `QueryClientProvider` → `TooltipProvider` → `ThemeProvider` (default dark) → `AuthProvider` → page.
- **Auth:** cookie-based (`withCredentials: true`). `AuthProvider` polls `GET auth/status` (RTK Query `statusApi`). `detail: "MISSING_ACCESS_TOKEN"` sends the user to PIN re-auth at `/access-token`; `"MISSING_REFRESH_TOKEN"` logs out fully and calls `persistor.purge()`.
- **⚠ Inverted auth flags:** in `app/store/auth/auth-slice.ts`, `accessExpired`/`refreshExpired` actually mean "this token is valid". Login sets both to `true`, and the `accessExpired()` reducer sets `accessExpired=false, refreshExpired=true`. Read `auth-slice.ts` and `protected-routes.tsx` together before touching auth, and don't "fix" the names in only one place.
- **State split:**
  - Redux (`app/store/`) holds `auth` (the only persisted slice), `camera`, `crab`, `chat`, and `statusApi`.
  - TanStack Query holds all other server data: logs, scheduler, predictions, controls, crabs.
- **HTTP:** two axios instances with the same config. `app/api/api.ts` is used by `app/api/*.ts`; `app/store/api.ts` is used by slices and also exports `raspberry_api` and `axiosBaseQuery`.

## Coding rules

These describe the patterns already in the code; follow them unless `context/03-coding-rules.md` says otherwise.

**Files and imports**
- Use kebab-case file names (`scan-crab-width.tsx`, `auth-slice.ts`).
- Import through the `~/` alias (`~/components/...`, `~/types/...`) rather than long relative paths.
- `verbatimModuleSyntax` is on, so type-only imports must use `import type { ... }`, or tsc fails.

**Server data (default for anything from the backend)**
1. Add an async function in `app/api/<domain>.ts` using `api` from `./api`. Return `response.data.data` (or `.detail` where the endpoint uses that), and on error `throw err.response?.data.detail`.
2. Put request/response types in `app/types/<domain>.ts`.
3. Call it from components with `useQuery` / `useMutation`. Reuse existing query keys (`['batches']`, `['crabLogs', ...]`, `['camera-status']`) and invalidate them after mutations with `queryClient.invalidateQueries`.
4. `queryClient` defaults are `retry: false` and `refetchOnWindowFocus: false`, because auth errors are handled by `AuthProvider`. Don't add retries for 401s.

**Redux**
- Use Redux only for session or device state that must be shared app-wide (the existing slices). Don't put new server data in Redux; use TanStack Query.
- Add new persisted state only by extending the `whitelist` in `store.ts` deliberately; everything else stays out of storage.

**Routes**
- Add pages under `app/routes/page/` or `app/routes/settings/` and register them in `app/routes.ts` inside the matching layout, so they inherit the auth guard and `AppLayout`.

**UI**
- Use the shadcn primitives in `app/components/ui/` (style `new-york`, base color `neutral`, CSS variables). Add new ones with `npx shadcn@latest add <name>` instead of hand-writing them; assistant-ui components come from the `@assistant-ui` registry in `components.json`.
- Merge class names with `cn()` from `~/lib/utils`. Use icons from `lucide-react` and notifications via `toast` from `sonner`.
- Build forms with react-hook-form + zod (`@hookform/resolvers`) and the `ui/form.tsx` components.
- Theme tokens live as CSS variables in `app/app.css`. Use Tailwind token classes (`bg-background`, `text-muted-foreground`) rather than hard-coded colors, so dark mode (the default) keeps working.

**SSR**
- SSR is on (`react-router.config.ts`), so code at module scope or during render also runs on the server. Guard `window`, `localStorage`, `navigator`, and camera APIs (see `app/store/web-storage.ts`), or run them inside `useEffect`.

**Backend contract**
- This app still calls the v1 API. It will be refactored onto the v2 API (`api/`) once the backend is built (see root AGENTS.md); until then, don't migrate pages to v2 piecemeal unless asked. During that refactor, change each `app/api/*` function and its type together instead of adapting responses inside components.

## Leftovers to ignore

`app/welcome/` (React Router starter) is unused. In `app/types/index.d.ts`, the `ziggy-js` import and `SharedData.ziggy` are Laravel-template leftovers (`ziggy-js` isn't installed; `skipLibCheck` hides the error). Don't build on them.
