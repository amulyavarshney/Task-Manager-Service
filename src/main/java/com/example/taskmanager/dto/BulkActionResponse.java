package com.example.taskmanager.dto;

import java.util.ArrayList;
import java.util.List;

public class BulkActionResponse {

    private final List<Long> succeeded = new ArrayList<>();
    private final List<BulkFailure> failed = new ArrayList<>();

    public void addSuccess(Long id) {
        succeeded.add(id);
    }

    public void addFailure(Long id, String reason) {
        failed.add(new BulkFailure(id, reason));
    }

    public List<Long> getSucceeded() {
        return succeeded;
    }

    public List<BulkFailure> getFailed() {
        return failed;
    }

    public record BulkFailure(Long id, String reason) {}
}
