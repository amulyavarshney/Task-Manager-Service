package com.example.taskmanager.dto;

import com.example.taskmanager.entity.TaskStatus;

import java.util.EnumMap;
import java.util.Map;

public class TaskStatsResponse {

    private final long total;
    private final Map<TaskStatus, Long> byStatus;

    public TaskStatsResponse(long total, Map<TaskStatus, Long> byStatus) {
        this.total = total;
        this.byStatus = byStatus;
    }

    public static TaskStatsResponse empty() {
        Map<TaskStatus, Long> zeros = new EnumMap<>(TaskStatus.class);
        for (TaskStatus status : TaskStatus.values()) {
            zeros.put(status, 0L);
        }
        return new TaskStatsResponse(0, zeros);
    }

    public long getTotal() {
        return total;
    }

    public Map<TaskStatus, Long> getByStatus() {
        return byStatus;
    }
}
