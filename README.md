# Task Manager Service

A Spring Boot REST API + React frontend for creating, managing, and asynchronously executing tasks. Tasks are persisted in PostgreSQL and run on a bounded thread pool; a Vite/React UI lets you manage them in the browser.

## Live demo

**https://amulyavarshney.github.io/Task-Manager-Service/**

The published site runs in **demo mode**: the full task lifecycle (create, edit, run, cancel, reset, bulk actions, history, scheduling, executor stats) works in the browser via `localStorage` — no backend required.

## Project Structure

```
Task-Manager-Service/
├── src/                     # Spring Boot backend
│   └── main/
│       ├── java/.../config/ # Executor, CORS, metrics, security, OpenAPI
│       └── resources/
│           ├── application*.properties
│           └── db/migration/  # Flyway SQL
├── frontend/                # React + Vite + TypeScript UI (demo + live API)
├── Dockerfile               # API image
├── docker-compose.yml       # Postgres + API + nginx UI
├── .github/workflows/       # CI + GitHub Pages deploy
├── pom.xml
├── README.md
└── .env.example
```

## Requirements

### Backend
- Java 17+
- Maven 3.9+
- PostgreSQL running on `localhost:5432` (or use Docker Compose)

### Frontend
- Node.js 18+
- npm 9+

## Setup

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env   # set DB_PASSWORD
docker compose up --build
# UI:  http://localhost:8088
# API: http://localhost:8080
# Health: http://localhost:8080/actuator/health
```

### Option B — Local processes

#### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE taskmanager;"
```

#### 2. Configure credentials

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=your_password_here
# DB_URL defaults to jdbc:postgresql://localhost:5432/taskmanager
```

Or copy `.env.example` to `.env` and source it. Flyway applies `V1__create_tasks_schema.sql` on startup (`ddl-auto=validate`).

If you already have tables from an older Hibernate `ddl-auto=update` install, `spring.flyway.baseline-on-migrate=true` baselines the schema so Flyway does not re-run V1.

#### 3. Run the backend

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
# API available at http://localhost:8080
# Actuator: /actuator/health, /actuator/metrics
```

Production profile (structured JSON logs):

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

#### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:5173 (proxies /api → :8080)
```

Open `http://localhost:5173` in your browser to use the app.

Demo-only UI (no backend):

```bash
cd frontend
VITE_DEMO_MODE=true npm run dev
```

## Frontend Features

- **Task grid** — status badges (Ready / In Progress / Done / Failed), priority, tags
- **Create & edit** — modal with duration, priority, tags, retries, scheduling
- **Run / reset** — start READY tasks; reset FAILED or DONE back to READY
- **Server-side filter & search** — status filter and name/tag search across all pages
- **Stats bar** — global counts per status (not page-local)
- **History** — soft-deleted tasks with permanent purge
- **Dark mode**, keyboard shortcuts, templates, executor panel

## API Reference

| Method | Endpoint | Description | Success | Errors |
|--------|----------|-------------|---------|--------|
| `GET` | `/api/tasks` | List active tasks (paged; optional `status`, `priority`, `search`, `tag`) | 200 | 400 |
| `GET` | `/api/tasks/stats` | Global active-task counts by status | 200 | — |
| `GET` | `/api/tasks/history` | List soft-deleted tasks (same filters) | 200 | 400 |
| `GET` | `/api/tasks/{id}` | Get a task | 200 | 404 |
| `POST` | `/api/tasks` | Create a task | 201 | 400 |
| `PUT` | `/api/tasks/{id}` | Update task fields (incl. `maxRetries`) | 200 | 400, 404, 409 |
| `DELETE` | `/api/tasks/{id}` | Soft-delete a task | 204 | 401, 403, 404 |
| `DELETE` | `/api/tasks/{id}/purge` | Hard-delete a task | 204 | 401, 403, 404 |
| `POST` | `/api/tasks/{id}/start` | Start async execution | 200 | 401, 403, 404, 409, 503 |
| `POST` | `/api/tasks/{id}/cancel` | Cancel an `IN_PROGRESS` task | 200 | 401, 403, 404, 409 |
| `POST` | `/api/tasks/{id}/reset` | Reset FAILED/DONE → READY | 200 | 401, 403, 404, 409 |
| `POST` | `/api/tasks/bulk/start` | Start many tasks (`{ "ids": [...] }`) | 200 | 401, 403, 400 |
| `POST` | `/api/tasks/bulk/delete` | Soft-delete many tasks | 200 | 401, 403, 400 |
| `GET` | `/api/executor/stats` | Thread pool metrics | 200 | 401, 403 |

### Authentication

All `/api/**` routes require header `X-API-Key` when `app.security.enabled=true` (default).

| Key env var | Role | Access |
|-------------|------|--------|
| `API_KEY_ADMIN` (default `dev-admin-key`) | ADMIN | Full read/write |
| `API_KEY_VIEWER` (default `dev-viewer-key`) | VIEWER | GET only |

`/actuator/health` remains public. Other actuator endpoints require ADMIN. Rate limit: `RATE_LIMIT_PER_MINUTE` (default 120) → HTTP 429.

### Task object

```json
{
  "taskId": 1,
  "taskName": "my-task",
  "taskDuration": 10,
  "taskStatus": "READY",
  "priority": "MEDIUM",
  "tags": ["ops"],
  "maxRetries": 2,
  "retryCount": 0,
  "scheduledAt": null,
  "deletedAt": null
}
```

`taskStatus` lifecycle: `READY` → `IN_PROGRESS` → `DONE` | `FAILED` (reset → `READY`)

### Error responses (RFC 7807)

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Task 1 is not in READY status and cannot be started."
}
```

| Status | Cause |
|--------|-------|
| 400 | Validation failure (blank name, duration bounds, etc.) |
| 401 | Missing/invalid API key |
| 403 | Viewer attempted a write |
| 404 | Task ID not found |
| 409 | Invalid state (start non-READY, reset/cancel wrong status, optimistic lock) |
| 429 | Rate limit exceeded |
| 503 | Thread pool at capacity |

## Configuration

Key properties in `src/main/resources/application.properties`:

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | `8080` | HTTP port |
| `server.shutdown` | `graceful` | Drain in-flight HTTP requests |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/taskmanager` | DB URL |
| `spring.jpa.hibernate.ddl-auto` | `validate` | Schema owned by Flyway |
| `app.cors.allowed-origins` | `http://localhost:5173,...` | CORS allow-list (`CORS_ALLOWED_ORIGINS`) |
| `app.security.enabled` | `true` | Require `X-API-Key` |
| `app.security.api-keys.admin` | `dev-admin-key` | Admin API key |
| `app.security.api-keys.viewer` | `dev-viewer-key` | Viewer API key |
| `app.security.rate-limit-per-minute` | `120` | Per-key/IP request budget |
| `task.executor.core-pool-size` | `2` | Always-alive threads |
| `task.executor.max-pool-size` | `4` | Max concurrent task threads |
| `task.executor.queue-capacity` | `10` | Pending task queue depth |
| `task.scheduler.interval-ms` | `30000` | Auto-start poll interval |

### Ops endpoints

| Path | Purpose |
|------|---------|
| `/actuator/health` | Aggregate health |
| `/actuator/health/liveness` | Liveness probe |
| `/actuator/health/readiness` | Readiness probe |
| `/actuator/metrics` | Micrometer metrics (incl. `taskmanager.executor.*`) |
| `/swagger-ui.html` | Interactive OpenAPI docs |

Profiles: `dev` (SQL logging), `prod` (structured JSON logs, stricter health).

## Testing

### Backend

```bash
mvn test
# Optional PostgreSQL integration (requires Docker):
RUN_TESTCONTAINERS=true mvn -Dtest=TaskIntegrationTest test
```

Unit/slice tests use H2. Coverage includes service, controller, runner, and API-key security tests.

OpenAPI UI (when API is running): http://localhost:8080/swagger-ui.html

### Frontend

```bash
cd frontend
npm test          # Vitest unit tests
npm run test:e2e  # Playwright (API + UI must be running)
```

## GitHub Pages demo

Pushes to `main` build the frontend with `VITE_DEMO_MODE=true` and deploy via [Deploy GitHub Pages](.github/workflows/deploy-pages.yml).

| Item | Value |
|------|-------|
| URL | https://amulyavarshney.github.io/Task-Manager-Service/ |
| Source | GitHub Actions → Pages |
| Base path | `/Task-Manager-Service/` |

Enable once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Local preview of the published build:

```bash
cd frontend
VITE_DEMO_MODE=true VITE_BASE_PATH=/Task-Manager-Service/ npm run build
npx serve dist -s
```

## License

MIT — see [LICENSE](LICENSE).
