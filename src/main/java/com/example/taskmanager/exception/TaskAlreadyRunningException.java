package com.example.taskmanager.exception;

public class TaskAlreadyRunningException extends RuntimeException {
    public TaskAlreadyRunningException(Long id) {
        super("Task " + id + " is not in READY status and cannot be started.");
    }
}
