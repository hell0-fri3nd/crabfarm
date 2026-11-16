# ADR-0002: Read the current user from the access token instead of the database

**Status:** Accepted
**Date:** 2026-11-16
**Deciders:** API maintainers
**Supersedes:** part of [ADR-0001](0001-auth-guards-in-core.md) (the `TokenAuth.bind(Users)` step)

## Context

ADR-0001 moved the guards into `app.core`. Because the guard loads the user row on every request, core still needs to know the `Users` model, so `authentication` calls `TokenAuth.bind(Users)` at import time. That leaves two things we'd rather not have: global state set by an import side effect, and a hidden dependency of every protected request on `app.authentication` having been imported.

The question is whether core can own a `CurrentUser` schema and fill it from the access token alone.

What the tokens carry today (`auth_services.py`, sign-in and PIN):

| Claim | Access | Refresh |
|---|---|---|
| `sub` (user id) | yes | yes |
| `role` | yes | yes |
| `type` | `access` | `refresh` |
| `exp` | 15 min | days (longer with remember-me) |
| `email` | no | no |

The forces:

- **A schema alone doesn't remove `bind`.** A Pydantic `CurrentUser(id, email, role)` in core only describes the shape. The values still come from either the database (which needs the model) or the token (which needs no model). Dropping `bind` is only possible if the token becomes the source.
- **Freshness.** The current rule (01-architecture, auth section) says the role is read from the database so that demotion and deactivation apply on the next request. Tokens are stateless, and nothing can revoke them.
- **Cost of the lookup.** It's one primary-key `db.get` per request, under a millisecond on a local Postgres, at farm scale. Performance is not the driver here; coupling and freshness are.

## Decision

Split the two token types by who needs fresh data:

```
                 ┌───────────────── app.core ─────────────────┐
access token ──▶ │ AccessAuth: decode JWT ─▶ CurrentUser       │ ──▶ require_roles ──▶ every domain
(every request)  │ (id, email, role) from claims, no DB        │     (AnyRole, DeveloperOrAdmin, …)
                 └─────────────────────────────────────────────┘

                 ┌──────────── app.authentication ────────────┐
refresh token ─▶ │ TokenAuth("refresh", Users): DB lookup       │ ──▶ checks is_active and the current role,
(every ≤15 min)  │ rejects inactive users                       │     issues a new access token
                 └─────────────────────────────────────────────┘
```

1. Core defines `AuthUser` (Pydantic, frozen: `id: UUID`, `role: Role`, `email: str | None`). `TokenAuth(token_type)` verifies the signature, `exp` and `type`, and builds `AuthUser` from the claims, or answers `401 INVALID_TOKEN_CLAIMS`. `CurrentUser` and the role aliases are typed `AuthUser`. There's no database read and no `bind`.
2. Access tokens gain an `email` claim, so audit keeps naming the actor.
3. `authentication.users` has `load_user(token)`, which loads the row, refuses missing or deactivated users (audited through core's `TokenAuth.reject`), and stores the row in `request.state.user`. It backs `get_refresh_user` (PIN and sign-out) and `AccountUser`.
4. Endpoints that change the user's own account (`/auth/me`, `update_me`, onboarding, change password or PIN) take `AccountUser`, so they get the full row and refuse a deactivated user immediately.

## Options Considered

### Option A: Core schema filled from the access token, database only on refresh (proposed)

| Dimension | Assessment |
|---|---|
| Complexity | Low: no binding; core is self-contained |
| Cost | Saves one query per request (minor) |
| Security | Demotion and deactivation take effect within ≤15 min (at the next refresh) |
| Coupling | None: core never touches `Users`, and nothing depends on import order |

**Pros:**
- Removes `bind` and the global state.
- The guards work anywhere (worker, scripts, SSE) without importing `authentication`.
- The stale window is bounded and small.

**Cons:**
- Reverses the documented "role from the DB" rule.
- A deactivated user keeps access for up to 15 minutes.
- The email sits readable in the JWT payload (signed, not encrypted).
- Auth endpoints need one extra explicit load.

### Option B: Keep `TokenAuth.bind(Users)`, database on every request (current, ADR-0001)

| Dimension | Assessment |
|---|---|
| Complexity | Low: one `bind` line |
| Cost | One primary-key lookup per request |
| Security | Demotion and deactivation take effect immediately |
| Coupling | Hidden: requests depend on `authentication` being imported, and the model is global state |

**Pros:** Instant revocation of role and access. The documented rule stays as it is.
**Cons:** Import-time side effect. Anything that uses the guards without `authentication` gets a `RuntimeError`.

### Option C: Token claims plus a revocation check

Like A, but core also checks a small deny-list (deactivated user ids, or a per-user `token_version`) on each request.

| Dimension | Assessment |
|---|---|
| Complexity | Medium: a new table or cache, and writes on deactivate and role change |
| Cost | One lookup per request again, unless it's cached |
| Security | Immediate, like B |
| Coupling | Core owns a small table of its own instead of reading `Users` |

**Pros:** Gets A's decoupling and B's instant revocation.
**Cons:** It's more moving parts than a farm app with 15-minute tokens needs today, and it brings back a per-request read.

## Trade-off Analysis

The decision comes down to one question: **is up to 15 minutes of stale role or access acceptable after a demotion or deactivation?**

- If yes, A is simpler and removes all of ADR-0001's coupling costs. The window is the access-token lifetime, which can be lowered (e.g. 5 min) at the cost of more refresh calls from the BFF.
- If no, B already delivers that for one line of binding. C is the path if decoupling ever matters more than its extra complexity.

The query cost isn't a reason to choose either way.

## Consequences

- **Easier:** Core has no knowledge of `Users`. The guards work in the worker and in tests without the authentication domain. Startup order doesn't matter.
- **Harder:**
  - Instant lock-out isn't possible. Stopping someone now means rotating `jwt_secret_key`, which signs everyone out.
  - Auth endpoints must load the row explicitly.
- **Changes needed:**
  - Add `email` to the access-token claims. Tokens issued before the change lack it, so either tolerate a missing claim for one token lifetime or accept a forced re-sign-in.
  - Update `api/context/01-architecture.md` (the "role is read from the DB row" rule) and `03-coding-rules.md`.
- **Revisit:** If an admin needs an instant kill switch, move to Option C.

## Action Items

1. [x] Accept the ≤15 min window (Option A), decided 2026-11-16.
2. [x] Add `AuthUser` to `app.core`; make `TokenAuth` token-only; remove `TokenAuth.bind`.
3. [x] Add `load_user(token)` in `authentication.users` for `get_refresh_user` and `AccountUser`.
4. [x] Add the `email` claim to access tokens at sign-in and PIN. Access tokens issued before this have no `email` (`AuthUser.email` is `None` for at most one token lifetime).
5. [x] Update the context docs and mark ADR-0001's binding step as superseded.
6. [ ] Add request tests: 401 without a token, 403 for the wrong role, and refresh refused for a deactivated user.
