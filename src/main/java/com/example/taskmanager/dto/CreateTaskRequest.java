package com.example.taskmanager.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class CreateTaskRequest {

    @NotBlank(message = "task_name must not be blank")
    private String taskName;

    @Min(value = 1, message = "task_duration must be at least 1 second")
    private int taskDuration;

    public String getTaskName() { return taskName; }
    public void setTaskName(String taskName) { this.taskName = taskName; }

    public int getTaskDuration() { return taskDuration; }
    public void setTaskDuration(int taskDuration) { this.taskDuration = taskDuration; }
}
