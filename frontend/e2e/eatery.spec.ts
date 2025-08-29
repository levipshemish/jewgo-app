import { test, expect } from '@playwright/test';

test.describe('Eatery page', () => {
  test.skip('infinite scroll sentinel and pagination', async ({ page }) => {
    await page.goto('/eatery');
    await expect(page.getByTestId('gpl-grid')).toBeVisible();
  });
});
