package com.example.taskmanager.service;

import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;

@Component
public class TaskRunner {

    private static final Logger log = LoggerFactory.getLogger(TaskRunner.class);

    private final TaskRepository taskRepository;
    private final ThreadPoolTaskExecutor taskExecutor;
    private final TransactionTemplate transactionTemplate;

    public TaskRunner(TaskRepository taskRepository,
                      @Qualifier("taskExecutor") ThreadPoolTaskExecutor taskExecutor,
                      TransactionTemplate transactionTemplate) {
        this.taskRepository = taskRepository;
        this.taskExecutor = taskExecutor;
        this.transactionTemplate = transactionTemplate;
    }

    public void run(Long taskId, int durationSeconds) {
        log.info("Task {} started, sleeping for {} seconds", taskId, durationSeconds);
        Instant runStart = Instant.now();
        try {
            Thread.sleep(durationSeconds * 1000L);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Task {} interrupted during sleep", taskId);
            handleInterruption(taskId, durationSeconds, runStart);
            return;
        }

        transactionTemplate.executeWithoutResult(status -> {
            Task task = taskRepository.findById(taskId).orElse(null);
            if (task == null) {
                log.warn("Task {} was deleted before completion", taskId);
                return;
            }

            Instant completedAt = Instant.now();
            double elapsed = (completedAt.toEpochMilli() - runStart.toEpochMilli()) / 1000.0;
            task.setTaskStatus(TaskStatus.DONE);
            task.setCompletedAt(completedAt);
            task.setResultMessage(String.format("Completed successfully in %.1fs", elapsed));
            taskRepository.save(task);
            log.info("Task {} completed and marked DONE", taskId);
        });
    }

    private void handleInterruption(Long taskId, int durationSeconds, Instant runStart) {
        Boolean shouldRetry = transactionTemplate.execute(status -> {
            Task task = taskRepository.findById(taskId).orElse(null);
            if (task == null) {
                return false;
            }

            if (task.getRetryCount() < task.getMaxRetries()) {
                int nextRetry = task.getRetryCount() + 1;
                task.setRetryCount(nextRetry);
                task.setTaskStatus(TaskStatus.IN_PROGRESS);
                task.setStartedAt(Instant.now());
                task.setResultMessage(String.format("Retry %d/%d in progress", nextRetry, task.getMaxRetries()));
                taskRepository.save(task);
                log.info("Task {} scheduling retry {}/{}", taskId, nextRetry, task.getMaxRetries());
                return true;
            }

            double elapsed = (Instant.now().toEpochMilli() - runStart.toEpochMilli()) / 1000.0;
            task.setTaskStatus(TaskStatus.FAILED);
            task.setResultMessage(task.getMaxRetries() > 0
                    ? String.format("Failed after %d retr%s (interrupted after %.1fs)",
                            task.getMaxRetries(), task.getMaxRetries() == 1 ? "y" : "ies", elapsed)
                    : String.format("Task failed (interrupted after %.1fs)", elapsed));
            taskRepository.save(task);
            log.warn("Task {} marked FAILED", taskId);
            return false;
        });

        if (Boolean.TRUE.equals(shouldRetry)) {
            taskExecutor.execute(() -> run(taskId, durationSeconds));
        }
    }
}
