package com.example.taskmanager.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    public static final String API_KEY_SCHEME = "ApiKeyAuth";

    @Bean
    public OpenAPI taskManagerOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Task Manager API")
                        .description("Create, schedule, run, and manage asynchronous tasks.")
                        .version("0.0.1"))
                .addSecurityItem(new SecurityRequirement().addList(API_KEY_SCHEME))
                .components(new Components().addSecuritySchemes(API_KEY_SCHEME,
                        new SecurityScheme()
                                .name("X-API-Key")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .description("Admin or viewer API key")));
    }
}
