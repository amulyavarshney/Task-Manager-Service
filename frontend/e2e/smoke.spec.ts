import { test, expect } from '@playwright/test';

test.describe('Task Manager smoke', () => {
  test('loads the app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Task Manager')).toBeVisible();
    await expect(page.getByRole('button', { name: /New Task/i })).toBeVisible();
  });

  test('can open create task modal', async ({ page }) => {
    await page.goto('/');
    // Ensure API key is set for authenticated calls
    await page.evaluate(() => localStorage.setItem('taskmanager.apiKey', 'dev-admin-key'));
    await page.reload();
    await page.getByRole('button', { name: /New Task/i }).click();
    await expect(page.getByRole('heading', { name: 'New Task' })).toBeVisible();
  });
});
