# ADR-0006: Model feeding as schedules plus named cages

**Status:** Accepted
**Date:** 2026-11-18
**Deciders:** API and web maintainers
**Extends:** `api/context/04-schema.md` §1 and §2, `api/context/01-architecture.md` §10

## Context

The Feeding page needs saved schedules that the worker runs with APScheduler, and a per-cage on/off status. There is no feeder hardware yet, so nothing can report a jam or receive a feed command.

The first version of the tables (`feeders`, `cages`, `schedules`) was built around hardware that doesn't exist.

The forces:

- **The day choices are few and fixed:** every day, weekdays, weekends, and Mon, Wed, Fri, Sun.
- **Cages use the same names as crabs** (`A1`, `B1`, `C2`), and the farm starts with a known set of them.
- **Modules are isolated** (04 §1, §5): no foreign keys or SQL joins across schemas in app code.
- **The API and the worker are separate processes**, and the worker must keep running when the web app or the broker is down.
- **Feeding is physical:** a restart must never feed the same schedule twice.

## Decision

**Three tables in `devices`. `schedules` stores a fixed day rule, `cages` stores each cage's name, group and active flag, and `schedule_groups` lists the groups each schedule feeds.**

```
devices.schedules             devices.schedule_groups       devices.cages
──────────────────────        ───────────────────────       ─────────────────
id ─────────────────────────< schedule_id                   id
name, feed_time, days         group_code ┈┈┈┈ matches ┈┈┈┈┈ group_code  A
is_enabled                                                  cage_name   A1
user_id (no FK)                                             is_active
created_at, updated_at, deleted_at                          created_at, updated_at
```

### `devices.schedules`

The `schedule_days` enum is `every-day`, `weekdays`, `weekends`, `mon-wed-fri-sun`. One constant in code will turn each value into an APScheduler `day_of_week`:

| `days` | `day_of_week` |
|---|---|
| `every-day` | `mon-sun` |
| `weekdays` | `mon-fri` |
| `weekends` | `sat,sun` |
| `mon-wed-fri-sun` | `mon,wed,fri,sun` |

The last rule is exactly those four days, so Sunday and Monday are fed back to back.

### `devices.cages`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `group_code` | `varchar(10)` | the group letter; a check requires `left(cage_name, 1) = group_code` |
| `cage_name` | `varchar(50)` | unique, same value as the crab's name |
| `is_active` | `boolean` | default `true`; `false` = schedules skip this cage, and Feed now still works |
| `created_at`, `updated_at` | `timestamptz` | |

A seed gives every crab name an active cage (`A1`…`E5`, 25 today).

### `devices.schedule_groups`

One row per group a schedule feeds, so a schedule can cover any set of groups, and "All groups" is one row per group. `group_code` has no foreign key, because `cages.group_code` repeats. `POST /schedules` checks that each group has cages and requires at least one, and a schedule with no rows feeds nothing.

### `devices.feeders`

Removed, with the hardware-only cage columns. They come back in a new migration when hardware is planned.

### How the worker will use them

```
every 30 s: read enabled, non-deleted schedules ──▶ add, change or remove APScheduler cron jobs
at feed_time (farm_time_zone):
  claim schedule_runs (schedule_id, run_date) ──already claimed──▶ stop
  schedule_groups joined to active cages on group_code ──▶ cages to feed
  audit the run as SYSTEM
```

PostgreSQL is the source of truth, so APScheduler's job store stays in memory. `schedule_runs` is added with the job. Its unique `(schedule_id, run_date)` works like `water_sensor_logs`' unique slot, so a restart can't run a feed twice.

## Options Considered

### Day rule: A. Fixed enum (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | A new choice needs one migration and one line of code |
| Scalability | Enough for a handful of fixed rules |
| Team familiarity | High, the same as `water_sensor_status` |

**Pros:** invalid days can't be stored, it matches the form's dropdown, and 04 §4 recommends enums for small, stable sets.
**Cons:** no custom day combinations.

### Day rule: B. `schedule_weekdays` child table

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | A second table, and writes touch two tables |
| Scalability | Any combination of days |
| Team familiarity | High |

**Pros:** fully normalized and flexible.
**Cons:** the flexibility has no use while the form offers four fixed choices.

### Cage name: A. Own `cage_name` column (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | A crab rename must also rename the cage |
| Scalability | Fine for tens or hundreds of cages |
| Team familiarity | High |

**Pros:** the table is readable on its own, and the worker needs nothing from `crab_management` to find cages or groups.
**Cons:** the two names can differ if only one is changed.

### Cage name: B. `crab_id` reference, name read from the crab

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | Every cage list calls a second module |
| Scalability | Fine |
| Team familiarity | High |

**Pros:** the name can never differ from the crab's.
**Cons:** the table shows only numbers, and feeding depends on another module.

## Trade-off Analysis

A cage is a place with its own name that happens to match the crab's, so `cage_name` is the cage's own data and not a copy that 04 §5 would need a sync job for. The cost is a manual step if a name ever changes. Fixed day rules give up custom combinations in exchange for values that can't be wrong.

## Consequences

- **Easier:** the worker's lookup uses only `devices` tables, and `devices.cages` is readable directly.
- **Harder:** a crab added or renamed later needs its cage added or renamed too, and the Feeding page loses its jammed and offline states when it connects to these tables.
- **Web:** the page's **Scheduled** switch saves `is_active`, and its group cards come from `cages`.
- **Revisit:** until a feeder exists, a schedule run can only be recorded and audited. Nothing is physically dispensed.

## Action Items

1. [x] Migrations: drop `feeders`, simplify `cages`, change `schedule_days`, seed the cages.
2. [x] Update `04-schema.md`, `schema.dbml` and `feeding.dbml`.
3. [x] Change the form's Days option to **Mon, Wed, Fri, Sun**.
4. [x] Build the `/schedules` endpoints (list, create, edit, on/off, delete, restore), each audited. Create, edit, delete and restore are for DEVELOPER and ADMIN, and every role can list and turn schedules on or off.
5. [x] Build `GET /cages` and `PATCH /cages/{cage_id}`, audited as `cage.list` and `cage.update`, open to every role.
6. [x] Connect the Feeding page's cages, Schedules card and form.
7. [ ] Build the APScheduler job and `schedule_runs`.
