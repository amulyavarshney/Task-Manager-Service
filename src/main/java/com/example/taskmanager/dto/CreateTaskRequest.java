package com.example.taskmanager.dto;

import com.example.taskmanager.entity.TaskPriority;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class CreateTaskRequest {

    @NotBlank(message = "task_name must not be blank")
    private String taskName;

    @Min(value = 1, message = "task_duration must be at least 1 second")
    private int taskDuration;

    private TaskPriority priority;

    private List<String> tags;

    public String getTaskName() { return taskName; }
    public void setTaskName(String taskName) { this.taskName = taskName; }

    public int getTaskDuration() { return taskDuration; }
    public void setTaskDuration(int taskDuration) { this.taskDuration = taskDuration; }

    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
