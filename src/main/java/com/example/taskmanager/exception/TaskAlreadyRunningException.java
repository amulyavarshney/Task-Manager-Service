package com.example.taskmanager.exception;

public class TaskAlreadyRunningException extends RuntimeException {
    public TaskAlreadyRunningException(Long id) {
        super("Task " + id + " is already IN_PROGRESS or DONE and cannot be started again.");
    }
}
