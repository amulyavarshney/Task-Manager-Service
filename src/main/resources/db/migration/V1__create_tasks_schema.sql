-- Baseline schema for Task Manager Service
CREATE TABLE tasks (
    task_id          BIGSERIAL PRIMARY KEY,
    task_name        VARCHAR(200)  NOT NULL,
    task_duration    INTEGER       NOT NULL,
    task_status      VARCHAR(32)   NOT NULL,
    priority         VARCHAR(32)   NOT NULL,
    created_at       TIMESTAMPTZ   NOT NULL,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    result_message   VARCHAR(500),
    max_retries      INTEGER       NOT NULL DEFAULT 0,
    retry_count      INTEGER       NOT NULL DEFAULT 0,
    scheduled_at     TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ,
    version          BIGINT
);

CREATE TABLE task_tags (
    task_id BIGINT NOT NULL REFERENCES tasks (task_id) ON DELETE CASCADE,
    tag     VARCHAR(50)
);

CREATE INDEX idx_tasks_deleted_at ON tasks (deleted_at);
CREATE INDEX idx_tasks_status ON tasks (task_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_scheduled ON tasks (task_status, scheduled_at)
    WHERE deleted_at IS NULL AND scheduled_at IS NOT NULL;
CREATE INDEX idx_task_tags_tag ON task_tags (tag);
