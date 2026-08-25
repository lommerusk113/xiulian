# Xiulian — backend, accounts and sync

**Goal.** Progress follows the learner across phone and PC. Multi-user from day one (signup/login) so others can join later. Deployed on Coolify behind Pangolin.

**Decision.** Full backend (Micronaut + Postgres) with normalized tables, chosen over a single-blob store for future server-side queries. Accounts in-app (JWT), not delegated to Pangolin.

## Layout

Monorepo. Frontend stays at the repo root. `api/` holds the Micronaut app. `compose.yaml` at the root. Coolify deploys via the Docker Compose build pack; Pangolin fronts `web:80`.

## Services

| service | image | role |
|---|---|---|
| `web` | multi-stage: `node:24-alpine` builds `dist` → `nginx:alpine` | serves SPA, proxies `/api/` → `http://api:8080/api/` |
| `api` | multi-stage: `eclipse-temurin:25-jdk` wrapper build → `eclipse-temurin:25-jre` | Micronaut 5, Java 25 (Micronaut 5 requires JDK 25) |
| `db` | `postgres:17` | named volume `pgdata` |

Env (compose `.env`, set in Coolify): `POSTGRES_PASSWORD`, `JWT_SECRET` (≥ 32 bytes). `api` reads `DATASOURCES_DEFAULT_URL/USERNAME/PASSWORD` and `MICRONAUT_SECURITY_TOKEN_JWT_SIGNATURES_SECRET_GENERATOR_SECRET`.

`web` is the only published port (`WEB_PORT`, default 3080 — 3000 is commonly taken). Using `node:24` also fixes the current Coolify nixpacks failure (Node 22.11 + npm optional-dep bug).

## API stack

Micronaut 5.1, Java 25, Gradle 9 (Kotlin DSL wrapper from launch.micronaut.io), Lombok for entity accessors. Micronaut Data JPA + Hibernate, Flyway, Micronaut Security JWT, `at.favre.lib:bcrypt`. Tests: Spock, Micronaut Test Resources (auto-provisioned Postgres container).

Package `no.xiulian.api`: `auth/` (controller, `AuthenticationProvider`, `User` entity/repo), `progress/` (controller, service, entities/repos, `ProgressDto`).

## Schema (Flyway `V1__init.sql`)

```sql
users      (id uuid pk default gen_random_uuid(), email text unique not null, password_hash text not null, created_at timestamptz not null default now())
cards      (user_id uuid fk, word_id text, due timestamptz, stability float8, difficulty float8, elapsed_days int, scheduled_days int, reps int, lapses int, state smallint, last_review timestamptz null, learning_steps int, pk (user_id, word_id))
reviews    (user_id uuid fk, reviewed_at timestamptz, pk (user_id, reviewed_at))
lessons    (user_id uuid fk, unit_id text, strength float8, completions int, completed_at timestamptz, pk (user_id, unit_id))
challenges (user_id uuid fk, day date, word_ids text[], attempts int[], pk (user_id, day))
settings   (user_id uuid pk fk, focus text, quiet bool, audio_autoplay bool, new_per_lesson int, dark bool)
```

All fks `on delete cascade`. Email is lower-cased before storage and lookup.

## Endpoints

All under `/api`. JSON. Errors are Micronaut defaults (`401`, `400`, `409`).

| method | path | auth | body → response |
|---|---|---|---|
| `POST` | `/auth/signup` | no | `{email, password}` → `201 {token}`; `409` if email taken; password ≥ 8 chars |
| `POST` | `/auth/login` | no | `{email, password}` → `200 {token}`; `401` on mismatch |
| `GET` | `/me/progress` | bearer | → `Progress` (frontend shape, see below) |
| `PATCH` | `/me/progress` | bearer | partial `Progress`; upserts every key present → `204` |
| `DELETE` | `/me/progress` | bearer | deletes all progress rows for the user (not the account) → `204` |

JWT: HS256, 30-day expiry, subject = user id. No refresh tokens.

`Progress` wire shape equals `store.ts`:

```json
{
  "cards":      { "<wordId>": { "due": "ISO", "stability": 0, "difficulty": 0, "elapsed_days": 0, "scheduled_days": 0, "reps": 0, "lapses": 0, "state": 0, "last_review": "ISO|null", "learning_steps": 0 } },
  "lessons":    { "<unitId>": { "p": 0, "n": 0, "t": 0 } },
  "challenges": { "<yyyy-mm-dd>": { "ids": [], "attempts": [] } },
  "history":    [ 0 ],
  "settings":   { "focus": "pinyin", "quiet": false, "audioAutoplay": true, "newPerLesson": 8, "dark": true }
}
```

PATCH semantics: `cards`/`lessons`/`challenges` entries upsert by key; `history` entries insert-ignore (idempotent); `settings` upserts the single row. Absent keys are untouched. Deleting single entries is not supported (the frontend never does it).

## Frontend

- `src/api.ts` — `fetch` wrapper: base `/api`, bearer from `localStorage['xiulian.token']`, throws on non-2xx; on `401` clears token and redirects to `#/login`.
- `src/sync.ts` — on boot with a token: `GET /me/progress`, revive `Date` fields, assign into `progress`, snapshot. If the account is empty (fresh signup), local progress is kept and pushed instead. Then `watch(progress, deep)` → debounce 1 s → diff against snapshot (per key of each map; `history` = entries beyond snapshot length; `settings` if changed) → `PATCH` delta → snapshot on success. On failure keep the pending delta and retry on the next change. `// ponytail: last-write-wins on load, merge per card by last_review if two devices go offline`.
- `localStorage['xiulian.v1']` remains the offline cache; `store.ts` logic unchanged.
- `src/pages/Login.vue` — email + password, toggle login/signup, stores token, then triggers sync and routes home.
- Router guard: no token → `#/login`. Settings page gets **Log out** (clears token *and* the local cache, so the next account on the device cannot inherit it). Export/import stay; import also PATCHes the imported blob. Reset calls `DELETE` then clears local.
- `nginx.conf`: `location /api/ { proxy_pass http://api:8080/api/; }`, `try_files` not needed (hash router).

## Tests

`api/src/test/groovy` (Spock, Test Resources Postgres):
- `AuthSpec`: signup returns token; duplicate email `409`; wrong password `401`; short password `400`.
- `ProgressSpec`: `GET` without token `401`; `PATCH` then `GET` round-trips cards/lessons/challenges/history/settings; second `PATCH` with same history is idempotent; `DELETE` leaves empty progress and login still works.

Frontend: `scripts/smoke.mjs` gains a signup + lesson run against `docker compose up` and asserts `GET /me/progress` contains the graded cards.

## Deployment

Coolify → new resource → Docker Compose from the GitHub repo (deploy key already configured). Set `POSTGRES_PASSWORD`, `JWT_SECRET`. Expose `web` via Pangolin. Flyway migrates on `api` start.

## Not built (deliberate)

Refresh tokens, email verification, password reset, rate limiting, per-card conflict merge, account deletion, admin. Add when there is a second user.
