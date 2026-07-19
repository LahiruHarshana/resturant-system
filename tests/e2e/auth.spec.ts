import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully as admin with password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Admin should be redirected to the admin dashboard or floor plan
    await page.waitForURL('**/');
  });

  test('should login successfully as server with PIN', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to PIN mode
    await page.getByRole('button', { name: 'Use PIN Login' }).click();
    
    await page.fill('input[name="email"]', 'server@example.com');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');

    // Waiter should be redirected to waiter interface
    await expect(page).toHaveURL(/.*(waiter|\/)/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.bg-red-50')).toBeVisible();
  });
});
