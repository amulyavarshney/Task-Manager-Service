package com.example.taskmanager.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class ApiKeyRegistry {

    private final Map<String, ApiRole> keys = new LinkedHashMap<>();

    public ApiKeyRegistry(
            @Value("${app.security.api-keys.admin:}") String adminKey,
            @Value("${app.security.api-keys.viewer:}") String viewerKey) {
        if (StringUtils.hasText(adminKey)) {
            keys.put(adminKey.trim(), ApiRole.ADMIN);
        }
        if (StringUtils.hasText(viewerKey)) {
            keys.put(viewerKey.trim(), ApiRole.VIEWER);
        }
    }

    public Optional<ApiRole> resolve(String apiKey) {
        if (!StringUtils.hasText(apiKey)) {
            return Optional.empty();
        }
        return Optional.ofNullable(keys.get(apiKey.trim()));
    }

    public boolean hasAnyKeys() {
        return !keys.isEmpty();
    }
}
