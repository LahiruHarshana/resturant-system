import { test } from '@playwright/test';

test.describe('Cashier Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager/cashier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('should view open tickets and process payment', async ({ page }) => {
    await page.goto('/cashier');
    
    // Select an open ticket if available
    const ticketRow = page.locator('table tbody tr').first();
    if (await ticketRow.isVisible()) {
      await ticketRow.click();
      await page.waitForURL('**/cashier/tickets/*');

      // Click pay/settle
      const payBtn = page.getByRole('button', { name: /Pay|Settle/i });
      if (await payBtn.isVisible()) {
        await payBtn.click();
        
        // Confirm payment
        const confirmBtn = page.getByRole('button', { name: /Confirm/i });
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });
});
