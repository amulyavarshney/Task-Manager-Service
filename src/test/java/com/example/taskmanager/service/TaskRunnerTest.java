package com.example.taskmanager.service;

import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskRunnerTest {

    @Mock TaskRepository taskRepository;
    @Mock ThreadPoolTaskExecutor taskExecutor;
    @InjectMocks TaskRunner taskRunner;

    // ── success path ──────────────────────────────────────────────────────────

    @Test
    void run_setsResultMessageAndDoneStatus_onSuccess() {
        Task task = makeTask(1L, 0, 0, 0);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        taskRunner.run(1L, 0);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        Task saved = captor.getValue();

        assertThat(saved.getTaskStatus()).isEqualTo(TaskStatus.DONE);
        assertThat(saved.getCompletedAt()).isNotNull();
        assertThat(saved.getResultMessage()).startsWith("Completed successfully in");
    }

    @Test
    void run_doesNothing_whenTaskDeletedBeforeCompletion() {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        taskRunner.run(99L, 0);

        verify(taskRepository, never()).save(any());
    }

    // ── failure with no retries ───────────────────────────────────────────────

    @Test
    void run_marksTaskFailed_whenInterruptedWithNoRetries() throws InterruptedException {
        Task task = makeTask(1L, 10, 0, 0); // maxRetries=0
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Thread runner = new Thread(() -> taskRunner.run(1L, 10));
        runner.start();
        Thread.sleep(50);
        runner.interrupt();
        runner.join(2000);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, atLeastOnce()).save(captor.capture());
        Task saved = captor.getAllValues().stream()
                .filter(t -> t.getTaskStatus() == TaskStatus.FAILED)
                .findFirst()
                .orElseThrow();

        assertThat(saved.getResultMessage()).contains("failed");
        verify(taskExecutor, never()).execute(any());
    }

    // ── retry path ────────────────────────────────────────────────────────────

    @Test
    void run_schedulesRetry_whenInterruptedWithRetriesRemaining() throws InterruptedException {
        Task task = makeTask(1L, 10, 2, 0); // maxRetries=2, retryCount=0
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Thread runner = new Thread(() -> taskRunner.run(1L, 10));
        runner.start();
        Thread.sleep(50);
        runner.interrupt();
        runner.join(2000);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, atLeastOnce()).save(captor.capture());
        Task saved = captor.getAllValues().get(captor.getAllValues().size() - 1);

        assertThat(saved.getRetryCount()).isEqualTo(1);
        assertThat(saved.getTaskStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        assertThat(saved.getResultMessage()).contains("Retry 1/2");
        verify(taskExecutor).execute(any(Runnable.class));
    }

    @Test
    void run_marksFailedAfterAllRetriesExhausted() throws InterruptedException {
        Task task = makeTask(1L, 10, 1, 1); // maxRetries=1, retryCount already=1
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Thread runner = new Thread(() -> taskRunner.run(1L, 10));
        runner.start();
        Thread.sleep(50);
        runner.interrupt();
        runner.join(2000);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, atLeastOnce()).save(captor.capture());
        Task saved = captor.getAllValues().stream()
                .filter(t -> t.getTaskStatus() == TaskStatus.FAILED)
                .findFirst()
                .orElseThrow();

        assertThat(saved.getResultMessage()).contains("Failed after 1 retry");
        verify(taskExecutor, never()).execute(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static Task makeTask(Long id, int duration, int maxRetries, int retryCount) {
        Task t = new Task("test", duration, TaskPriority.MEDIUM, null, maxRetries);
        t.setTaskId(id);
        t.setTaskStatus(TaskStatus.IN_PROGRESS);
        t.setStartedAt(Instant.now());
        t.setRetryCount(retryCount);
        return t;
    }
}
