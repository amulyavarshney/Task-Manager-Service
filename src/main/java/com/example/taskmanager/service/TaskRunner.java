package com.example.taskmanager.service;

import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class TaskRunner {

    private static final Logger log = LoggerFactory.getLogger(TaskRunner.class);

    private final TaskRepository taskRepository;

    public TaskRunner(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public void run(Long taskId, int durationSeconds) {
        log.info("Task {} started, sleeping for {} seconds", taskId, durationSeconds);
        Instant runStart = Instant.now();
        try {
            Thread.sleep(durationSeconds * 1000L);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Task {} interrupted during sleep", taskId);
            Task interrupted = taskRepository.findById(taskId).orElse(null);
            if (interrupted != null) {
                double elapsed = (Instant.now().toEpochMilli() - runStart.toEpochMilli()) / 1000.0;
                interrupted.setResultMessage(String.format("Task was interrupted after %.1fs", elapsed));
                taskRepository.save(interrupted);
            }
            return;
        }

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
    }
}
