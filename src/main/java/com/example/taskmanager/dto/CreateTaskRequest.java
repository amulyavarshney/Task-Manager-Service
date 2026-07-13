package com.example.taskmanager.dto;

import com.example.taskmanager.entity.TaskPriority;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public class CreateTaskRequest {

    @NotBlank(message = "task_name must not be blank")
    @Size(max = 200, message = "task_name must be at most 200 characters")
    private String taskName;

    @Min(value = 1, message = "task_duration must be at least 1 second")
    @Max(value = 86400, message = "task_duration must be at most 86400 seconds (24h)")
    private int taskDuration;

    private TaskPriority priority;

    @Size(max = 20, message = "tags must contain at most 20 items")
    private List<@Size(max = 50, message = "each tag must be at most 50 characters") String> tags;

    @Min(value = 0, message = "max_retries must be >= 0")
    @Max(value = 10, message = "max_retries must be at most 10")
    private int maxRetries = 0;

    private Instant scheduledAt;

    public String getTaskName() { return taskName; }
    public void setTaskName(String taskName) { this.taskName = taskName; }

    public int getTaskDuration() { return taskDuration; }
    public void setTaskDuration(int taskDuration) { this.taskDuration = taskDuration; }

    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public int getMaxRetries() { return maxRetries; }
    public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }
}
