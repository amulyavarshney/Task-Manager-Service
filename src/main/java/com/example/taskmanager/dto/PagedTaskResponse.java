package com.example.taskmanager.dto;

import org.springframework.data.domain.Page;
import com.example.taskmanager.entity.Task;

import java.util.List;

public class PagedTaskResponse {

    private final List<TaskResponse> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean first;
    private final boolean last;

    public PagedTaskResponse(Page<Task> pageResult) {
        this.content = pageResult.getContent().stream().map(TaskResponse::from).toList();
        this.page = pageResult.getNumber();
        this.size = pageResult.getSize();
        this.totalElements = pageResult.getTotalElements();
        this.totalPages = pageResult.getTotalPages();
        this.first = pageResult.isFirst();
        this.last = pageResult.isLast();
    }

    public List<TaskResponse> getContent() { return content; }
    public int getPage() { return page; }
    public int getSize() { return size; }
    public long getTotalElements() { return totalElements; }
    public int getTotalPages() { return totalPages; }
    public boolean isFirst() { return first; }
    public boolean isLast() { return last; }
}
