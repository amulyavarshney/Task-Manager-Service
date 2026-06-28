package com.example.taskmanager.repository;

import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByTaskStatusAndScheduledAtIsNotNullAndScheduledAtLessThanEqual(
            TaskStatus status, Instant now);

    Page<Task> findByDeletedAtIsNull(Pageable pageable);

    Page<Task> findByDeletedAtIsNotNull(Pageable pageable);

    Optional<Task> findByTaskIdAndDeletedAtIsNull(Long taskId);

    List<Task> findByDeletedAtIsNull();
}
