package com.example.taskmanager.controller;

import com.example.taskmanager.dto.BulkActionResponse;
import com.example.taskmanager.dto.BulkIdsRequest;
import com.example.taskmanager.dto.CreateTaskRequest;
import com.example.taskmanager.dto.PagedTaskResponse;
import com.example.taskmanager.dto.TaskResponse;
import com.example.taskmanager.dto.TaskStatsResponse;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/tasks")
    public ResponseEntity<PagedTaskResponse> getAllTasks(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tag,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(taskService.getTasksPaged(pageable, status, priority, search, tag));
    }

    @GetMapping("/tasks/stats")
    public ResponseEntity<TaskStatsResponse> getTaskStats() {
        return ResponseEntity.ok(taskService.getTaskStats());
    }

    @GetMapping("/tasks/history")
    public ResponseEntity<PagedTaskResponse> getTaskHistory(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tag,
            @PageableDefault(size = 20, sort = "deletedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(taskService.getTaskHistory(pageable, status, priority, search, tag));
    }

    @PostMapping("/tasks/bulk/start")
    public ResponseEntity<BulkActionResponse> bulkStart(@Valid @RequestBody BulkIdsRequest request) {
        return ResponseEntity.ok(taskService.bulkStart(request.getIds()));
    }

    @PostMapping("/tasks/bulk/delete")
    public ResponseEntity<BulkActionResponse> bulkDelete(@Valid @RequestBody BulkIdsRequest request) {
        return ResponseEntity.ok(taskService.bulkDelete(request.getIds()));
    }

    @GetMapping("/tasks/{id}")
    public ResponseEntity<TaskResponse> getTask(@PathVariable Long id) {
        return ResponseEntity.ok(TaskResponse.from(taskService.getTaskById(id)));
    }

    @PostMapping("/tasks")
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(TaskResponse.from(taskService.createTask(request)));
    }

    @PutMapping("/tasks/{id}")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.ok(TaskResponse.from(taskService.updateTask(id, request)));
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/tasks/{id}/start")
    public ResponseEntity<TaskResponse> startTask(@PathVariable Long id) {
        return ResponseEntity.ok(TaskResponse.from(taskService.startTask(id)));
    }

    @PostMapping("/tasks/{id}/cancel")
    public ResponseEntity<TaskResponse> cancelTask(@PathVariable Long id) {
        return ResponseEntity.ok(TaskResponse.from(taskService.cancelTask(id)));
    }

    @PostMapping("/tasks/{id}/reset")
    public ResponseEntity<TaskResponse> resetTask(@PathVariable Long id) {
        return ResponseEntity.ok(TaskResponse.from(taskService.resetTask(id)));
    }

    @DeleteMapping("/tasks/{id}/purge")
    public ResponseEntity<Void> purgeTask(@PathVariable Long id) {
        taskService.purgeTask(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/executor/stats")
    public ResponseEntity<Map<String, Object>> getExecutorStats() {
        return ResponseEntity.ok(taskService.getExecutorStats());
    }
}
