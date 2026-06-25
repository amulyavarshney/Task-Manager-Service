# Task Manager Service

A Spring Boot REST API + React frontend for creating, managing, and asynchronously executing tasks. Tasks are persisted in PostgreSQL and run on a bounded thread pool; a Vite/React UI lets you manage them in the browser.

## Project Structure

```
Task-Manager-Service/
├── src/                     # Spring Boot backend
│   └── main/java/com/example/taskmanager/
│       ├── controller/      # REST endpoints
│       ├── service/         # Business logic & async executor
│       ├── entity/          # Task JPA entity, TaskStatus enum
│       ├── repository/      # Spring Data JPA
│       ├── dto/             # Request/response DTOs
│       ├── exception/       # RFC 7807 error handling
│       └── config/          # Thread pool configuration
├── frontend/                # React + Vite + TypeScript UI
│   └── src/
│       ├── api.ts           # Typed API client
│       ├── types.ts         # Shared TypeScript types
│       ├── App.tsx          # Main page (task grid, filters, polling)
│       └── components/      # TaskCard, TaskFormModal, StatusBadge, StatsBar
├── pom.xml
└── .env.example
```

## Requirements

### Backend
- Java 17+
- Maven 3.9+
- PostgreSQL running on `localhost:5432`

### Frontend
- Node.js 18+
- npm 9+

## Setup

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE taskmanager;"
```

### 2. Configure credentials

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=your_password_here
# DB_URL defaults to jdbc:postgresql://localhost:5432/taskmanager
```

Or copy `.env.example` to `.env` and source it. Hibernate will auto-create the `tasks` table on first startup.

### 3. Run the backend

```bash
mvn spring-boot:run
# API available at http://localhost:8080
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:5173 (proxies /api → :8080)
```

Open `http://localhost:5173` in your browser to use the app.

## Frontend Features

- **Task grid** — view all tasks with status badges (Ready / In Progress / Done)
- **Create & edit** — modal form with name and duration inputs
- **Run tasks** — one-click async execution; UI auto-polls every 2s until completion
- **Filter & search** — filter by status, search by name
- **Stats bar** — live counts per status

## API Reference

| Method | Endpoint | Description | Success | Errors |
|--------|----------|-------------|---------|--------|
| `GET` | `/api/tasks` | List all tasks | 200 | — |
| `GET` | `/api/tasks/{id}` | Get a task | 200 | 404 |
| `POST` | `/api/tasks` | Create a task | 201 | 400 |
| `PUT` | `/api/tasks/{id}` | Update name/duration | 200 | 400, 404 |
| `DELETE` | `/api/tasks/{id}` | Delete a task | 204 | 404 |
| `POST` | `/api/tasks/{id}/start` | Start async execution | 200 | 404, 409, 503 |

### Task object

```json
{
  "taskId": 1,
  "taskName": "my-task",
  "taskDuration": 10,
  "taskStatus": "READY"
}
```

`taskStatus` lifecycle: `READY` → `IN_PROGRESS` → `DONE`

### Error responses (RFC 7807)

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Task 1 is already IN_PROGRESS or DONE and cannot be started again.",
  "instance": "/api/tasks/1/start"
}
```

| Status | Cause |
|--------|-------|
| 400 | Blank task name or duration < 1 |
| 404 | Task ID not found |
| 409 | Task already `IN_PROGRESS` or `DONE` |
| 503 | Thread pool at capacity (max 4 concurrent tasks) |

## Configuration

Key properties in `src/main/resources/application.properties`:

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | `8080` | HTTP port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/taskmanager` | DB URL |
| `task.executor.core-pool-size` | `2` | Always-alive threads |
| `task.executor.max-pool-size` | `4` | Max concurrent task threads |
| `task.executor.queue-capacity` | `10` | Pending task queue depth |

## Testing

```bash
mvn test
```

Tests run against an H2 in-memory database (no PostgreSQL needed). 28 tests across:

- `TaskServiceTest` — unit tests for all service methods and edge cases
- `TaskControllerTest` — MockMvc slice tests for all endpoints
- `TaskManagerApplicationTests` — Spring context smoke test

## License

MIT — see [LICENSE](LICENSE).
