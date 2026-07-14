import { describe, it, expect, beforeEach } from 'vitest';
import { demoApi } from './demoApi';

describe('demoApi', () => {
  beforeEach(() => {
    localStorage.clear();
    demoApi.resetDemoData();
  });

  it('seeds sample tasks', async () => {
    const page = await demoApi.listTasks({ page: 0, size: 12 });
    expect(page.totalElements).toBeGreaterThanOrEqual(3);
  });

  it('creates starts and completes a short task', async () => {
    const created = await demoApi.createTask({
      taskName: 'quick',
      taskDuration: 1,
      priority: 'HIGH',
      tags: ['t'],
      maxRetries: 0,
    });
    const started = await demoApi.startTask(created.taskId);
    expect(started.taskStatus).toBe('IN_PROGRESS');

    await new Promise((r) => setTimeout(r, 1200));
    const done = await demoApi.getTask(created.taskId);
    expect(done.taskStatus).toBe('DONE');
  });

  it('resets failed/done tasks', async () => {
    const created = await demoApi.createTask({
      taskName: 'reset-me',
      taskDuration: 1,
      priority: 'MEDIUM',
    });
    await demoApi.startTask(created.taskId);
    await new Promise((r) => setTimeout(r, 1200));
    const reset = await demoApi.resetTask(created.taskId);
    expect(reset.taskStatus).toBe('READY');
  });
});
