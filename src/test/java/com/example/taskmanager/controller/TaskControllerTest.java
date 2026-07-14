package com.example.taskmanager.controller;

import com.example.taskmanager.dto.CreateTaskRequest;
import com.example.taskmanager.dto.PagedTaskResponse;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.exception.GlobalExceptionHandler;
import com.example.taskmanager.exception.TaskAlreadyRunningException;
import com.example.taskmanager.exception.TaskNotFoundException;
import com.example.taskmanager.service.TaskService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.concurrent.RejectedExecutionException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class TaskControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean TaskService taskService;

    // ── GET /api/tasks ────────────────────────────────────────────────────────

    @Test
    void getAllTasks_returns200WithPagedContent() throws Exception {
        List<Task> tasks = List.of(
            task(1L, "a", 10, TaskStatus.READY),
            task(2L, "b", 20, TaskStatus.DONE)
        );
        PagedTaskResponse paged = new PagedTaskResponse(
            new PageImpl<>(tasks, PageRequest.of(0, 20), 2)
        );
        when(taskService.getTasksPaged(any(), any(), any(), any(), any())).thenReturn(paged);

        mockMvc.perform(get("/api/tasks"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(2))
            .andExpect(jsonPath("$.content[0].taskId").value(1))
            .andExpect(jsonPath("$.content[1].taskStatus").value("DONE"))
            .andExpect(jsonPath("$.totalElements").value(2))
            .andExpect(jsonPath("$.totalPages").value(1))
            .andExpect(jsonPath("$.page").value(0));
    }

    @Test
    void getAllTasks_returns200WithEmptyPage_whenNoTasks() throws Exception {
        PagedTaskResponse empty = new PagedTaskResponse(
            new PageImpl<>(List.of(), PageRequest.of(0, 20), 0)
        );
        when(taskService.getTasksPaged(any(), any(), any(), any(), any())).thenReturn(empty);

        mockMvc.perform(get("/api/tasks?page=0&size=20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(0))
            .andExpect(jsonPath("$.totalElements").value(0));
    }

    // ── GET /api/tasks/{id} ───────────────────────────────────────────────────

    @Test
    void getTask_returns200_whenFound() throws Exception {
        when(taskService.getTaskById(1L)).thenReturn(task(1L, "x", 5, TaskStatus.READY));

        mockMvc.perform(get("/api/tasks/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskName").value("x"))
            .andExpect(jsonPath("$.taskStatus").value("READY"));
    }

    @Test
    void getTask_returns404_whenNotFound() throws Exception {
        when(taskService.getTaskById(99L)).thenThrow(new TaskNotFoundException(99L));

        mockMvc.perform(get("/api/tasks/99"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.detail").value("Task not found with id: 99"));
    }

    // ── POST /api/tasks ───────────────────────────────────────────────────────

    @Test
    void createTask_returns201_withValidBody() throws Exception {
        when(taskService.createTask(any())).thenReturn(task(1L, "new", 15, TaskStatus.READY));

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("new", 15)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.taskId").value(1))
            .andExpect(jsonPath("$.taskStatus").value("READY"));
    }

    @Test
    void createTask_returns400_whenNameIsBlank() throws Exception {
        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("", 10)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.detail").value("task_name must not be blank"));
    }

    @Test
    void createTask_returns400_whenDurationIsZero() throws Exception {
        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("valid", 0)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.detail").value("task_duration must be at least 1 second"));
    }

    // ── PUT /api/tasks/{id} ───────────────────────────────────────────────────

    @Test
    void updateTask_returns200_withValidBody() throws Exception {
        when(taskService.updateTask(eq(1L), any())).thenReturn(task(1L, "updated", 99, TaskStatus.READY));

        mockMvc.perform(put("/api/tasks/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("updated", 99)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskName").value("updated"));
    }

    @Test
    void updateTask_returns404_whenNotFound() throws Exception {
        when(taskService.updateTask(eq(5L), any())).thenThrow(new TaskNotFoundException(5L));

        mockMvc.perform(put("/api/tasks/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("x", 1)))
            .andExpect(status().isNotFound());
    }

    // ── DELETE /api/tasks/{id} ────────────────────────────────────────────────

    @Test
    void deleteTask_returns204_whenExists() throws Exception {
        doNothing().when(taskService).deleteTask(1L);

        mockMvc.perform(delete("/api/tasks/1"))
            .andExpect(status().isNoContent());
    }

    @Test
    void deleteTask_returns404_whenNotFound() throws Exception {
        doThrow(new TaskNotFoundException(3L)).when(taskService).deleteTask(3L);

        mockMvc.perform(delete("/api/tasks/3"))
            .andExpect(status().isNotFound());
    }

    // ── POST /api/tasks/{id}/start ────────────────────────────────────────────

    @Test
    void startTask_returns200_withInProgressStatus() throws Exception {
        when(taskService.startTask(1L)).thenReturn(task(1L, "run", 5, TaskStatus.IN_PROGRESS));

        mockMvc.perform(post("/api/tasks/1/start"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskStatus").value("IN_PROGRESS"));
    }

    @Test
    void startTask_returns404_whenNotFound() throws Exception {
        when(taskService.startTask(9L)).thenThrow(new TaskNotFoundException(9L));

        mockMvc.perform(post("/api/tasks/9/start"))
            .andExpect(status().isNotFound());
    }

    @Test
    void startTask_returns409_whenAlreadyRunning() throws Exception {
        when(taskService.startTask(1L)).thenThrow(new TaskAlreadyRunningException(1L));

        mockMvc.perform(post("/api/tasks/1/start"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.detail").value("Task 1 is not in READY status and cannot be started."));
    }

    @Test
    void startTask_returns503_whenPoolFull() throws Exception {
        when(taskService.startTask(1L)).thenThrow(new RejectedExecutionException());

        mockMvc.perform(post("/api/tasks/1/start"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.detail").value("Thread pool is at capacity. Please retry later."));
    }

    // ── POST /api/tasks/{id}/reset ────────────────────────────────────────────

    @Test
    void resetTask_returns200_withReadyStatus() throws Exception {
        when(taskService.resetTask(1L)).thenReturn(task(1L, "retry", 5, TaskStatus.READY));

        mockMvc.perform(post("/api/tasks/1/reset"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskStatus").value("READY"));
    }

    @Test
    void cancelTask_returns200() throws Exception {
        when(taskService.cancelTask(1L)).thenReturn(task(1L, "run", 5, TaskStatus.IN_PROGRESS));

        mockMvc.perform(post("/api/tasks/1/cancel"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskStatus").value("IN_PROGRESS"));
    }

    @Test
    void bulkStart_returns200() throws Exception {
        com.example.taskmanager.dto.BulkActionResponse response =
            new com.example.taskmanager.dto.BulkActionResponse();
        response.addSuccess(1L);
        response.addFailure(2L, "not ready");
        when(taskService.bulkStart(any())).thenReturn(response);

        mockMvc.perform(post("/api/tasks/bulk/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":[1,2]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.succeeded[0]").value(1))
            .andExpect(jsonPath("$.failed[0].id").value(2));
    }

    @Test
    void resetTask_returns409_whenInvalidState() throws Exception {
        when(taskService.resetTask(1L))
            .thenThrow(new com.example.taskmanager.exception.TaskInvalidStateException(
                "Task 1 must be FAILED or DONE to reset (current: IN_PROGRESS)"));

        mockMvc.perform(post("/api/tasks/1/reset"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("must be FAILED or DONE")));
    }

    // ── GET /api/tasks/stats ──────────────────────────────────────────────────

    @Test
    void getTaskStats_returns200() throws Exception {
        java.util.Map<TaskStatus, Long> byStatus = new java.util.EnumMap<>(TaskStatus.class);
        byStatus.put(TaskStatus.READY, 2L);
        byStatus.put(TaskStatus.IN_PROGRESS, 1L);
        byStatus.put(TaskStatus.DONE, 0L);
        byStatus.put(TaskStatus.FAILED, 0L);
        when(taskService.getTaskStats())
            .thenReturn(new com.example.taskmanager.dto.TaskStatsResponse(3, byStatus));

        mockMvc.perform(get("/api/tasks/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.byStatus.READY").value(2))
            .andExpect(jsonPath("$.byStatus.IN_PROGRESS").value(1));
    }

    // ── GET /api/tasks?status= ────────────────────────────────────────────────

    @Test
    void getAllTasks_passesFiltersToService() throws Exception {
        PagedTaskResponse empty = new PagedTaskResponse(
            new PageImpl<>(List.of(), PageRequest.of(0, 20), 0)
        );
        when(taskService.getTasksPaged(any(), eq(TaskStatus.READY), any(), eq("build"), any()))
            .thenReturn(empty);

        mockMvc.perform(get("/api/tasks?status=READY&search=build"))
            .andExpect(status().isOk());

        verify(taskService).getTasksPaged(any(), eq(TaskStatus.READY), any(), eq("build"), any());
    }

    // ── GET /api/tasks/history ────────────────────────────────────────────────

    @Test
    void getHistory_returns200WithDeletedTasks() throws Exception {
        Task deleted = task(5L, "old", 10, TaskStatus.DONE);
        deleted.setDeletedAt(java.time.Instant.now());
        PagedTaskResponse paged = new PagedTaskResponse(
            new org.springframework.data.domain.PageImpl<>(
                java.util.List.of(deleted),
                org.springframework.data.domain.PageRequest.of(0, 20), 1)
        );
        when(taskService.getTaskHistory(any(), any(), any(), any(), any())).thenReturn(paged);

        mockMvc.perform(get("/api/tasks/history"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].taskId").value(5))
            .andExpect(jsonPath("$.totalElements").value(1));
    }

    // ── DELETE /api/tasks/{id}/purge ──────────────────────────────────────────

    @Test
    void purgeTask_returns204() throws Exception {
        doNothing().when(taskService).purgeTask(1L);

        mockMvc.perform(delete("/api/tasks/1/purge"))
            .andExpect(status().isNoContent());
    }

    @Test
    void purgeTask_returns404_whenNotFound() throws Exception {
        doThrow(new TaskNotFoundException(99L)).when(taskService).purgeTask(99L);

        mockMvc.perform(delete("/api/tasks/99/purge"))
            .andExpect(status().isNotFound());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static Task task(Long id, String name, int duration, TaskStatus status) {
        Task t = new Task(name, duration, null, null);
        t.setTaskId(id);
        t.setTaskStatus(status);
        return t;
    }

    private String json(String name, int duration) throws Exception {
        CreateTaskRequest r = new CreateTaskRequest();
        r.setTaskName(name);
        r.setTaskDuration(duration);
        return objectMapper.writeValueAsString(r);
    }
}
