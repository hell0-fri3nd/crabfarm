# ADR-0001: Auth guards live in core, with the user model bound at startup

**Status:** Accepted, binding step superseded by [ADR-0002](0002-current-user-from-access-token.md)
**Date:** 2026-11-16
**Deciders:** API maintainers

## Context

Every protected endpoint needs two checks: the access token is valid (`get_current_user`), and the caller's role is allowed (`require_roles`, through the aliases `AnyRole`, `DeveloperOrAdmin` and `DeveloperOnly`).

Until now the guard classes lived in `app.core`, but `app.authentication.users` built the ready-to-use aliases, because only it owns the `Users` model. So every domain (`crab_management`, `system`, and the planned `monitoring`, `vision` and `assistant`) imported from `app.authentication.users`. Every feature domain therefore depended on one specific domain, which goes against the layer rule that domains depend only on `core` and `infrastructure`.

Two constraints shape the fix:

1. **Core never imports a domain** (`api/context/01-architecture.md`, layer rules).
2. **The role and `is_active` come from the database row, not the token**, so a demotion or a deactivation takes effect on the next request. Access tokens are stateless JWTs that live 15 minutes (`jwt_access_token_expire_minutes`), and nothing can revoke them.

Constraint 2 means the guard must run `db.get(<user model>, user_id)`. Constraint 1 means core can't name that model.

## Decision

Move the guards and role aliases into `app.core.dependencies`, and have the authentication domain hand core its user model once at import time:

```python
# app/core/dependencies.py
class TokenAuth:
    model: ClassVar[type | None] = None

    @classmethod
    def bind(cls, model: type) -> None:
        cls.model = model

get_current_user = TokenAuth("access")
get_refresh_user = TokenAuth("refresh")
type AnyRole = Annotated[Actor, Depends(require_roles(*Role))]

# app/authentication/users/dependencies.py
TokenAuth.bind(Users)

# any domain
from app.core import AnyRole, DeveloperOrAdmin, get_current_user
```

The aliases are typed as the `Actor` protocol (`id`, `email`, `role`). If the model was never bound, the first request fails with a `RuntimeError` instead of falling back silently.

## Options Considered

### Option A: Core guards, model bound at startup (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low: one `bind` call, one class attribute |
| Cost | One primary-key lookup per request (unchanged from before) |
| Security | Role changes and deactivation apply immediately |
| Coupling | Domains depend only on `core`; core has no domain imports |

**Pros:** Removes the dependency on `authentication` from every other domain. Keeps the live role and active checks. There's one definition of each alias.
**Cons:** The binding is global state set by an import side effect. The `Actor` type is narrower than `Users`, so `authentication`'s own services, which take `Users`, may be flagged by a type checker.

### Option B: Trust the token's claims

Put `role` (and `email`) in the JWT, and have core build the `Actor` from the claims with no database lookup.

| Dimension | Assessment |
|---|---|
| Complexity | Low: no binding, no model |
| Cost | Saves one query per request |
| Security | A demoted or deactivated user keeps access for up to 15 minutes |
| Coupling | None |

**Pros:** It's the simplest, and core is fully self-contained.
**Cons:** It reverses the documented decision to read the role from the database. Without a revocation list, a deactivated account can't be stopped mid-token.

### Option C: Core queries the users table by name

Core runs a raw query against `authentication.users` without importing the model.

| Dimension | Assessment |
|---|---|
| Complexity | Medium: hand-written SQL that mirrors the model |
| Cost | Same as A |
| Security | Same as A |
| Coupling | Hidden: core knows another module's table layout |

**Pros:** No binding step.
**Cons:** It's the same coupling as before, only invisible to imports. A column rename breaks auth without an import error.

### Option D: Keep the aliases in `authentication.users` (status quo)

**Pros:** No change.
**Cons:** Every domain keeps depending on `authentication`, which goes against the layer rule this ADR exists to fix.

## Trade-off Analysis

The real choice is between A and B: live checks against the database versus self-contained tokens. With 15-minute access tokens and no revocation, B leaves a deactivated user active for up to 15 minutes, which is the reason the database read was chosen originally. A keeps that guarantee for the cost of one `bind` line and a small amount of global state, and the `RuntimeError` guard makes a missing binding loud. C buys nothing over A and hides the coupling, and D doesn't solve the problem.

## Consequences

- **Easier:** New domains import their guards from `app.core` only. There's one definition of each alias.
- **Harder:** The app depends on `app.authentication` being imported before the first request. `main.py` does this today through `AUTH_ROUTERS`. Scripts or the worker that use the guards without importing `authentication` would hit the `RuntimeError`.
- **Revisit:**
  - Typing in `authentication`: its routers receive `Actor` while its services expect `Users`. If a type checker is adopted, either widen the service signatures or add a `Users`-typed alias local to `authentication`.
  - If token revocation or a session table is ever added, Option B becomes viable and could remove the binding.

## Action Items

1. [x] Move `get_current_user`, `get_refresh_user`, `require_roles(*roles)` and the role aliases into `app.core`.
2. [x] Call `TokenAuth.bind(Users)` in `app/authentication/users/dependencies.py` and drop its duplicate aliases.
3. [x] Point `crab_management` and `system` at `app.core`.
4. [x] Update `api/context/01-architecture.md` and `03-coding-rules.md`.
5. [ ] Install `httpx2` and add request tests for 401 (no token), 403 (wrong role) and 401 (deactivated user).
6. [ ] Decide whether to add a type checker, and resolve the `Actor` vs `Users` typing if so.
