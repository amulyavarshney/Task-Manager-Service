package com.example.taskmanager.config;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class MetricsConfig {

    @Bean
    public MeterBinder taskExecutorMetrics(
            @Qualifier("taskExecutor") ThreadPoolTaskExecutor taskExecutor) {
        return (MeterRegistry registry) -> {
            Gauge.builder("taskmanager.executor.active", taskExecutor, ThreadPoolTaskExecutor::getActiveCount)
                    .description("Active task executor threads")
                    .register(registry);
            Gauge.builder("taskmanager.executor.pool.size", taskExecutor, ThreadPoolTaskExecutor::getPoolSize)
                    .description("Current task executor pool size")
                    .register(registry);
            Gauge.builder("taskmanager.executor.queue.size", taskExecutor,
                            e -> e.getThreadPoolExecutor().getQueue().size())
                    .description("Queued tasks waiting for execution")
                    .register(registry);
            Gauge.builder("taskmanager.executor.completed", taskExecutor,
                            e -> e.getThreadPoolExecutor().getCompletedTaskCount())
                    .description("Completed tasks on the executor")
                    .register(registry);
        };
    }
}
