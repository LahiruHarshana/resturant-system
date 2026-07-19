import { test, expect } from '@playwright/test';

test.describe('Waiter Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as server
    await page.goto('/login');
    await page.getByRole('button', { name: 'Use PIN Login' }).click();
    await page.fill('input[name="email"]', 'server@example.com');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('should create a new ticket', async ({ page }) => {
    // Navigate to floor plan if not already there
    await page.goto('/waiter/floor');
    
    // Select a table (e.g., T1)
    await page.getByText('T1').click();
    
    // Click Open Table
    const openTicketBtn = page.getByRole('button', { name: /Open Table/i });
    await openTicketBtn.click();
    
    // Should navigate to ticket view
    await page.waitForURL('**/tickets/**');

    // Add a menu item
    await page.getByText('House Salad').click();
    
    // Select modifier if prompted (Ranch)
    const ranchOption = page.getByText('Ranch');
    await ranchOption.click();
    await page.getByRole('button', { name: /Add to Ticket/i }).click();

    // Fire the order
    await page.getByRole('button', { name: /Review/i }).click();
    await page.getByRole('button', { name: /Fire/i }).click();

    // Verify status changes to OPEN or items appear in ticket
    await expect(page.getByText('House Salad').first()).toBeVisible();
  });
});
