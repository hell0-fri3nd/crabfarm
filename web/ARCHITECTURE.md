# Crabfarm Frontend Architecture

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + React Router 7 |
| UI | shadcn/ui (Radix primitives + Tailwind CSS 4) |
| State (client) | Redux Toolkit + redux-persist |
| Server state | TanStack React Query |
| Forms | react-hook-form + zod |
| HTTP | Axios |

---

## Folder Structure

```
app/
├── api/                      # Axios instances & RTK Query base query
│   ├── api.ts                # Axios client (VITE_API_URL), raspberry_api, axiosBaseQuery
│   ├── control.ts
│   ├── crab.ts
│   ├── logs.ts
│   ├── predict.ts
│   └── scheduler.ts
├── assets/
│   ├── images/
│   └── json/
├── components/
│   ├── ui/                   # shadcn/ui primitives (button, dialog, form, etc.)
│   ├── modal/                # Schedule modal
│   └── (feature components)  # app-shell, sidebar, sensor-card, etc.
├── hooks/                    # use-mobile, use-initials, use-appearance, etc.
├── lib/
│   └── utils.ts              # cn() helper
├── routes/                   # Page components (file-based routing)
│   ├── auth/                 # login.tsx, pin.tsx
│   ├── page/                 # dashboard, logs, configuration, etc.
│   ├── auth-layout.tsx
│   ├── page-layout.tsx
│   └── pin-layout.tsx
├── store/
│   ├── store.ts              # configureStore + persist config
│   ├── web-storage.ts        # localStorage adapter (noop for SSR)
│   ├── api.ts                # Axios instance (aliased here too)
│   ├── camera-slice.ts       # Camera status/start thunks
│   ├── crab-slice.ts         # Crab groups & logs thunks
│   └── auth/
│       ├── auth-slice.ts         # login, pin, logout thunks
│       └── auth-status-slice.ts  # RTK Query statusApi
├── types/                    # Shared TS types
│   ├── crab.ts
│   ├── control.ts
│   ├── scheduler.ts
│   ├── sensor-logs.ts
│   └── index.d.ts
├── root.tsx                  # Provider tree + AuthProvider wrapper
├── routes.ts                 # Route definitions
├── app.css                   # Global styles
└── query-client.ts           # TanStack Query client
```

---

## Redux Store Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Redux Store                        │
│             (configureStore + persist)               │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  rootReducer (combineReducers)               │   │
│  │                                              │   │
│  │  ┌───────────┐   ┌───────────┐              │   │
│  │  │   auth    │   │  camera   │              │   │
│  │  │ (persist) │   │           │              │   │
│  │  │           │   │ data      │  ┌────────┐  │   │
│  │  │ user      │   │ loading   │  │  crab  │  │   │
│  │  │ status    │   │ error     │  │        │  │   │
│  │  │ error     │   │ status    │  │ groups  │  │   │
│  │  │ isAuth    │   └───────────┘  │ loading │  │   │
│  │  │ accessExp │                  │ error   │  │   │
│  │  │ refreshExp│                  └────────┘  │   │
│  │  └───────────┘                              │   │
│  │                                              │   │
│  │  ┌──────────────────────────────────────┐    │   │
│  │  │  statusApi  (RTK Query - auto cache) │    │   │
│  │  │  └─ getStatus  → GET /auth/status    │    │   │
│  │  └──────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  persist config: { key: 'root', whitelist: ['auth'] }│
│  → Only auth slice is saved to localStorage         │
└─────────────────────────────────────────────────────┘
```

### Slice Details

#### `auth` (persisted)
| Field | Type | Description |
|-------|------|-------------|
| `isAuthenticated` | `boolean` | Logged in status |
| `user` | `{ user, email, roles, message }` | Logged-in user |
| `status` | `'idle' \| 'loading' \| 'succeeded' \| 'failed'` | Async status |
| `error` | `string \| null` | Error message |
| `accessExpired` | `boolean` | Access token expired flag |
| `refreshExpired` | `boolean` | Refresh token expired flag |

#### `camera` (not persisted)
| Field | Type | Description |
|-------|------|-------------|
| `data` | `{ camera_status, camera_url, extracted_data, height_cm, width_cm }` | Camera status |
| `loading` | `'idle' \| 'pending' \| 'succeeded' \| 'failed'` | Async status |
| `error` | `string \| null` | Error message |
| `status` | `string \| null` | Start response status |

#### `crab` (not persisted)
| Field | Type | Description |
|-------|------|-------------|
| `groups` | `CrabGroupDetails[]` | Crab groups list |
| `loading` | `'idle' \| 'pending' \| 'succeeded' \| 'failed'` | Async status |
| `error` | `string \| null` | Error message |

#### `statusApi` (RTK Query, auto-managed)
- Endpoint: `getStatus` → `GET /auth/status`
- Used in `AuthProvider` to detect missing/expired tokens on app load

---

## Provider Hierarchy (`root.tsx`)

```
<Provider store={store}>              ← Redux
  <PersistGate persistor={persistor}> ← waits for rehydrate
    <QueryClientProvider>            ← TanStack React Query
      <ThemeProvider>                ← next-themes (dark mode)
        <AuthProvider>               ← statusApi check + token expiry dispatch
          <Bubbles />                ← background animation
          <Toaster />                ← sonner toasts
          <Outlet />                 ← React Router pages
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </PersistGate>
</Provider>
```

---

## Data Flow

```
User Action
  │
  ├──→ Dispatch createAsyncThunk (login, crab, camera)
  │       │
  │       └──→ Axios API call → update Redux slice
  │
  └──→ RTK Query hook (useGetStatusQuery)
          │
          └──→ Auto-fetches on mount/focus/reconnect
                → dispatches accessExpired / logout on error

Server state (TanStack Query) handles:
  → Logs, scheduler CRUD, predictions, control commands
  → Separate from Redux (no reducers needed for these)
```
