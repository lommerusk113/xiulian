# Backend, accounts and sync — implementation plan

Spec: `docs/superpowers/specs/2026-08-25-backend-sync-design.md`. Executed directly in-session (user asked to start); tasks are commit boundaries.

**Goal:** Micronaut + Postgres backend with JWT accounts; frontend syncs `Progress` to it.

**Tech:** Micronaut 5.1 (Java 21, Gradle Kotlin DSL), Micronaut Data JPA/Hibernate, Flyway, Security JWT, `at.favre.lib:bcrypt`, Spock + Test Resources; Vue 3 frontend; Docker Compose (nginx, api, postgres:17).

## Tasks

### 1. API scaffold + schema
- Create `api/` from launch.micronaut.io (data-jpa, flyway, postgres, security-jwt, test-resources, validation, spock). Strip AOT/GraalVM blocks, add bcrypt dep.
- `api/src/main/resources/db/migration/V1__init.sql` — tables from spec.
- `application.properties`: bearer auth, JWT secret from `JWT_SECRET`, 30-day expiry.
- Verify: `cd api && ./gradlew test` — scaffold `ApiSpec` boots against Test Resources Postgres and Flyway migrates.

### 2. Auth
- `no.xiulian.auth`: `UserEntity`, `UserRepository`, `Credentials`, `TokenResponse`, `AuthController` (`POST /api/auth/signup|login`).
- Test `AuthSpec`: signup → 201 token; dup email → 409; wrong password → 401; short password → 400.
- Verify: `./gradlew test --tests '*AuthSpec'`.

### 3. Progress
- `no.xiulian.progress`: entities `CardEntity`, `ReviewEntity`, `LessonEntity`, `ChallengeEntity`, `SettingsEntity` (+ embedded ids), repositories, DTOs `ProgressDto/CardDto/LessonDto/ChallengeDto/SettingsDto`, `ProgressService` (get / patch-upsert / delete), `ProgressController` (`GET|PATCH|DELETE /api/me/progress`).
- Test `ProgressSpec`: 401 without token; PATCH→GET round-trip; idempotent history; DELETE empties.
- Verify: `./gradlew test`.

### 4. Frontend auth + sync
- `src/api.ts` (fetch + bearer, 401 → `#/login`), `src/sync.ts` (hydrate on boot, debounced diff → PATCH, retry on next change), `src/pages/Login.vue`, route + guard in `routes.ts`/`main.ts`, Settings: log out, reset → DELETE, import → PATCH.
- Verify: `npm run build`; manual: `npm run dev` with api running, sign up, grade a word, see row in `cards`.

### 5. Containers
- Root `Dockerfile` (node:24-alpine build → nginx:alpine), `nginx.conf`, `.dockerignore`, `api/Dockerfile` (gradle shadowJar → temurin 21 jre), `docker-compose.yaml`, `.env.example`.
- Verify: `docker compose up --build`, `curl -X POST localhost/api/auth/signup`, open `http://localhost`.

### 6. Smoke + docs
- `scripts/smoke.mjs`: sign up via API before the lesson, assert `GET /me/progress` has graded cards after.
- README deploy section (Coolify compose, env vars, Pangolin). Update design spec "Not built" line.
