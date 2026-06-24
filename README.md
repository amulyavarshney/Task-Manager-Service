# Task Manager Service

A Spring Boot REST API that creates tasks, persists them in PostgreSQL, and executes them asynchronously on a bounded thread pool. Each task sleeps for a configured duration before being marked complete.

## Requirements

- Java 17+
- Maven 3.9+
- PostgreSQL running on `localhost:5432`

## Setup

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE taskmanager;"
```

### 2. Configure credentials

Set environment variables before running (no file edits needed):

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=your_password_here
# DB_URL defaults to jdbc:postgresql://localhost:5432/taskmanager
```

Or copy `.env.example` to `.env` and source it. Hibernate will auto-create the `tasks` table on first startup (`ddl-auto=update`).

### 3. Run

```bash
mvn spring-boot:run
```

The server starts on `http://localhost:8080`.

## API

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

`taskStatus` values: `READY` → `IN_PROGRESS` → `DONE`

### Create a task

```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"taskName": "demo", "taskDuration": 10}'
```

### Start a task

```bash
curl -X POST http://localhost:8080/api/tasks/1/start
# Returns immediately with status IN_PROGRESS

curl http://localhost:8080/api/tasks/1
# Poll until status is DONE (after ~10 seconds)
```

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
| 409 | Task is already `IN_PROGRESS` or `DONE` |
| 503 | Thread pool at capacity (max 4 concurrent tasks) |

## Configuration

Key properties in `application.properties`:

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | `8080` | HTTP port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/taskmanager` | DB URL |
| `task.executor.max-pool-size` | `4` | Max concurrent task threads |
| `task.executor.core-pool-size` | `2` | Always-alive threads |
| `task.executor.queue-capacity` | `10` | Pending task queue depth |

## Testing

```bash
mvn test
```

Tests run against an H2 in-memory database (no PostgreSQL needed). 28 tests across:

- `TaskServiceTest` — unit tests for all service methods and edge cases
- `TaskControllerTest` — MockMvc slice tests for all endpoints
- `TaskManagerApplicationTests` — Spring context smoke test

## Architecture

```
controller/   ← REST layer, input validation
service/      ← Business logic, executor management
  TaskService     CRUD + startTask (sets IN_PROGRESS, submits to pool)
  TaskRunner      Runs inside the thread pool; sleeps then sets DONE
repository/   ← Spring Data JPA (PostgreSQL / H2 for tests)
entity/       ← Task JPA entity, TaskStatus enum
dto/          ← CreateTaskRequest (validated), TaskResponse
exception/    ← GlobalExceptionHandler (RFC 7807 ProblemDetail)
config/       ← ThreadPoolTaskExecutor bean (maxPoolSize=4)
```
