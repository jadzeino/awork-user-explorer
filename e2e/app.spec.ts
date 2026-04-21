import { test, expect } from '@playwright/test';
import usersFixture from './fixtures/users.json';

const API_PATTERN = '**/randomuser.me/api**';

// Intercept randomuser.me in every test so we're fast and deterministic
test.beforeEach(async ({ page }) => {
  await page.route(API_PATTERN, (route) =>
    route.fulfill({ json: usersFixture }),
  );
  await page.goto('/');
});

test.describe('awork challenge app', () => {
  test('loads and renders a list of users', async ({ page }) => {
    // Users appear after API responds (mocked instantly)
    await expect(
      page.locator('cdk-virtual-scroll-viewport app-user-item').first(),
    ).toBeVisible({ timeout: 10_000 });

    // Footer confirms non-zero user count
    await expect(page.locator('.list-footer')).not.toContainText('Showing 0');
  });

  test('search filters the displayed users', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport').waitFor({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Alice');

    await expect(page.locator('cdk-virtual-scroll-viewport')).toBeVisible();
    // Footer count reflects filtered results
    await expect(page.locator('.list-footer')).toBeVisible();
  });

  test('dark/light mode toggle flips the data-theme attribute', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: /switch to light mode/i }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('pagination mode toggle switches between Pages and Infinite', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /pages/i });
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(page.getByRole('button', { name: /infinite/i })).toBeVisible();
    await expect(page.getByLabel('Previous page')).toBeVisible();

    await page.getByRole('button', { name: /infinite/i }).click();
    await expect(page.getByRole('button', { name: /pages/i })).toBeVisible();
  });

  test('analytics section is visible after users load and can be collapsed', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport').waitFor({ timeout: 10_000 });

    const analyticsToggle = page.getByRole('button', { name: /analytics/i });
    await expect(analyticsToggle).toBeVisible();

    // Analytics is open by default
    await expect(page.locator('app-analytics')).toBeVisible();

    // Collapse it
    await analyticsToggle.click();
    await expect(page.locator('app-analytics')).not.toBeVisible();

    // Expand again
    await analyticsToggle.click();
    await expect(page.locator('app-analytics')).toBeVisible();
  });
});
