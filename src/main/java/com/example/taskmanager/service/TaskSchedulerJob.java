package com.example.taskmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TaskSchedulerJob {

    private static final Logger log = LoggerFactory.getLogger(TaskSchedulerJob.class);

    private final TaskService taskService;

    public TaskSchedulerJob(TaskService taskService) {
        this.taskService = taskService;
    }

    @Scheduled(fixedDelayString = "${task.scheduler.interval-ms:30000}")
    public void runScheduledTasks() {
        log.debug("Checking for scheduled tasks due for execution");
        taskService.startScheduledTasks();
    }
}
