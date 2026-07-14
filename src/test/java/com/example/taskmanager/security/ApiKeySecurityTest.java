package com.example.taskmanager.security;

import com.example.taskmanager.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.security.enabled=true",
        "app.security.api-keys.admin=test-admin",
        "app.security.api-keys.viewer=test-viewer",
        "app.security.rate-limit-per-minute=10000"
})
class ApiKeySecurityTest {

    @Autowired MockMvc mockMvc;
    @MockBean TaskService taskService;

    @Test
    void rejectsMissingApiKey() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void viewerCanReadButNotWrite() throws Exception {
        when(taskService.getTasksPaged(any(), any(), any(), any(), any()))
                .thenReturn(new com.example.taskmanager.dto.PagedTaskResponse(
                        new org.springframework.data.domain.PageImpl<>(java.util.List.of())));

        mockMvc.perform(get("/api/tasks").header("X-API-Key", "test-viewer"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/tasks")
                        .header("X-API-Key", "test-viewer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskName\":\"x\",\"taskDuration\":1}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanWrite() throws Exception {
        when(taskService.createTask(any())).thenReturn(
                new com.example.taskmanager.entity.Task("x", 1, null, null));

        mockMvc.perform(post("/api/tasks")
                        .header("X-API-Key", "test-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskName\":\"x\",\"taskDuration\":1}"))
                .andExpect(status().isCreated());
    }

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }
}
