package com.example.taskmanager.executor;

import com.example.taskmanager.entity.TaskPriority;

/**
 * Runnable wrapper that participates in priority-ordered executor queues.
 * Lower ordinal rank runs first: HIGH (0) &gt; MEDIUM (1) &gt; LOW (2).
 */
public final class PrioritizedTask implements Runnable, Comparable<PrioritizedTask> {

    private final int rank;
    private final long sequence;
    private final Runnable delegate;

    private static final java.util.concurrent.atomic.AtomicLong SEQ =
            new java.util.concurrent.atomic.AtomicLong();

    public PrioritizedTask(TaskPriority priority, Runnable delegate) {
        this.rank = rankOf(priority);
        this.sequence = SEQ.incrementAndGet();
        this.delegate = delegate;
    }

    private static int rankOf(TaskPriority priority) {
        if (priority == null) {
            return 1;
        }
        return switch (priority) {
            case HIGH -> 0;
            case MEDIUM -> 1;
            case LOW -> 2;
        };
    }

    @Override
    public void run() {
        delegate.run();
    }

    @Override
    public int compareTo(PrioritizedTask other) {
        int byRank = Integer.compare(this.rank, other.rank);
        if (byRank != 0) {
            return byRank;
        }
        return Long.compare(this.sequence, other.sequence);
    }
}
