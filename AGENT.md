# AGENT.md — Crabfarm

Instructions for every coding agent working in this repository. Claude Code loads this file through `CLAUDE.md`.

---

## 0. First Thing in Every New Chat: Read the Context (mandatory)

Before you answer a code question, plan, or edit anything, **read the context docs for the area you'll touch**:

| The task touches | Read, in order |
|---|---|
| Anything (always) | `context/*.md` (project-wide) |
| Backend: `api/**`, the database, RabbitMQ, the worker, AI, ML | **every file in `api/context/`** |
| Frontend: `web/**`, UI, BFF, auth cookies | **every file in `web/context/`** |
| Both, an API contract, or you're unsure | **both** `api/context/` and `web/context/` |

Rules:
1. **Read before acting.** Read the whole files, in number order (`01-`, `02-`, …). Don't skim one section and guess the rest.
2. **Only what's configured.** If a context folder or file doesn't exist or is **empty**, it isn't configured yet. Skip it and say so in one line ("`context/01-project-overview.md` is empty, skipped").
3. **Context wins.** When code and context disagree, the context is the intended design. Follow it, and point out the mismatch instead of copying the old pattern.
4. **Keep context current.** If the user changes a decision, update the matching context file in the same change. A schema change also updates `api/context/04-schema.md` **and** `api/context/schema.dbml`.
5. **Say what you read.** Start your first reply with one line naming the context files you read (e.g. "Read: api/context 01–04").

### Context index

| File | What it decides |
|---|---|
| `context/01-project-overview.md` | Product overview (not configured yet) |
| `api/context/01-architecture.md` | Modular monolith, domains/resources, layer rules, RabbitMQ/MQTT topology, SSE, worker (YOLOv8, forecasts), LangGraph assistant (DeepInfra, in-memory, no history) |
| `api/context/02-api-design.md` | REST resources, methods, status codes, `{success, message, code, details}` envelope, error shape, Pydantic validation, endpoint catalog |
| `api/context/03-coding-rules.md` | Python style: file-first layers, class-based schemas/services/dependencies, naming, Pythonic sugar, dunders, comments |
| `api/context/04-schema.md` + `schema.dbml` | Postgres schema-per-module, SQL naming, normalization, **no cross-module FKs**, known drift, migration rules |
| `web/context/01-architecture.md` | Next.js App Router + BFF, httpOnly-cookie tokens, `(auth)` / `(protected)/team-onboarding` / `(protected)/(portal)` domains, layered domain folders, data flow, zod, zustand |
| `web/context/02-coding-rules.md` | Arrow functions assigned to `const`, naming, `custom-<name>.tsx`, ESLint config, idiomatic TypeScript, the Next.js Way |
| `web/context/03-design-systems.md` | Design tokens, typography, components per page, icons, feedback patterns, UX laws, WCAG 2.2 AA, review checklist |

## 1. Repository

```
crabfarm/
├── AGENT.md / CLAUDE.md     # agent instructions (this file)
├── context/                 # project-wide context
├── docs/ui/components/      # UI design source (component library, plan, navigation)
├── docs/ui/{desktop,tablet,phone}/  # page mockups per screen size
├── docker-compose.yml       # PostgreSQL 16 + RabbitMQ 4 (management)
├── api/                     # FastAPI backend + worker (Python ≥ 3.12, Poetry)
│   ├── app/                 # domains: authentication, crab_management, (monitoring, vision, assistant planned)
│   ├── migrations/          # Alembic
│   └── context/             # backend context docs
└── web/                     # Next.js frontend + BFF (being rewritten; old React Router app removed)
    └── context/             # frontend context docs
```

| Area | Status |
|---|---|
| `api/` | Active. Auth (sign-in, PIN, change password/PIN) and audit are built; crab management is being restructured. |
| `web/` | **Rewrite to Next.js.** Only `web/context/` exists. Start the new app from those rules. |

## 2. Commands

```bash
# infrastructure (repo root, needs .env with DB_* and RABBITMQ_*)
docker compose up -d

# backend (from api/)
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
poetry run alembic revision --autogenerate -m "<verb> <what>"   # then review the file (api/context/04 §7)
```

Frontend commands will be added here once the Next.js app is scaffolded (lint + typecheck must pass, see `web/context/02-coding-rules.md` §4).

## 3. Non-Negotiables (summary; the context files have the details)

**Backend**
- Every resource follows the standard anatomy: `__init__.py`, `router`, `schemas`, `services`, `dependencies`, `models`, plus the domain's `api.py`. Start with files and split into folders when they grow.
- Every endpoint input and output is validated by Pydantic v2. Success responses use the envelope, and errors use `{detail, errors[]}`.
- The DB is sync, so CRUD endpoints are plain `def`. Never use a sync `Session` inside `async def`.
- One Postgres schema per module, and **no foreign keys between modules**.

**Frontend**
- The browser only talks to the Next.js BFF. Access and refresh tokens live **only in httpOnly cookies**.
- Use the shadcn ecosystem, lucide, TanStack Query, Recharts, zod and zustand (UI state only). No Redux and no Axios.
- Write arrow functions assigned to `const`, and name custom component files `custom-<name>.tsx`.

**Both**
- The code explains itself. No comment blocks; comment only a non-obvious *why*.

## 4. How to Work

- **Clarify first.** When a request is ambiguous or changes architecture, ask focused questions (one decision at a time) before writing code. Recommend an option instead of listing every one.
- **Follow existing patterns.** `api/app/authentication/users/` is the reference implementation for the backend.
- **Verify before claiming done.** Run what exists (tests, typecheck, lint, the app) and report real results. If something wasn't run, say so.
- **Commits** only when asked. Use Conventional Commits with a scope, as in the history: `feat(api): add change-pin endpoint`, `refactor(api): …`, `chore: …`. One logical change per commit.
- **Don't touch** unrelated files, migrations that have already been applied, or `.env` files.
