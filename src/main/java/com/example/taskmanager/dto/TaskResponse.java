package com.example.taskmanager.dto;

import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;

import java.time.Instant;
import java.util.List;

public class TaskResponse {

    private Long taskId;
    private String taskName;
    private int taskDuration;
    private TaskStatus taskStatus;
    private TaskPriority priority;
    private List<String> tags;
    private Instant createdAt;
    private Instant startedAt;
    private Instant completedAt;
    private String resultMessage;
    private int maxRetries;
    private int retryCount;

    public static TaskResponse from(Task task) {
        TaskResponse r = new TaskResponse();
        r.taskId = task.getTaskId();
        r.taskName = task.getTaskName();
        r.taskDuration = task.getTaskDuration();
        r.taskStatus = task.getTaskStatus();
        r.priority = task.getPriority();
        r.tags = task.getTags();
        r.createdAt = task.getCreatedAt();
        r.startedAt = task.getStartedAt();
        r.completedAt = task.getCompletedAt();
        r.resultMessage = task.getResultMessage();
        r.maxRetries = task.getMaxRetries();
        r.retryCount = task.getRetryCount();
        return r;
    }

    public Long getTaskId() { return taskId; }
    public String getTaskName() { return taskName; }
    public int getTaskDuration() { return taskDuration; }
    public TaskStatus getTaskStatus() { return taskStatus; }
    public TaskPriority getPriority() { return priority; }
    public List<String> getTags() { return tags; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public String getResultMessage() { return resultMessage; }
    public int getMaxRetries() { return maxRetries; }
    public int getRetryCount() { return retryCount; }
}
