package com.example.taskmanager.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public class BulkIdsRequest {

    @NotEmpty(message = "ids must not be empty")
    @Size(max = 50, message = "ids must contain at most 50 items")
    private List<Long> ids;

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }
}
