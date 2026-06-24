package com.example.taskmanager.dto;

import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskStatus;

public class TaskResponse {

    private Long taskId;
    private String taskName;
    private int taskDuration;
    private TaskStatus taskStatus;

    public static TaskResponse from(Task task) {
        TaskResponse r = new TaskResponse();
        r.taskId = task.getTaskId();
        r.taskName = task.getTaskName();
        r.taskDuration = task.getTaskDuration();
        r.taskStatus = task.getTaskStatus();
        return r;
    }

    public Long getTaskId() { return taskId; }
    public String getTaskName() { return taskName; }
    public int getTaskDuration() { return taskDuration; }
    public TaskStatus getTaskStatus() { return taskStatus; }
}
