# Task Manager Service

A Spring Boot REST API + React frontend for creating, managing, and asynchronously executing tasks. Tasks are persisted in PostgreSQL and run on a bounded thread pool; a Vite/React UI lets you manage them in the browser.

## Project Structure

```
Task-Manager-Service/
├── src/                     # Spring Boot backend
│   └── main/
│       ├── java/.../config/ # Executor, CORS, metrics
│       └── resources/
│           ├── application*.properties
│           └── db/migration/  # Flyway SQL
├── frontend/                # React + Vite + TypeScript UI
├── Dockerfile               # API image
├── docker-compose.yml       # Postgres + API + nginx UI
├── .github/workflows/ci.yml
├── pom.xml
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
| `DELETE` | `/api/tasks/{id}` | Soft-delete a task | 204 | 404 |
| `DELETE` | `/api/tasks/{id}/purge` | Hard-delete a task | 204 | 404 |
| `POST` | `/api/tasks/{id}/start` | Start async execution | 200 | 404, 409, 503 |
| `POST` | `/api/tasks/{id}/reset` | Reset FAILED/DONE → READY | 200 | 404, 409 |
| `GET` | `/api/executor/stats` | Thread pool metrics | 200 | — |

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
| 404 | Task ID not found |
| 409 | Invalid state (start non-READY, reset non-FAILED/DONE, optimistic lock) |
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

Profiles: `dev` (SQL logging), `prod` (structured JSON logs, stricter health).

## Testing

```bash
mvn test
```

Tests run against an H2 in-memory database (no PostgreSQL needed). Coverage includes:

- `TaskServiceTest` — unit tests for service methods (create, update, reset, stats, start)
- `TaskControllerTest` — MockMvc slice tests for endpoints and filters
- `TaskRunnerTest` — async completion, interruption, and retry behavior
- `TaskManagerApplicationTests` — Spring context smoke test

## License

MIT — see [LICENSE](LICENSE).
