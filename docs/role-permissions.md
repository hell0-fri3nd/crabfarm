# Role permissions

Who can use each Crabfarm feature, per role. Checked against the code on 2026-11-17.

The API is the source of truth: every endpoint names its allowed roles, and the web app only hides or shows things for convenience. The endpoint catalog in [`api/context/02-api-design.md`](../api/context/02-api-design.md) §11 has the full request and error details; when an endpoint's roles change, update this file in the same commit.

## Roles

| Role | Who it's for | Default |
|---|---|---|
| **Developer** | The people building and running the system | — |
| **Admin** | The farm admin | — |
| **Staff** | Farm staff doing daily work | New users start as Staff |

**Key:** **Yes** = allowed · **Own** = allowed, but only for their own records · **No** = refused with `403` (and audited as `auth.role_denied` or the feature's own `DENIED` event)

## Built features

### Signing in and your own account

Every role manages its own account the same way. Nobody can change their own role or email.

| Feature | Endpoint | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| Sign in with email and password | `POST /auth/sign-in` | Yes | Yes | Yes |
| Unlock with PIN | `POST /auth/sign-in/pin` | Yes | Yes | Yes |
| Sign out | `POST /auth/sign-out` | Yes | Yes | Yes |
| First sign-in setup (new password and PIN) | `POST /auth/onboarding` | Yes | Yes | Yes |
| See my profile | `GET /auth/me` | Yes | Yes | Yes |
| Change my name | `PATCH /auth/me` | Yes | Yes | Yes |
| Change my password | `PATCH /auth/change-password` | Yes | Yes | Yes |
| Change my PIN | `PATCH /auth/change-pin` | Yes | Yes | Yes |
| My recent activity (profile card) | `GET /auth/me/activity` | Own | Own | Own |

A deactivated user can't sign in, unlock with a PIN, or use their own-account endpoints.

### Managing users

| Feature | Endpoint | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| List and search users | `GET /users` | Yes | Yes | No |
| See one user | `GET /users/{user_id}` | Yes | Yes | No |
| Add a user | `POST /users` | Yes | Yes ¹ | No |
| Edit a user (name, email, role) | `PATCH /users/{user_id}` | Yes | Yes ¹ | No |
| Deactivate a user | `DELETE /users/{user_id}` | Yes ² | Yes ¹ ² | No |
| Reactivate a user | `POST /users/{user_id}/reactivate` | Yes | Yes ¹ | No |
| Reset a user's password and PIN | `POST /users/{user_id}/reset-credentials` | Yes ³ | Yes ¹ ³ | No |

1. An Admin can't create, edit, deactivate, reactivate or reset a **Developer** account, and can't give anyone the Developer role (`403 DEVELOPER_ROLE_REQUIRED`).
2. Nobody can deactivate their own account (`409`).
3. Nobody can reset their own credentials here; they use change password and change PIN instead (`409`).

### Batches, crabs and QR stickers

| Feature | Endpoint | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| See batches | `GET /batches` | Yes | Yes | Yes |
| Start a new batch | `POST /batches` | Yes | Yes | No |
| See crabs | `GET /crabs` | Yes | Yes | Yes |
| Download QR stickers (PDF or PNG) | `POST /crabs/sticker-downloads` | Yes | Yes | Yes ⁴ |
| See recent sticker downloads | `GET /audit-events` (filtered) | Yes | Yes | Own |

4. The web page asks the API before it makes the file, and the download is audited as `crab.sticker_download`.

### Crab logs

| Feature | Endpoint | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| See all logs (filter by batch, crab, type, dates) | `GET /logs` | Yes | Yes | Yes |
| See one crab's logs | `GET /logs/{crab_id}` | Yes | Yes | Yes |
| Record a log (width, weight) | `POST /logs` | Yes | Yes | Yes |
| See recent logs on Scan crab (latest 5) | `GET /audit-events` (`action=log.create`) | Yes | Yes | Own |
| See who recorded each log, by name | `GET /users` | Yes | Yes | No ⁹ |
| Run the 7-day growth forecast (all crabs, or one), saved as prediction logs | `POST /forecasts` | Yes | Yes | No |
| Retrain the growth model (ADR-0004), and see past trainings and their results | `POST /forecasts/model-trainings`, `GET /forecasts/model-trainings`, `GET /forecasts/model-trainings/{training_id}` | Yes | Yes | No |

Each log stores who recorded it. Every role sees every log on the Logs page; only the names behind "Logged by" depend on the role.

9. Staff can't list users, so the Logs page shows "You" on their own logs and "Teammate" on everyone else's.

### Activity (audit trail)

| Feature | Endpoint | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| See everyone's activity | `GET /audit-events` | Yes | Yes | No |
| See my own activity (`mine=true`) | `GET /audit-events` | Yes | Yes | Own ⁵ |
| See one person's activity (`actor_id=…`) | `GET /audit-events` | Yes | Yes | Own ⁵ |
| Filter by type, date range, result, search | `GET /audit-events` | Yes | Yes | Own ⁵ |
| Open an event's details (who, what, result, request, IP, device, recorded data) | `GET /audit-events` (same row) | Yes | Yes | Own ⁵ |

5. Staff always get only their own events, whatever filters they send. Asking for another user's activity is refused (`403 others_activity_forbidden`). The details panel shows nothing beyond the row the API already returned, so it follows the same rule.

### Live updates

| Feature | Endpoint | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| System announcements stream | `GET /events/stream` | Yes | Yes | Yes |
| Crab scale live weight | `GET /scales/stream` | Yes | Yes | Yes |

## Web pages

The web app reads the same rules from `web/lib/permissions.ts` to hide what a role can't use: the Users page is left out of Staff's sidebar and More sheet, and New batch is hidden for Staff. Hiding is only for clarity; the API still refuses anything a role isn't allowed to do.

| Page | Data | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| Dashboard | Live growth card (last 7 days of crab logs) · the rest is sample data | Yes | Yes | Yes |
| Logs | Live (crab logs) · sample (sensor logs) | Yes | Yes | Yes ¹⁰ |
| Feeding | Sample data | Yes | Yes | Yes |
| QR stickers | Live | Yes | Yes | Yes ⁶ |
| Scan crab | Live (save log, recent logs) · camera reads QR in the browser; scale not connected | Yes | Yes | Yes ¹¹ |
| Assistant | Sample data | Yes | Yes | Yes |
| Users | Live | Yes | Yes | No ⁷ |
| Activity | Live | Yes | Yes | Own ⁸ |
| My profile | Live | Yes | Yes | Yes |

6. Staff can pick crabs and download stickers. New batch is hidden for Staff.
7. Staff see "You can't manage users" instead of the team list.
8. Staff see only their own events and have no Person filter. Developers and Admins see the whole team and can narrow it to themselves or one person. Every role gets the type chips (Sign-ins, Crab logs, Batches, QR stickers, Users, Security), date range, result and search, and can click a row to see its details. **See all downloads** on QR stickers opens Activity on the QR stickers type.
10. Staff see every crab log, but "Logged by" reads "You" or "Teammate" instead of a name (⁹).
11. Staff see only their own logs in the recent list ("Your recent logs"); Developers and Admins see everyone's latest 5 with a By column.

## Planned features (roles not decided yet)

These are in the design but have no endpoints yet, so their roles aren't set. Decide them here before building.

| Feature | Planned endpoints | Developer | Admin | Staff |
|---|---|:-:|:-:|:-:|
| Edit or delete a single log | `GET`, `PATCH`, `DELETE /logs/{log_id}` | ? | ? | ? |
| Edit or delete a batch | `GET`, `PATCH`, `DELETE /batches/{batch_id}` | ? | ? | ? |
| Add, edit or delete a crab | `POST /crabs`, `PATCH`, `DELETE /crabs/{crab_id}` | ? | ? | ? |
| Water sensors and live readings | `/sensors`, `/sensors/stream` | ? | ? | ? |
| Devices and commands (feed now, stop) | `/devices`, `/devices/{device_id}/commands` | ? | ? | ? |
| Cameras and crab detection | `/cameras`, `/detections/stream` | ? | ? | ? |
| QR scan | `POST /qr/scan` | ? | ? | ? |
| Assistant chat | `POST /assistant/chat` | ? | ? | ? |

## Where this is enforced

- **Endpoint level:** each endpoint declares a role alias from `app.core`: `AnyRole` (every role), `DeveloperOrAdmin`, or `DeveloperOnly` (not used yet). A wrong role gets `403` and an `auth.role_denied` audit row.
- **Inside a service:** rules that depend on the data are checked in the service, because the endpoint can't know them in advance:
  - the Developer-account rules for Admins (`authentication/users`)
  - Staff seeing only their own activity (`audit/events`)
- **Roles come from the access token.** A role change takes effect when the user's access token expires, which is at most 15 minutes.
