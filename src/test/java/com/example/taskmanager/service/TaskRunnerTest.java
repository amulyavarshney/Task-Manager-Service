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

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskRunnerTest {

    @Mock TaskRepository taskRepository;
    @InjectMocks TaskRunner taskRunner;

    @Test
    void run_setsResultMessageAndDoneStatus_onSuccess() {
        Task task = makeTask(1L, 0); // 0s duration so test doesn't actually sleep
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

    // ── helpers ───────────────────────────────────────────────────────────────

    private static Task makeTask(Long id, int duration) {
        Task t = new Task("test", duration, TaskPriority.MEDIUM, null);
        t.setTaskId(id);
        t.setTaskStatus(TaskStatus.IN_PROGRESS);
        t.setStartedAt(Instant.now());
        return t;
    }
}
