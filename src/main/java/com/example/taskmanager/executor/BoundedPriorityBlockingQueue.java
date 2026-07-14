package com.example.taskmanager.executor;

import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Capacity-bounded priority queue. {@link #offer} returns false when full so
 * ThreadPoolExecutor AbortPolicy can reject work.
 */
public class BoundedPriorityBlockingQueue extends PriorityBlockingQueue<Runnable> {

    private final int capacity;
    private final AtomicInteger count = new AtomicInteger();

    public BoundedPriorityBlockingQueue(int capacity) {
        super(Math.max(1, capacity));
        this.capacity = Math.max(1, capacity);
    }

    @Override
    public boolean offer(Runnable runnable) {
        for (;;) {
            int current = count.get();
            if (current >= capacity) {
                return false;
            }
            if (!count.compareAndSet(current, current + 1)) {
                continue;
            }
            boolean offered = super.offer(runnable);
            if (!offered) {
                count.decrementAndGet();
                return false;
            }
            return true;
        }
    }

    @Override
    public boolean offer(Runnable runnable, long timeout, TimeUnit unit) {
        return offer(runnable);
    }

    @Override
    public Runnable poll() {
        Runnable r = super.poll();
        if (r != null) {
            count.decrementAndGet();
        }
        return r;
    }

    @Override
    public Runnable take() throws InterruptedException {
        Runnable r = super.take();
        count.decrementAndGet();
        return r;
    }

    @Override
    public Runnable poll(long timeout, TimeUnit unit) throws InterruptedException {
        Runnable r = super.poll(timeout, unit);
        if (r != null) {
            count.decrementAndGet();
        }
        return r;
    }

    @Override
    public boolean remove(Object o) {
        boolean removed = super.remove(o);
        if (removed) {
            count.decrementAndGet();
        }
        return removed;
    }

    @Override
    public int remainingCapacity() {
        return Math.max(0, capacity - count.get());
    }

    @Override
    public int size() {
        return count.get();
    }

    public int getCapacity() {
        return capacity;
    }
}
