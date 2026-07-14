package com.example.taskmanager.service;

import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.executor.PrioritizedTask;
import com.example.taskmanager.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TaskRunner {

    private static final Logger log = LoggerFactory.getLogger(TaskRunner.class);

    private final TaskRepository taskRepository;
    private final ThreadPoolTaskExecutor taskExecutor;
    private final TransactionTemplate transactionTemplate;
    private final Map<Long, Thread> runningThreads = new ConcurrentHashMap<>();
    private final Set<Long> cancelledTasks = ConcurrentHashMap.newKeySet();

    public TaskRunner(TaskRepository taskRepository,
                      @Qualifier("taskExecutor") ThreadPoolTaskExecutor taskExecutor,
                      TransactionTemplate transactionTemplate) {
        this.taskRepository = taskRepository;
        this.taskExecutor = taskExecutor;
        this.transactionTemplate = transactionTemplate;
    }

    public void run(Long taskId, int durationSeconds) {
        run(taskId, durationSeconds, TaskPriority.MEDIUM);
    }

    public void run(Long taskId, int durationSeconds, TaskPriority priority) {
        log.info("Task {} started, sleeping for {} seconds", taskId, durationSeconds);
        Instant runStart = Instant.now();
        runningThreads.put(taskId, Thread.currentThread());
        try {
            Thread.sleep(durationSeconds * 1000L);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Task {} interrupted during sleep", taskId);
            handleInterruption(taskId, durationSeconds, runStart, priority);
            return;
        } finally {
            runningThreads.remove(taskId, Thread.currentThread());
        }

        if (cancelledTasks.remove(taskId)) {
            markCancelled(taskId, runStart);
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

    /**
     * Requests cancellation of a running task. Returns true if a running thread was interrupted.
     */
    public boolean cancel(Long taskId) {
        cancelledTasks.add(taskId);
        Thread thread = runningThreads.get(taskId);
        if (thread != null) {
            thread.interrupt();
            return true;
        }
        return false;
    }

    public boolean isRunning(Long taskId) {
        return runningThreads.containsKey(taskId);
    }

    private void markCancelled(Long taskId, Instant runStart) {
        transactionTemplate.executeWithoutResult(status -> {
            Task task = taskRepository.findById(taskId).orElse(null);
            if (task == null) {
                return;
            }
            double elapsed = (Instant.now().toEpochMilli() - runStart.toEpochMilli()) / 1000.0;
            task.setTaskStatus(TaskStatus.FAILED);
            task.setCompletedAt(Instant.now());
            task.setResultMessage(String.format("Cancelled by user after %.1fs", elapsed));
            taskRepository.save(task);
            log.info("Task {} cancelled", taskId);
        });
    }

    private void handleInterruption(Long taskId, int durationSeconds, Instant runStart, TaskPriority priority) {
        if (cancelledTasks.remove(taskId)) {
            markCancelled(taskId, runStart);
            return;
        }

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
            task.setCompletedAt(Instant.now());
            task.setResultMessage(task.getMaxRetries() > 0
                    ? String.format("Failed after %d retr%s (interrupted after %.1fs)",
                            task.getMaxRetries(), task.getMaxRetries() == 1 ? "y" : "ies", elapsed)
                    : String.format("Task failed (interrupted after %.1fs)", elapsed));
            taskRepository.save(task);
            log.warn("Task {} marked FAILED", taskId);
            return false;
        });

        if (Boolean.TRUE.equals(shouldRetry)) {
            TaskPriority p = priority != null ? priority : TaskPriority.MEDIUM;
            taskExecutor.execute(new PrioritizedTask(p, () -> run(taskId, durationSeconds, p)));
        }
    }
}
