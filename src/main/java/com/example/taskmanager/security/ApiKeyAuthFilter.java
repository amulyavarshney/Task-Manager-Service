package com.example.taskmanager.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;

public class ApiKeyAuthFilter extends OncePerRequestFilter {

    public static final String API_KEY_HEADER = "X-API-Key";

    private final ApiKeyRegistry registry;
    private final ObjectMapper objectMapper;
    private final boolean securityEnabled;

    public ApiKeyAuthFilter(ApiKeyRegistry registry, ObjectMapper objectMapper, boolean securityEnabled) {
        this.registry = registry;
        this.objectMapper = objectMapper;
        this.securityEnabled = securityEnabled;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!securityEnabled) {
            return true;
        }
        String path = request.getRequestURI();
        return path.startsWith("/actuator/health")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String apiKey = request.getHeader(API_KEY_HEADER);
        var role = registry.resolve(apiKey);
        if (role.isEmpty()) {
            writeUnauthorized(response);
            return;
        }

        var auth = new UsernamePasswordAuthenticationToken(
                role.get().name(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.get().name()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        try {
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        pd.setDetail("Missing or invalid API key. Provide header X-API-Key.");
        objectMapper.writeValue(response.getOutputStream(), pd);
    }
}
