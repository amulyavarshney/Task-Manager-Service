package com.example.taskmanager.service;

import com.example.taskmanager.dto.CreateTaskRequest;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.exception.TaskAlreadyRunningException;
import com.example.taskmanager.exception.TaskNotFoundException;
import com.example.taskmanager.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.RejectedExecutionException;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskRunner taskRunner;
    private final ThreadPoolTaskExecutor taskExecutor;

    public TaskService(TaskRepository taskRepository,
                       TaskRunner taskRunner,
                       @Qualifier("taskExecutor") ThreadPoolTaskExecutor taskExecutor) {
        this.taskRepository = taskRepository;
        this.taskRunner = taskRunner;
        this.taskExecutor = taskExecutor;
    }

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public Task getTaskById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    @Transactional
    public Task createTask(CreateTaskRequest request) {
        Task task = new Task(
                request.getTaskName(),
                request.getTaskDuration(),
                request.getPriority(),
                request.getTags()
        );
        return taskRepository.save(task);
    }

    @Transactional
    public Task updateTask(Long id, CreateTaskRequest request) {
        Task task = getTaskById(id);
        task.setTaskName(request.getTaskName());
        task.setTaskDuration(request.getTaskDuration());
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getTags() != null) {
            task.setTags(request.getTags());
        }
        return taskRepository.save(task);
    }

    @Transactional
    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new TaskNotFoundException(id);
        }
        taskRepository.deleteById(id);
    }

    @Transactional
    public Task startTask(Long id) {
        Task task = getTaskById(id);

        if (task.getTaskStatus() != TaskStatus.READY) {
            throw new TaskAlreadyRunningException(id);
        }

        task.setTaskStatus(TaskStatus.IN_PROGRESS);
        task.setStartedAt(Instant.now());
        taskRepository.save(task);
        taskRepository.flush();

        int durationSeconds = task.getTaskDuration();
        try {
            taskExecutor.execute(() -> taskRunner.run(id, durationSeconds));
        } catch (RejectedExecutionException e) {
            task.setTaskStatus(TaskStatus.READY);
            task.setStartedAt(null);
            taskRepository.save(task);
            throw e;
        }

        return task;
    }

    public Map<String, Object> getExecutorStats() {
        return Map.of(
                "corePoolSize", taskExecutor.getCorePoolSize(),
                "maxPoolSize", taskExecutor.getMaxPoolSize(),
                "activeCount", taskExecutor.getActiveCount(),
                "poolSize", taskExecutor.getPoolSize(),
                "queueSize", taskExecutor.getThreadPoolExecutor().getQueue().size(),
                "queueCapacity", taskExecutor.getQueueCapacity(),
                "completedTaskCount", taskExecutor.getThreadPoolExecutor().getCompletedTaskCount()
        );
    }
}
