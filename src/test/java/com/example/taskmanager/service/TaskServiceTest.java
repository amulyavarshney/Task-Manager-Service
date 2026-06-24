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

import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock TaskRepository taskRepository;
    @Mock TaskRunner taskRunner;
    @Mock Executor taskExecutor;

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
        when(taskRepository.findAll()).thenReturn(tasks);

        assertThat(taskService.getAllTasks()).hasSize(2);
    }

    // ── getTaskById ───────────────────────────────────────────────────────────

    @Test
    void getTaskById_returnsTask_whenFound() {
        Task task = taskWithId(1L, "x", 5, TaskStatus.READY);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        assertThat(taskService.getTaskById(1L).getTaskId()).isEqualTo(1L);
    }

    @Test
    void getTaskById_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(99L))
            .isInstanceOf(TaskNotFoundException.class)
            .hasMessageContaining("99");
    }

    // ── updateTask ────────────────────────────────────────────────────────────

    @Test
    void updateTask_updatesFieldsAndSaves() {
        Task existing = taskWithId(1L, "old", 10, TaskStatus.READY);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Task result = taskService.updateTask(1L, request("new", 99));

        assertThat(result.getTaskName()).isEqualTo("new");
        assertThat(result.getTaskDuration()).isEqualTo(99);
    }

    @Test
    void updateTask_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.updateTask(5L, request("x", 1)))
            .isInstanceOf(TaskNotFoundException.class);
    }

    // ── deleteTask ────────────────────────────────────────────────────────────

    @Test
    void deleteTask_deletesWhenExists() {
        when(taskRepository.existsById(1L)).thenReturn(true);

        taskService.deleteTask(1L);

        verify(taskRepository).deleteById(1L);
    }

    @Test
    void deleteTask_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.existsById(7L)).thenReturn(false);

        assertThatThrownBy(() -> taskService.deleteTask(7L))
            .isInstanceOf(TaskNotFoundException.class);
        verify(taskRepository, never()).deleteById(any());
    }

    // ── startTask ─────────────────────────────────────────────────────────────

    @Test
    void startTask_setsInProgressAndSubmitsToExecutor() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.READY);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Task result = taskService.startTask(1L);

        assertThat(result.getTaskStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        verify(taskExecutor).execute(any(Runnable.class));
    }

    @Test
    void startTask_throwsTaskAlreadyRunningException_whenInProgress() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.IN_PROGRESS);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.startTask(1L))
            .isInstanceOf(TaskAlreadyRunningException.class);
        verify(taskExecutor, never()).execute(any());
    }

    @Test
    void startTask_throwsTaskAlreadyRunningException_whenDone() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.DONE);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.startTask(1L))
            .isInstanceOf(TaskAlreadyRunningException.class);
    }

    @Test
    void startTask_throwsTaskNotFoundException_whenMissing() {
        when(taskRepository.findById(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.startTask(42L))
            .isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    void startTask_rollsBackToReady_whenPoolRejects() {
        Task task = taskWithId(1L, "run", 5, TaskStatus.READY);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
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

    // ── helpers ───────────────────────────────────────────────────────────────

    private static Task taskWithId(Long id, String name, int duration, TaskStatus status) {
        Task t = new Task(name, duration);
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
