package com.example.taskmanager.exception;

public class TaskInvalidStateException extends RuntimeException {
    public TaskInvalidStateException(String message) {
        super(message);
    }
}
