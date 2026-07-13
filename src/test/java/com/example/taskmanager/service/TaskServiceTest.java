package com.example.taskmanager.service;

import com.example.taskmanager.dto.CreateTaskRequest;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.exception.TaskAlreadyRunningException;
import com.example.taskmanager.exception.TaskNotFoundException;
import com.example.taskmanager.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.RejectedExecutionException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock TaskRepository taskRepository;
    @Mock TaskRunner taskRunner;
    @Mock ThreadPoolTaskExecutor taskExecutor;

    TaskService taskService;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, taskRunner, taskExecutor);
    }

    // ── createTask ────────────────────────────────────────────────────────────

    @Test
    void createTask_savesTaskWithReadyStatus() {
        CreateTaskRequest req = request("build", 30);
        Task saved = taskWithId(1L, "build", 30, TaskStatus.READY);
        when(taskRepository.save(any())).thenReturn(saved);

        Task result = taskService.createTask(req);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertThat(captor.getValue().getTaskStatus()).isEqualTo(TaskStatus.READY);
        assertThat(result.getTaskId()).isEqualTo(1L);
    }

    // ── getAllTasks ───────────────────────────────────────────────────────────

    @Test
    void getAllTasks_returnsAllFromRepository() {
        List<Task> tasks = List.of(
            taskWithId(1L, "a", 10, TaskStatus.READY),
            taskWithId(2L, "b", 20, TaskStatus.DONE)
        );
        when(taskRepository.findByDeletedAtIsNull()).thenReturn(tasks);

        assertThat(taskService.getAllTasks()).hasSize(2);
    }

    // ── getTaskById ───────────────────────────────────────────────────────────

    @Test
    void getTaskById_returnsTask_whenFound() {
        Task task = taskWithId(1L, "x", 5, TaskStatus.READY);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));

        assertThat(taskService.getTaskById(1L).getTaskId()).isEqualTo(1L);
    }

    @Test
    void getTaskById_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(99L))
            .isInstanceOf(TaskNotFoundException.class)
            .hasMessageContaining("99");
    }

    // ── updateTask ────────────────────────────────────────────────────────────

    @Test
    void updateTask_updatesFieldsAndSaves() {
        Task existing = taskWithId(1L, "old", 10, TaskStatus.READY);
        existing.setMaxRetries(0);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateTaskRequest req = request("new", 99);
        req.setMaxRetries(3);
        Task result = taskService.updateTask(1L, req);

        assertThat(result.getTaskName()).isEqualTo("new");
        assertThat(result.getTaskDuration()).isEqualTo(99);
        assertThat(result.getMaxRetries()).isEqualTo(3);
    }

    @Test
    void updateTask_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.updateTask(5L, request("x", 1)))
            .isInstanceOf(TaskNotFoundException.class);
    }

    // ── resetTask ─────────────────────────────────────────────────────────────

    @Test
    void resetTask_resetsFailedTaskToReady() {
        Task task = taskWithId(1L, "failed", 5, TaskStatus.FAILED);
        task.setStartedAt(java.time.Instant.now());
        task.setCompletedAt(java.time.Instant.now());
        task.setResultMessage("failed");
        task.setRetryCount(2);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Task result = taskService.resetTask(1L);

        assertThat(result.getTaskStatus()).isEqualTo(TaskStatus.READY);
        assertThat(result.getStartedAt()).isNull();
        assertThat(result.getCompletedAt()).isNull();
        assertThat(result.getResultMessage()).isNull();
        assertThat(result.getRetryCount()).isEqualTo(0);
    }

    @Test
    void resetTask_resetsDoneTaskToReady() {
        Task task = taskWithId(1L, "done", 5, TaskStatus.DONE);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(taskService.resetTask(1L).getTaskStatus()).isEqualTo(TaskStatus.READY);
    }

    @Test
    void resetTask_throws_whenInProgress() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.IN_PROGRESS);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.resetTask(1L))
            .isInstanceOf(com.example.taskmanager.exception.TaskInvalidStateException.class);
    }

    // ── getTaskStats ──────────────────────────────────────────────────────────

    @Test
    void getTaskStats_aggregatesCountsByStatus() {
        when(taskRepository.countActiveGroupedByStatus()).thenReturn(List.of(
            new Object[]{TaskStatus.READY, 3L},
            new Object[]{TaskStatus.DONE, 2L}
        ));

        var stats = taskService.getTaskStats();

        assertThat(stats.getTotal()).isEqualTo(5);
        assertThat(stats.getByStatus().get(TaskStatus.READY)).isEqualTo(3);
        assertThat(stats.getByStatus().get(TaskStatus.DONE)).isEqualTo(2);
        assertThat(stats.getByStatus().get(TaskStatus.IN_PROGRESS)).isEqualTo(0);
        assertThat(stats.getByStatus().get(TaskStatus.FAILED)).isEqualTo(0);
    }

    // ── deleteTask (soft delete) ──────────────────────────────────────────────

    @Test
    void deleteTask_softDeletesSetsDeletedAt() {
        Task task = taskWithId(1L, "t", 5, TaskStatus.READY);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        taskService.deleteTask(1L);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertThat(captor.getValue().getDeletedAt()).isNotNull();
        verify(taskRepository, never()).deleteById(any());
    }

    @Test
    void deleteTask_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.deleteTask(7L))
            .isInstanceOf(TaskNotFoundException.class);
        verify(taskRepository, never()).deleteById(any());
    }

    // ── purgeTask (hard delete) ───────────────────────────────────────────────

    @Test
    void purgeTask_hardDeletesTask() {
        when(taskRepository.existsById(1L)).thenReturn(true);

        taskService.purgeTask(1L);

        verify(taskRepository).deleteById(1L);
    }

    @Test
    void purgeTask_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.existsById(9L)).thenReturn(false);

        assertThatThrownBy(() -> taskService.purgeTask(9L))
            .isInstanceOf(TaskNotFoundException.class);
    }

    // ── startTask ─────────────────────────────────────────────────────────────

    @Test
    void startTask_setsInProgressAndSubmitsToExecutor() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.READY);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Task result = taskService.startTask(1L);

        assertThat(result.getTaskStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        verify(taskExecutor).execute(any(Runnable.class));
    }

    @Test
    void startTask_throwsTaskAlreadyRunningException_whenInProgress() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.IN_PROGRESS);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.startTask(1L))
            .isInstanceOf(TaskAlreadyRunningException.class);
        verify(taskExecutor, never()).execute(any());
    }

    @Test
    void startTask_throwsTaskAlreadyRunningException_whenDone() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.DONE);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.startTask(1L))
            .isInstanceOf(TaskAlreadyRunningException.class);
    }

    @Test
    void startTask_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.startTask(42L))
            .isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    void startTask_rollsBackToReady_whenPoolRejects() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.READY);
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RejectedExecutionException()).when(taskExecutor).execute(any());

        assertThatThrownBy(() -> taskService.startTask(1L))
            .isInstanceOf(RejectedExecutionException.class);

        // Status must be rolled back to READY
        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues())
            .extracting(Task::getTaskStatus)
            .contains(TaskStatus.READY);
    }

    // ── startScheduledTasks ───────────────────────────────────────────────────

    @Test
    void startScheduledTasks_startsReadyTasksWithPastScheduledAt() {
        Task task = taskWithId(1L, "scheduled", 5, TaskStatus.READY);
        task.setScheduledAt(java.time.Instant.now().minusSeconds(60));
        when(taskRepository.findByTaskStatusAndScheduledAtIsNotNullAndScheduledAtLessThanEqual(
                any(), any())).thenReturn(List.of(task));
        when(taskRepository.findByTaskIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        taskService.startScheduledTasks();

        verify(taskExecutor).execute(any(Runnable.class));
    }

    @Test
    void startScheduledTasks_doesNothing_whenNoDueTasksExist() {
        when(taskRepository.findByTaskStatusAndScheduledAtIsNotNullAndScheduledAtLessThanEqual(
                any(), any())).thenReturn(List.of());

        taskService.startScheduledTasks();

        verify(taskExecutor, never()).execute(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static Task taskWithId(Long id, String name, int duration, TaskStatus status) {
        Task t = new Task(name, duration, null, null);
        t.setTaskId(id);
        t.setTaskStatus(status);
        return t;
    }

    private static CreateTaskRequest request(String name, int duration) {
        CreateTaskRequest r = new CreateTaskRequest();
        r.setTaskName(name);
        r.setTaskDuration(duration);
        return r;
    }
}
