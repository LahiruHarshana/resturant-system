import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('should navigate through admin sections', async ({ page }) => {
    await page.goto('/admin');
    
    // Check if the dashboard loads
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();

    // Navigate to Menu
    await page.getByRole('link', { name: 'Menu Items', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Menu Items/i })).toBeVisible();

    // Navigate to Users
    await page.getByRole('link', { name: /Users/i }).click();
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  });
});
