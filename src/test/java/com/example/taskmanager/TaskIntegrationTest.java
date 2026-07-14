package com.example.taskmanager;

import com.example.taskmanager.dto.CreateTaskRequest;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.service.TaskService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end style integration against real PostgreSQL via Testcontainers.
 * Enable with: RUN_TESTCONTAINERS=true mvn test
 */
@SpringBootTest
@Testcontainers
@Tag("testcontainers")
@EnabledIfEnvironmentVariable(named = "RUN_TESTCONTAINERS", matches = "true")
class TaskIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("taskmanager")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void overrideProps(DynamicPropertyRegistry registry) {
        registry.add("app.security.enabled", () -> "false");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("task.scheduler.interval-ms", () -> "3600000");
    }

    @Autowired TaskService taskService;
    @Autowired TaskRepository taskRepository;

    @Test
    void createStartAndCompleteTask() throws InterruptedException {
        CreateTaskRequest req = new CreateTaskRequest();
        req.setTaskName("integration-task");
        req.setTaskDuration(1);
        req.setPriority(TaskPriority.HIGH);
        req.setTags(List.of("it"));
        req.setMaxRetries(0);

        Task created = taskService.createTask(req);
        assertThat(created.getTaskId()).isNotNull();
        assertThat(created.getTaskStatus()).isEqualTo(TaskStatus.READY);

        Task started = taskService.startTask(created.getTaskId());
        assertThat(started.getTaskStatus()).isEqualTo(TaskStatus.IN_PROGRESS);

        Task done = null;
        for (int i = 0; i < 50; i++) {
            done = taskRepository.findById(created.getTaskId()).orElseThrow();
            if (done.getTaskStatus() == TaskStatus.DONE) {
                break;
            }
            Thread.sleep(200);
        }
        assertThat(done).isNotNull();
        assertThat(done.getTaskStatus()).isEqualTo(TaskStatus.DONE);
        assertThat(done.getResultMessage()).contains("Completed successfully");
    }

    @Test
    void softDeleteAppearsInHistory() {
        CreateTaskRequest req = new CreateTaskRequest();
        req.setTaskName("history-task");
        req.setTaskDuration(1);
        Task created = taskService.createTask(req);

        taskService.deleteTask(created.getTaskId());

        var history = taskService.getTaskHistory(PageRequest.of(0, 20));
        assertThat(history.getContent())
                .extracting(t -> t.getTaskId())
                .contains(created.getTaskId());
    }
}
