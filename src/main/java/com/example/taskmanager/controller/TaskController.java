package com.example.taskmanager.controller;

import com.example.taskmanager.dto.CreateTaskRequest;
import com.example.taskmanager.dto.PagedTaskResponse;
import com.example.taskmanager.dto.TaskResponse;
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
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(taskService.getTasksPaged(pageable));
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

    @GetMapping("/tasks/history")
    public ResponseEntity<PagedTaskResponse> getTaskHistory(
            @PageableDefault(size = 20, sort = "deletedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(taskService.getTaskHistory(pageable));
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
