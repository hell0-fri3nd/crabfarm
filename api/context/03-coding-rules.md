# 03 — Coding Rules

How backend code is written. Layering is in `01-architecture.md`, and the HTTP contract is in `02-api-design.md`.
**The reference code is `app/authentication/users/`.** When in doubt, copy its style.

---

## 1. Principles

- **The code explains itself.** Names, types and small functions carry the meaning. If you need a paragraph to explain a block, rename or extract it instead.
- **Pythonic first.** Use the language features and syntactic sugar Python gives you (§5) rather than hand-written loops, flags and boilerplate.
- **Class-based layers.** Schemas, services and dependencies are classes (§3).
- **File-based by default.** Split a file only when it grows (§2).
- **Type hints everywhere.** Every parameter and return type is annotated. Python ≥ 3.12 syntax: `X | None`, `list[str]`, `type` aliases, PEP 695 generics.

## 2. Feature Folder (default shape)

Every new feature follows `authentication/users`:

```
<domain>/
├── __init__.py          # from .api import ROUTERS
├── api.py               # ROUTERS = [<resource>_router, ...]
└── <resource>/
    ├── __init__.py      # public surface: router, services, schemas, dependencies (__all__)
    ├── router.py        # endpoints
    ├── schemas.py       # Pydantic classes
    ├── services.py      # service classes
    ├── dependencies.py  # dependency classes
    └── models.py        # SQLModel tables
```

- **Always start as files.** `router.py`, not `router/`.
- **Split when it grows.** Once a file is over ~300 lines or holds more than one entity or concern, turn it into a folder of the same name, one file per concern, with an `__init__.py` that re-exports the same names. For example, `users/router/` → `auth.py` + `users.py`, and `users/services/` → `auth_services.py` + `password_services.py`. Imports elsewhere stay the same.
- **`__pycache__` is never committed.** Every `__pycache__/` folder and `*.pyc` file is ignored by git. Prefer one global rule in `.gitignore` (`__pycache__/`, `*.py[cod]`) over listing each package path, so new packages are covered automatically.

## 3. Class-Based Layers

### Schemas: Pydantic classes

```python
class CreateBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    code: str = Field(min_length=3, max_length=30)
    pond_id: UUID
    stocked_at: date
    count: int = Field(gt=0)


class BatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    stocked_at: date
```

### Services: one class per entity, collaborators injected

```python
class BatchServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices()

    def get(self, batch_id: UUID) -> Response[BatchRead]: ...
    def list(self, query: ListBatchesQuery) -> Response[Page[BatchRead]]: ...
    def create(self, payload: CreateBatchRequest, actor: Users) -> Response[BatchRead]: ...
    def update(self, batch_id: UUID, payload: UpdateBatchRequest, actor: Users) -> Response[BatchRead]: ...
    def delete(self, batch_id: UUID, actor: Users) -> Response[None]: ...
```

- Methods are verbs: `get`, `list`, `create`, `update`, `delete`, plus domain verbs (`sign_in`, `send_command`, `request_forecast`).
- Return the `Response` envelope with an `UPPER_SNAKE` `code` (see 02 §4). The router maps codes to HTTP status.
- Services never import `fastapi` routing or HTTP objects (`Request` only for audit metadata, as `AuthServices` does).

### Dependencies: classes with `__call__`

Configure the class in `__init__`, resolve in `__call__`, and export a ready instance with a snake_case name, as `TokenAuth` and `RequirePermissions` do:

```python
class LoadBatch:
    """Resolves {batch_id} to a Batches row or raises 404."""

    def __call__(self, batch_id: UUID, db: DbSession) -> Batches:
        if batch := db.get(Batches, batch_id):
            return batch
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Batch not found")


get_batch = LoadBatch()
```

Provide service instances to routers through one generic provider in `core`, so routers never construct services by hand:

```python
class Provide[T]:
    def __init__(self, service_cls: type[T]):
        self.service_cls = service_cls

    def __call__(self, db: DbSession) -> T:
        return self.service_cls(db)


type BatchServicesDep = Annotated[BatchServices, Depends(Provide(BatchServices))]
```

## 4. Naming Conventions (PEP 8 + project suffixes)

| Thing | Style | Example |
|---|---|---|
| Package / module | `snake_case` | `crab_management`, `auth_services.py` |
| Class | `PascalCase` | `TokenAuth`, `JwtManager` |
| Function / method / variable | `snake_case`, functions start with a verb | `verify_password`, `build_features` |
| Constant | `UPPER_SNAKE` at module level | `AUDIT_ACTION_KEY`, `FORECAST_HORIZON_DAYS` |
| Enum | `PascalCase` class, `UPPER_SNAKE` members, `(str, Enum)` | `Role.ADMIN`, `Permission.BATCH_CREATE` |
| Private | leading underscore | `_hasher`, `_reject()` |
| Boolean | `is_` / `has_` / `can_` prefix | `is_active`, `has_permission` |
| Dependency instance | `snake_case` noun or `get_` | `get_current_user`, `require_permissions` |
| `Annotated` dependency alias | `PascalCase` + `Dep` or a plain noun | `DbSession`, `CurrentUser`, `BatchServicesDep` |

**Project class suffixes**

| Layer | Suffix | Example |
|---|---|---|
| SQLModel table | plural noun = table name | `Users`, `Batches`, `Crabs`, `Logs` |
| Request body | `*Request` | `CreateBatchRequest`, `SignInRequest` |
| Query params | `*Query` | `ListLogsQuery` |
| Read model | `*Read` | `UserRead`, `BatchRead` |
| Envelope / error | `*Response` | `Response`, `AuthResponse`, `ErrorResponse` |
| Broker / SSE payload | `*Event` | `SensorReadingEvent`, `ForecastCompletedEvent` |
| Service | `*Services` | `AuthServices`, `BatchServices` |
| Infrastructure client | `*Client` / `*Manager` | `RabbitClient`, `JwtManager` |

Files inside a split folder are named after their concern: `auth_schemas.py`, `user_services.py`.

## 5. Pythonic Code & Syntactic Sugar

Prefer the right-hand column.

| Instead of | Write |
|---|---|
| a loop that builds a list | a comprehension: `[p.value for p in permissions if not has_permission(role, p)]` |
| assign, then test | walrus: `if user := db.get(Users, user_id):` |
| long `if/elif` on a value | `match result.code:` with `case` arms |
| nested `if`s | guard clauses + early `return` / `raise` |
| a loop that sets a flag | `any(...)` / `all(...)` |
| `"%s" % x` / `.format()` | f-strings |
| `x[0], x[1]` | unpacking: `first, *rest = readings` |
| repeated `Depends(...)` in every signature | `Annotated` aliases: `DbSession`, `CurrentUser` |
| getter methods | `@property`; expensive and fixed → `@cached_property` |
| alternative constructors in `__init__` | `@classmethod`: `ForecastRun.queued(batch_id)` |
| a dict for an internal value object | `@dataclass(slots=True, frozen=True)` |
| reloading settings or models | `@functools.cache` on the loader (`get_settings()`, `load_yolo()`) |
| manual open/close, try/finally | `with` / `async with` context managers |
| chunking by index | `itertools.batched(readings, 500)` |
| checking before acting (LBYL) | EAFP: `try` / `except SpecificError` |
| `Optional[X]`, `List[X]`, `TypeVar` boilerplate | `X \| None`, `list[X]`, `class Page[T]`, `type Alias = ...` |
| string literals for fixed choices | `Enum` / `Literal` |

Router mapping, written with `match` and aliases:

```python
@router.post("", response_model=Response[BatchRead], status_code=status.HTTP_201_CREATED, ...)
def create_batch(payload: CreateBatchRequest, user: CanCreateBatch, services: BatchServicesDep):
    result = services.create(payload, actor=user)

    match result.code:
        case "BATCH_CODE_EXISTS":
            raise FieldException(status.HTTP_409_CONFLICT, "code", result.message, "batch_code_exists")
        case "BATCH_CREATE_FAILED":
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.message)

    return result
```

Don't be clever for its own sake. If a one-liner needs a second read, use two lines.

## 6. Dunder Methods (use where they fit)

| Dunder | Use it for | Example |
|---|---|---|
| `__init__` | Inject collaborators and config. No I/O. | `AuthServices(db, password_services, jwt_manager)` |
| `__call__` | Dependency classes (FastAPI calls the instance) | `TokenAuth("access")`, `RequirePermissions(...)` |
| `__repr__` | Debug/log view of models and value objects. **Never include secrets** (hashes, tokens, pins). | `Users(id=…, email='a@b.c', role=STAFF)` |
| `__str__` | A human-readable label when one is natural | `str(batch) → "B-2026-012"` |
| `__bool__` | Truthiness that reads well | `Response.__bool__ → self.success`, so `if not result:` |
| `__len__`, `__iter__`, `__contains__`, `__getitem__` | Collection-like objects | `Page`, `SensorWindow`, a node registry `NODES["farming_qa"]` |
| `__eq__`, `__hash__` | Value objects compared by value (prefer `@dataclass(frozen=True)`, which generates them) | `Reading(sensor, at)` |
| `__enter__`/`__exit__`, `__aenter__`/`__aexit__` | Owning a resource | `async with RabbitClient(url) as broker:` |
| `__all__` | The public names of every package `__init__.py` | `__all__ = ["user_router", "get_current_user"]` |

Don't overload arithmetic or comparison operators on things that aren't values (services, routers, dependencies).

## 7. Comments & Docstrings

- **No comment blocks.** No banners, section dividers or line-by-line narration, and no commented-out code (git keeps the history).
- **Comment *why*, never *what*.** One line, only when the reason isn't obvious from the code. Good examples from the repo:
  - `# Role is read from the DB, not the token, so role changes apply immediately`
  - `# session_hash is only ever an access token; a rejected refresh token is not hashed`
- **Docstrings:** one line on public classes and on functions whose purpose the name can't carry (`"""Resolves the user from a Bearer JWT of the given type."""`). Don't write parameter-by-parameter docstrings; type hints already document them.
- A `TODO` needs an owner or ticket: `# TODO(art): …`.

## 8. Imports

- Order: standard library → third-party → `app.*` → relative (`.` / `..`), with one blank line between groups.
- Inside a resource, use relative imports (`from .models import Users`). Across resources or domains, import the package's public surface (`from app.crab_management.crab import CrabServices`). See 01 §6.
- No wildcard imports. No imports inside functions, except to break a real cycle, and then fix the cycle.

## 9. Errors & Logging

- Catch **specific** exceptions. A bare `except:` is never allowed. `except Exception` is allowed only at a service boundary, where it logs with `logger.exception(...)` and returns a `*_FAILED` code.
- `logger = logging.getLogger(__name__)` per module. No `print`.
- Never log secrets: passwords, pins, tokens, the DeepInfra key.
- Raise HTTP errors only from routers and dependencies. Services return codes.

## 10. Quick Checklist

- [ ] Feature has `__init__.py`, `router.py`, `schemas.py`, `services.py`, `dependencies.py`, `models.py`, and its domain `api.py` includes the router.
- [ ] Schemas, services and dependencies are classes. Dependencies use `__call__`.
- [ ] Names follow §4. The code reads without comments.
- [ ] Sugar from §5 is used where it makes the code clearer.
- [ ] `__all__` is set in every `__init__.py`, and `__repr__` hides secrets.
- [ ] Every input and output is validated by Pydantic (02 §5).
- [ ] No `__pycache__` in the diff.
