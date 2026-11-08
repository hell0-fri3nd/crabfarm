# 02 — API Design

The HTTP contract between `api/` and its clients (Next.js, scripts).
**The reference implementation is `app/authentication/users/router/auth.py`.** Every new endpoint follows the same pattern.
Architecture and layering rules are in `01-architecture.md`.

---

## 1. Base Rules

| Rule | Standard |
|---|---|
| Base path | `{settings.api_prefix}` (e.g. `/api/v1`), added in `main.py`. Routers never repeat it. |
| Versioning | Put the version in the prefix (`/v1`). A breaking change needs a new prefix, never a silent change. |
| Format | JSON in and out (`application/json`). Exceptions: image upload (`multipart/form-data`) and SSE (`text/event-stream`). |
| JSON field case | `snake_case` (Pydantic default) |
| IDs | UUID strings |
| Date/time | ISO 8601 in UTC with `Z` (`2026-11-08T03:15:00Z`). Plain dates are `YYYY-MM-DD`. |
| Units | In the field name: `width_mm`, `weight_g`, `temperature_c`, `salinity_ppt`, `do_mg_l`. |
| Auth | `Authorization: Bearer <access_token>`. SSE accepts a cookie or `?token=` (see 01 §8). |
| Correlation | Clients may send `X-Correlation-ID`, and the API echoes it back. |

## 2. Resource Naming

- **Resources are plural nouns in kebab-case:** `/batches`, `/crabs`, `/logs`, `/forecasts`, `/devices`, `/sensors`, `/cameras`.
- **No domain segment in the URL.** The domain is a code concern, so the URL is `/batches`, not `/crab-management/batches`. The resource router's `prefix` is the resource itself, matching `/auth` and `/users` today.
- **Nest at most one level**, and only when the child can't exist without the parent: `/crabs/{crab_id}/logs`. Cross-cutting queries use the top-level collection with filters: `/logs?batch_id=...`.
- **Path parameters** are named `{<resource>_id}`: `{batch_id}`, `{device_id}`.
- **Actions** (non-CRUD verbs) are allowed only when no resource fits. They are always `POST`, in kebab-case:
  - Auth flows: `/auth/sign-in`, `/auth/sign-in/pin`, `/auth/change-password`, `/auth/change-pin` (existing).
  - A state change on one resource: `POST /cameras/{camera_id}/start`, `POST /cameras/{camera_id}/stop`.
  - When something is created, prefer a sub-resource noun over a verb: `POST /devices/{device_id}/commands`, not `/devices/{id}/send-cmd`.

## 3. Methods

| Method | Use | Body | Success status |
|---|---|---|---|
| `GET` | Read one resource or a list | — | `200 OK` |
| `POST` | Create a resource | create schema | `201 Created` |
| `POST` | Start async work (command, forecast run, camera start/stop) | request schema | `202 Accepted` |
| `POST` | Action / RPC (sign-in, scan QR, chat) | request schema | `200 OK` |
| `PATCH` | Partial update (only sent fields change) | update schema, all fields optional | `200 OK` |
| `DELETE` | Delete (soft-delete where the model has `deleted_at`) | — | `200 OK` |

- `PUT` isn't used. Updates are always `PATCH`.
- `GET` never changes state. `DELETE` and `PATCH` are idempotent.
- `DELETE` returns `200` with the envelope, not `204`, so every success has the same body shape (§4).

## 4. Response Shapes

### Success: the envelope (same as `AuthResponse`)

Every success uses the common `Response` schema (`general_schemas.Response`):

```json
{
  "success": true,
  "message": "Batch created",
  "code": "BATCH_CREATED",
  "details": { "id": "8f0c…", "code": "B-2026-012", "pond_id": "…", "stocked_at": "2026-10-01" }
}
```

| Field | Rule |
|---|---|
| `success` | Always `true` on 2xx |
| `message` | A short, human-readable sentence the UI can show as a toast |
| `code` | `UPPER_SNAKE`, `<ENTITY>_<OUTCOME>`: `BATCH_CREATED`, `BATCH_FOUND`, `BATCHES_LISTED`, `BATCH_UPDATED`, `BATCH_DELETED`, `COMMAND_ACCEPTED`, `LOGIN_SUCCESS` |
| `details` | The payload: one resource (`*Read`), a page (below), or `null` |

To keep OpenAPI typed, make `Response` generic: `Response[BatchRead]`, `Response[Page[BatchRead]]`.

**List payload** (`details` for every list endpoint):

```json
{ "items": [ … ], "total": 57, "page": 1, "size": 20 }
```

### Errors: the existing exception handlers

| Kind | Raised with | Body |
|---|---|---|
| Field/business error tied to an input | `FieldException(status_code, field, message, type, action)` | `{ "detail": "...", "errors": [{ "field": "email", "message": "Email not found", "type": "email_not_found" }] }` |
| Pydantic validation (§5) | automatic (`RequestValidationError`) → `422` | same `{detail, errors[]}` shape, one entry per field |
| Not tied to a field (auth token, permission, 404 by path, 5xx) | `HTTPException(status_code, detail)` | `{ "detail": "..." }` |

- Use `type` in `lower_snake` for error entries (`email_not_found`, `same_password`, `device_offline`). The Next.js side switches on it.
- Use `field` with the request field name, or `"body"`, `"path.<param>"` or `"query.<param>"` when it isn't a body field.
- Never return stack traces, SQL or provider error text. Log them and send a generic `detail`.

## 5. Validation (Pydantic v2 — mandatory on every endpoint)

**All input and output goes through a Pydantic model. No exceptions.** If data crosses the API boundary, a schema validates it first.

| Input | How it is validated |
|---|---|
| JSON body | A `*Request` model as the parameter type |
| Path params | Typed annotations: `batch_id: UUID`. Never a bare `str` for an ID. |
| Query params | One query model per list endpoint: `filters: Annotated[ListLogsQuery, Query()]`, holding `page`, `size`, `sort`, `from`, `to` and the filters. Shared `PageQuery` lives in `core`. |
| Headers we rely on | Typed `Header()` params (`idempotency_key: Annotated[str, Header(min_length=8, max_length=128)]`) |
| Multipart uploads | `UploadFile` + a Pydantic model for the form fields; content type and size checked in a dependency → `415` / `413` |
| SSE query params | Same as query params (a model), validated **before** the stream opens |
| Assistant chat | `ChatRequest` model (`message` length-limited, `thread_id: UUID \| None`) |
| AMQP messages (publish and consume) | `*Event` / `*Message` models. Invalid consumed messages are logged and rejected (dead-lettered), never processed. |

| Output | How it is validated |
|---|---|
| Every response | `response_model=Response[...]` on the decorator. FastAPI validates and filters the output, so extra ORM fields (hashes, internal flags) never leak. |
| Read models | `*Read` with `ConfigDict(from_attributes=True)` to build from SQLModel rows |
| SSE events | Each event's data is a `*Event` model, serialized with `model_dump_json()` |

**Rules**
- **Never** read raw input: no `await request.json()`, no `request.query_params[...]`, no `dict` / `Any` parameters. `Request` may be injected only for metadata (IP, user agent, audit), as `auth.py` does.
- Put constraints in the schema, not the router: `Field(min_length, max_length, ge, le, pattern)`, `EmailStr`, `Literal`/`Enum` for fixed choices (`sensor_type`, `command`, `intent`, `status`).
- Use `@field_validator` / `@model_validator` for normalisation and cross-field rules (lowercase email, `from < to`, `batch_id` XOR `crab_id` on `ForecastRequest`).
- Request models use `ConfigDict(extra="forbid", str_strip_whitespace=True)`, so unknown fields give `422`.
- Update (`PATCH`) models have every field optional. Services apply `payload.model_dump(exclude_unset=True)` so only the sent fields change.
- Validation failures always return `422` through the global handler, in the `{detail, errors[]}` shape (§4). Routers never catch `ValidationError` themselves.
- **Business** validation (exists? unique? allowed for this device?) belongs in the **service** and maps to `400/404/409`, not `422`.
- Numeric sensor/measurement fields carry physical bounds (`width_mm: float = Field(gt=0, le=300)`, `ph: float = Field(ge=0, le=14)`) so impossible values are rejected at the edge.

## 6. Status Codes

| Code | When | Example |
|---|---|---|
| `200 OK` | Read, update, delete or action succeeded | `GET /batches/{id}`, `PATCH /auth/change-password` |
| `201 Created` | A new resource was created; also set a `Location` header | `POST /batches` |
| `202 Accepted` | Work was queued; the result arrives later through SSE or polling | `POST /devices/{id}/commands`, `POST /forecasts` |
| `400 Bad Request` | Well-formed request rejected by a business rule | incorrect current password/pin, a log date before the batch's stocking date |
| `401 Unauthorized` | Missing, invalid or expired token, or wrong sign-in credentials; include `WWW-Authenticate: Bearer` for token errors | `/auth/sign-in` wrong password |
| `403 Forbidden` | Authenticated but missing the permission or role | non-admin `POST /users` |
| `404 Not Found` | The resource in the path doesn't exist (or is soft-deleted) | `GET /crabs/{unknown}`, sign-in email not found (existing) |
| `409 Conflict` | Duplicate unique value or a state conflict | email already used, new password same as current, device offline, camera already running |
| `413 Content Too Large` | Upload over the limit | QR image > `settings.max_upload_mb` |
| `415 Unsupported Media Type` | Wrong upload type | QR scan with a non-image |
| `422 Unprocessable Content` | Pydantic validation failed | pin not 4 digits, `size > 100` |
| `429 Too Many Requests` | Rate limit hit; include `Retry-After` | assistant chat spam, sign-in brute force |
| `500 Internal Server Error` | Unexpected failure (the service returned `*_FAILED`) | DB error |
| `502 Bad Gateway` | An upstream provider failed | DeepInfra error or timeout |
| `503 Service Unavailable` | A dependency is down; include `Retry-After` | RabbitMQ unreachable, worker not consuming |

**How the router chooses the status** (same as `auth.py`): the service returns `Response(success=False, code=...)`, and the router maps each failure `code` to one row above. Every code the service can return must have a mapping in the router **and** an entry in the decorator's `responses={...}`.

## 7. Collections: Pagination, Filtering, Sorting

| Concern | Query params | Rule |
|---|---|---|
| Pagination | `page` (≥1, default 1), `size` (1–100, default 20) | Always paginate lists. Never return an unbounded list. |
| Filtering | field names: `batch_id`, `status`, `device_id`, `sensor_type` | Only filters the endpoint explicitly declares. Unknown params are ignored. |
| Date range | `from`, `to` (ISO 8601, `from` inclusive, `to` exclusive) | Used for logs, readings and audit. |
| Sorting | `sort=field` ascending, `sort=-field` descending | Default is `-created_at`. Only whitelisted fields; anything else is `422`. |
| Search | `q` | Only where it's useful (users by name/email, crabs by tag). |

Time-series reads (sensor readings) also accept `interval=1m|5m|1h|1d` for server-side aggregation instead of paging raw rows.

## 8. Endpoint Template (copy this)

```python
@router.post(
    "",
    response_model=Response[BatchRead],
    status_code=status.HTTP_201_CREATED,
    openapi_extra={AUDIT_ACTION_KEY: "batch.create"},
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing or invalid token"},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse, "description": "Missing batch:create permission"},
        status.HTTP_409_CONFLICT: {"model": ValidationErrorResponse, "description": "Batch code already exists"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid batch fields"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error creating batch"},
    },
)
def create_batch(                                   # plain def: sync Session (01 §7)
    payload: CreateBatchRequest,
    response: FastAPIResponse,
    user: Users = Depends(require_permissions(Permission.BATCH_CREATE)),
    db: Session = Depends(get_db),
):
    result = BatchServices(db).create(payload, actor=user)

    if result.code == "BATCH_CODE_EXISTS":
        raise FieldException(
            status_code=status.HTTP_409_CONFLICT,
            field="code", message=result.message, type="batch_code_exists",
            action="batch.create",
        )
    if result.code == "BATCH_CREATE_FAILED":
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.message)

    response.headers["Location"] = f"{settings.api_prefix}/batches/{result.details.id}"
    return result
```

Checklist for every endpoint:
- `response_model`, `status_code`, `openapi_extra={AUDIT_ACTION_KEY: "<resource>.<action>"}` and `responses={...}` for **every** non-2xx status it can return.
- An auth dependency (`get_current_user` or `require_permissions(...)`), unless the endpoint is public by design (`/auth/sign-in`, `/health`).
- Every input (body, path, query, header, upload) is a typed Pydantic model or annotation (§5). Request schemas use `ConfigDict(extra="forbid", str_strip_whitespace=True)` and a `json_schema_extra` example (as in `CreateUserRequest`).
- Response models never include secrets (password/pin hashes, tokens other than on auth endpoints).
- Audit action names are `<resource>.<action>` in `lower_snake`: `batch.create`, `device.command`, `auth.sign_in`.

## 9. Async Work (202 pattern)

Used for device commands, forecast runs and camera start/stop.

1. The `POST` validates input, publishes to RabbitMQ, and returns `202` with `details: { "<job>_id": "...", "status": "queued" }`.
2. The client follows progress through the matching SSE stream or `GET /<resource>/{id}`.
3. Status values: `queued` → `running` → `succeeded` | `failed` | `insufficient_data` (forecasts only).
4. If the broker is unreachable, return `503` and don't create the job row.
5. `POST /devices/{device_id}/commands` requires an `Idempotency-Key` header. A repeat with the same key within 24 h returns the original `202` instead of sending the command again, which stops double feeding or double aeration.

## 10. Streaming (SSE)

| Rule | Standard |
|---|---|
| Path | `GET /<resource>/stream`, filtered by query params (`?device_id=`, `?batch_id=`, `?camera_id=`) |
| Response | `200`, `Content-Type: text/event-stream`, `Cache-Control: no-cache` |
| Event name | `event: <resource>.<event>`, e.g. `sensor.reading`, `device.status`, `detection.created`, `forecast.completed` |
| Data | One JSON object per event, validated by a `*Event` schema |
| Heartbeat | `: ping` comment every 15 s |
| Errors before streaming | Normal `401`/`403`/`404` JSON. After the stream starts, send `event: error` and close. |

The assistant chat (`POST /assistant/chat`) also replies with SSE. Its events are `thread` (first event, `{thread_id}`), `token` (`{content}`), `done`, and `error`.

## 11. Endpoint Catalog

Status codes listed are in addition to the defaults every protected endpoint has: `401`, `403`, `422`, `500`.

### authentication

| Method | Path | Success | Notable errors |
|---|---|---|---|
| POST | `/auth/sign-in` | 200 `LOGIN_SUCCESS` | 404 email, 401 password |
| POST | `/auth/sign-in/pin` | 200 `PIN_VERIFIED` | 401 pin / refresh token |
| PATCH | `/auth/change-password` | 200 | 400 wrong current, 409 same as current |
| PATCH | `/auth/change-pin` | 200 | 400 wrong current, 409 same as current |
| GET | `/users` | 200 | — |
| POST | `/users` | 201 `USER_CREATED` | 409 email exists |
| GET | `/users/me` | 200 | — |
| GET | `/users/{user_id}` | 200 | 404 |
| PATCH | `/users/{user_id}` | 200 | 404, 409 email exists |
| DELETE | `/users/{user_id}` | 200 (soft) | 404, 409 deleting yourself |

### crab_management

| Method | Path | Success | Notable errors |
|---|---|---|---|
| GET | `/batches` | 200 | — |
| POST | `/batches` | 201 | 409 code exists |
| GET / PATCH / DELETE | `/batches/{batch_id}` | 200 | 404, 409 batch has crabs (delete) |
| GET | `/crabs` (`?batch_id=&q=`) | 200 | — |
| POST | `/crabs` | 201 | 404 batch, 409 tag/QR exists |
| GET / PATCH / DELETE | `/crabs/{crab_id}` | 200 | 404 |
| GET | `/logs` (`?batch_id=&crab_id=&from=&to=`) | 200 | — |
| POST | `/crabs/{crab_id}/logs` | 201 | 404 crab, 400 date out of range |
| GET / PATCH / DELETE | `/logs/{log_id}` | 200 | 404 |
| POST | `/forecasts` (`{batch_id \| crab_id}`) | 202 `FORECAST_QUEUED` | 404 subject, 409 run already queued, 503 broker |
| GET | `/forecasts` (`?batch_id=&crab_id=`) | 200 latest runs | — |
| GET | `/forecasts/{run_id}` | 200 run + 7 points | 404 |
| GET | `/forecasts/stream` | 200 SSE `forecast.completed` | — |

### monitoring

| Method | Path | Success | Notable errors |
|---|---|---|---|
| GET | `/sensors` | 200 sensor list | — |
| GET | `/sensors/{sensor_id}/readings` (`?from=&to=&interval=`) | 200 | 404 |
| GET | `/sensors/stream` (`?device_id=&sensor_type=`) | 200 SSE `sensor.reading` | — |
| GET | `/devices` | 200 | — |
| POST | `/devices` | 201 | 409 device id exists |
| GET / PATCH / DELETE | `/devices/{device_id}` | 200 | 404 |
| POST | `/devices/{device_id}/commands` | 202 `COMMAND_ACCEPTED` | 404, 400 command not allowed for device, 409 device offline, 503 broker |
| GET | `/devices/{device_id}/commands/{command_id}` | 200 status | 404 |
| GET | `/devices/stream` | 200 SSE `device.status` | — |

### vision

| Method | Path | Success | Notable errors |
|---|---|---|---|
| GET | `/cameras` | 200 cameras from `Settings` + running state | — |
| POST | `/cameras/{camera_id}/start` | 202 | 404, 409 already running, 503 broker |
| POST | `/cameras/{camera_id}/stop` | 202 | 404, 409 not running, 503 broker |
| GET | `/detections/stream` (`?camera_id=`) | 200 SSE `detection.created` (live only, not stored) | — |
| POST | `/qr/scan` (multipart image) | 200 `QR_DECODED` + linked crab/batch | 413, 415, 404 no QR found in image, 404 code not linked to a crab/batch |

### assistant

| Method | Path | Success | Notable errors |
|---|---|---|---|
| POST | `/assistant/chat` (`{thread_id?, message}`) | 200 SSE (temporary, no history) | 403 thread belongs to another user, 429, 502 DeepInfra, 503 |
