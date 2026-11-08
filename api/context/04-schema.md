# 04 — Database Schema

The PostgreSQL schema, naming rules, and normalization/denormalization rules.
**Diagram:** [`schema.dbml`](schema.dbml). Paste it into https://dbdiagram.io.
**Source of truth:** the SQLModel models (`app/**/models.py`) and the Alembic migrations (`api/migrations/versions`).

> **Rule:** every change to a model or migration updates **this file and `schema.dbml` in the same commit**.

---

## 1. Modular Database

One PostgreSQL database, **one Postgres schema per module**, the same way the code is split into domains (01 §4).

| Postgres schema | Owner module | Tables | Status |
|---|---|---|---|
| `auth` | `authentication` | `users` | live |
| `audit` | `core/audit` | `audit_events` | live |
| `crab_management` | `crab_management` | `crabs`, `batches`, `logs` | live (see §6 drift) |
| `monitoring` | `monitoring` | sensors, readings, devices, commands | planned |

- A module's tables live only in its schema: `__table_args__ = {"schema": "<schema>"}`.
- **Modules are isolated: no foreign keys between schemas, ever** (including toward `auth.users`). FKs exist only between tables of the **same** module (§5).
- The migration that introduces a schema creates it (`op.execute("CREATE SCHEMA IF NOT EXISTS <schema>")`), and its downgrade drops it.
- A schema name is the module name in `snake_case`. `auth` is the one existing short form.
- **Modules with no database:** `vision` (results are live-only over SSE, cameras are in `Settings`) and `assistant` (LangGraph uses an in-memory checkpointer). Neither gets a schema or tables. A vision width is stored only when a user saves it as a `crab_management.logs` row.

## 2. Current Tables

### `auth.users`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | no | `uuid4()` (app) | PK |
| `name` | `varchar(150)` | no | | |
| `email` | `varchar(254)` | no | | unique, lowercased by schema |
| `password` | `varchar(255)` | no | | argon2 hash |
| `pin` | `varchar(4)` | yes | | 4-digit pin |
| `role` | enum `user_role` (`ADMIN`, `USER`, `STAFF`) | no | `USER` | stores enum **names** |
| `created_at` | `timestamptz` | no | `now()` | |
| `updated_at` | `timestamptz` | no | `now()` | `onupdate=now()` |

Indexes: `ix_auth_users_email` (unique), `ix_auth_users_id`.

### `audit.audit_events`

Append-only. Never updated or deleted by the app.

| Group | Columns |
|---|---|
| When | `id uuid PK default gen_random_uuid()`, `occurred_at timestamptz`, `recorded_at timestamptz`, `occurred_date date GENERATED`, `occurred_time time(0) GENERATED` (both in `Asia/Manila`) |
| Who | `actor_id uuid`, `actor_type`, `actor_role`, `actor_email`, `session_hash char(64)` |
| Where (client) | `source_ip inet`, `user_agent`, `geo_country`, `geo_city`, `page_path` |
| Where (system) | `service`, `source`, `version`, `environment`, `http_method`, `http_path`, `request_id uuid` |
| What | `action`, `target_type`, `target_id uuid`, `target_label` |
| Result | `outcome`, `severity`, `http_status int`, `reason text`, `changes jsonb` |

Indexes: `occurred_at`, `actor_id`, `action`.

### `crab_management.crabs`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `serial` | no | PK |
| `name` | `varchar(50)` | no | unique, seeded `A1`…`E5` |
| `group_by` | `varchar(10)` | no | group letter `A`…`E` |

### `crab_management.batches`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `serial` | no | PK |
| `user_id` | `uuid` | no | refers to `auth.users.id`, indexed, **no FK** (cross-module, §5) |
| `created_at` | `timestamptz` | no | default `now()` |

### `crab_management.logs`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `serial` | no | PK |
| `batch_id` | `int` | yes | FK → `batches.id`, indexed |
| `crab_id` | `int` | no | FK → `crabs.id`, indexed |
| `user_id` | `uuid` | no | refers to `auth.users.id`, indexed, **no FK** (cross-module, §5) |
| `type` | enum `logs_enum` (`prediction`, `actual`) | no | indexed, stores enum **values** |
| `width` | `numeric(10,2)` | yes | carapace width |
| `weight` | `numeric(10,2)` | yes | |
| `created_at` | `timestamptz` | no | default `now()` |

### Relationships

```
Within crab_management (real FKs):
crab_management.batches 1 ──< crab_management.logs (logs.batch_id, optional)
crab_management.crabs   1 ──< crab_management.logs (logs.crab_id)

Across modules (plain IDs, no FK):
crab_management.batches.user_id ··· auth.users.id
crab_management.logs.user_id    ··· auth.users.id
audit.audit_events.actor_id     ··· auth.users.id
```

## 3. SQL Naming Conventions

These are enforced by the `naming_convention` on `SQLModel.metadata` in `core/database.py`.

| Object | Rule | Example |
|---|---|---|
| Schema | module name, `snake_case` | `crab_management`, `monitoring` |
| Table | **plural** noun, `snake_case` | `users`, `batches`, `sensor_readings` |
| Join table | both sides, plural last | `batch_crabs`, `device_sensors` |
| Column | singular, `snake_case` | `email`, `stocked_at` |
| Primary key | `id` | |
| Foreign key column | `<singular referenced table>_id` | `batch_id`, `crab_id`, `user_id` |
| Boolean | `is_` / `has_` prefix | `is_active`, `has_molted` |
| Timestamp | `<verb>_at`, always `timestamptz`, stored in UTC | `created_at`, `measured_at` |
| Date | `<noun>_date` | `occurred_date`, `stocked_date` |
| Measurement | unit suffix | `width_mm`, `weight_g`, `temperature_c`, `salinity_ppt` |
| Enum type | `<table singular>_<column>`, in the table's schema | `user_role`, `log_type`, `device_status` |
| Model class | PascalCase plural = table name | `Users`, `Batches`, `Logs` |

**Constraint and index names** are generated automatically. Never name them by hand, except in rename migrations.

| Kind | Pattern | Example |
|---|---|---|
| PK | `pk_<table>` | `pk_users` |
| FK | `fk_<table>_<column>_<referred_table>` | `fk_logs_batch_id_batches` |
| Unique | `uq_<table>_<column>` | `uq_crabs_name` |
| Check | `ck_<table>_<name>` | `ck_logs_width_positive` |
| Index | `ix_<schema>_<table>_<column>` | `ix_crab_management_logs_crab_id` |

**Avoid reserved or ambiguous words** as column names (`type`, `group`, `order`, `user`, `date`). Use qualified names instead: `log_type`, `group_code`.

## 4. Column & Table Standards

- **Primary keys:** `uuid` for entities exposed through the API (matches 02 §1). Use `bigint` identity for high-volume append-only tables (sensor readings), where the row isn't addressed by users. Existing `serial` keys in `crab_management` are legacy (§6).
- **Standard columns** on every entity table: `created_at`, `updated_at` (`onupdate=now()`). Add `deleted_at timestamptz null` where soft delete is needed. Soft-deleted rows are excluded by services.
- **Money/measurements:** `numeric(p,s)`, never `float`, for anything stored and compared. Add `CHECK` constraints for physical bounds (`width_mm > 0`).
- **Enums:** native Postgres enums for small, stable sets. Store the **value** (`values_callable=lambda e: [m.value for m in e]`), and create them in the owning schema. Use a lookup table instead when the set changes at runtime or carries extra columns.
- **Text:** `varchar(n)` when there's a real limit, `text` otherwise.
- **JSONB:** only for payloads with no fixed shape (audit `changes`, device command params). **Never** put fields in JSONB that you filter, join or aggregate on.
- **Indexes:** every FK column, every column used in a `WHERE` or `ORDER BY` by a list endpoint, and composite indexes for time-series lookups (`(sensor_id, measured_at DESC)`).

## 5. Normalization & Denormalization

### Normalize by default (3NF)

- Every non-key column describes the key, the whole key, and nothing but the key.
- **No repeating groups:** no comma-separated lists, and no `sensor1`, `sensor2` columns. Use a child table.
- **Many-to-many uses a join table** with its own FKs and a unique constraint on the pair.
- **Reference data in one place:** enum, lookup table, or the owning table. Never copy it into other tables.
- **Within a module:** use real FKs with explicit `ON DELETE` behaviour (`RESTRICT` by default, `CASCADE` only for owned children).
- **Across modules: no FKs at all.** A reference to another module's row is a plain ID column (same type as the target's PK) named `<singular>_id`, with an index and **no FK constraint**.
  - The **owning service** checks it exists when writing (for example `UserServices.get(user_id)` before creating a batch) and resolves it when reading (01 §6).
  - Joins across schemas in SQL aren't allowed in app code. Fetch through the other module's service and combine in Python.
  - Deleting a row never cascades into another module. The referencing module handles orphans (soft delete, or keep the ID as history).
  - Why: each module can be migrated, reset or split out without breaking another module's constraints.

### Denormalize only for these reasons

| Allowed reason | How | Existing / planned example |
|---|---|---|
| **Historical snapshot**: the value at the time of the event must not change later | Copy the value onto the event row | `audit_events.actor_email`, `actor_role`; forecast `model_version` and input window |
| **Derived value read far more than written** | Postgres `GENERATED ALWAYS AS (...) STORED` column | `audit_events.occurred_date`, `occurred_time` |
| **Time-series read performance** | Aggregate table or **materialized view**, refreshed by the worker | `monitoring.sensor_readings_daily` (planned), used by charts and forecast features |
| **Immutable results** | Store the computed output once | `forecast_points` |

Rules for every denormalized column:
1. Document it in this file: what it copies, the source of truth, and how it stays correct.
2. Prefer **generated columns and materialized views** over values the app keeps in sync by hand.
3. Never copy **mutable** data across modules unless it's a deliberate snapshot.
4. If a copy can drift, there must be a job or trigger that fixes it, or it's not allowed.

## 6. Known Drift (models vs. migrations), fix before new crab features

| # | Issue | Model says | Migrations / DB say | Fix |
|---|---|---|---|---|
| 1 | Logs table name | `crab_management.logs`, enum `logs_enum` | `crab_management.crab_logs`, enum `crab_logs_enum` (never renamed) | Rename migration (table, sequence, PK/FK/index names, enum), as `e8cfd54d53fc` did for batches |
| 2 | Crab models not in Alembic | — | `migrations/env.py` has the crab model imports commented out, so autogenerate ignores `crab_management` | Import `Crabs`, `Batches`, `Logs` in `env.py` |
| 3 | Role enum | `auth.user_role`, native | type `role` in the default schema (renamed from `userrole`), values `ADMIN/USER/STAFF` | Migration to move/rename the type to `auth.user_role` |
| 4 | `users.pin` | `varchar(4)`, nullable | `varchar(255)`, NOT NULL | Align. If the pin is hashed it needs `varchar(255)`, so update the model instead |
| 5 | `batches.user_id` cross-module FK | `foreign_key="auth.users.id"` | `fk_batches_user_id_users` exists | Remove `foreign_key` from the model and add a migration that drops the constraint (keep the index). `logs.user_id` is already correct (no FK). |
| 6 | Naming rules | `logs.type`, `crabs.group_by`, `width`/`weight` without units, `serial` ids | — | When the logs/crab endpoints are built: `log_type`, `group_code`, `width_mm`, `weight_g`; decide uuid vs int ids |
| 7 | Empty revision | — | `d8ce1eff817c` has `pass` in both directions | Leave it (it's in the chain). Don't repeat. |
| 8 | Base class | models inherit `SQLModel` directly | — | Fine, because the naming convention is set on `SQLModel.metadata`. Use `core.Base` for new models. |

`schema.dbml` shows the **intended** state: the model side, following these rules (so no cross-module FK on `batches.user_id`).

## 7. Migration Rules

1. Change the model, run `alembic revision --autogenerate -m "<verb> <what>"`, **then read and fix the generated file**.
2. New model modules **must** be imported in `migrations/env.py`, or autogenerate won't see them.
3. One concern per revision. Seed data gets its own revision (`seed_*`), and it's idempotent (`ON CONFLICT DO NOTHING`).
4. Renames are written by hand: table, sequence, PK/FK/index names, and enums.
5. Downgrades must work: drop indexes, tables, enum types (`DROP TYPE IF EXISTS`) and the schema if it was created.
6. Never edit a migration that has already been applied anywhere. Add a new one.
7. Update **`04-schema.md` and `schema.dbml`** in the same commit.
