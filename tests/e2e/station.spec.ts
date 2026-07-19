import { test, expect } from '@playwright/test';

test.describe('Station Flow', () => {
  let stationUrl = '';

  test.beforeAll(async ({ browser }) => {
    // Get station URL as admin first
    const page = await browser.newPage();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    await page.goto('/admin/stations');
    
    // Find Hot Line
    const hotLineRow = page.locator('tr').filter({ hasText: 'Hot Line' });
    const link = await hotLineRow.getByTitle('Launch Station').getAttribute('href');
    if (link) {
      stationUrl = link;
    }
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login as kitchen
    await page.goto('/login');
    await page.fill('input[name="email"]', 'kitchen@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('should view queue and process an item', async ({ page }) => {
    expect(stationUrl).toBeTruthy();
    await page.goto(stationUrl);
    
    // Wait for queue items to load
    const hasItems = await page.getByText(/T[0-9]+/).count() > 0;
    
    if (hasItems) {
      // Find a "Start" or "Bump" button (depending on UI for moving NEW -> PREPARING)
      const startBtn = page.getByRole('button', { name: /Start/i }).first();
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }

      // Find "Complete" or "Ready" button
      const readyBtn = page.getByRole('button', { name: /Ready|Complete/i }).first();
      if (await readyBtn.isVisible()) {
        await readyBtn.click();
      }
    }
  });
});
