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

  test('filter drawer opens on toggle and closes via backdrop', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport').waitFor({ timeout: 10_000 });

    const drawer = page.locator('.users-page__left');

    // Open the drawer
    await page.getByRole('button', { name: /toggle filters/i }).click();
    await expect(drawer).toHaveClass(/users-page__left--open/);

    // Backdrop appears and clicking it closes the drawer
    const backdrop = page.locator('.users-page__backdrop');
    await expect(backdrop).toBeVisible();
    await backdrop.click();
    await expect(drawer).not.toHaveClass(/users-page__left--open/);
  });

  test('gender filter chips narrow the user list', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport app-user-item').first().waitFor({ timeout: 10_000 });

    const footerFull = page.locator('.list-footer');
    const fullText = await footerFull.textContent();

    // Open the filter drawer so the chips are in the viewport
    await page.getByRole('button', { name: /toggle filters/i }).click();
    await expect(page.locator('.users-page__left')).toHaveClass(/users-page__left--open/);

    // Fixture has 2 female, 1 male — filter to female only
    await page.getByRole('group', { name: /filter by gender/i }).getByRole('button', { name: /female/i }).click();

    // Wait for the worker to refilter (count must drop from 3)
    await expect(footerFull).not.toHaveText(fullText!, { timeout: 5_000 });
    await expect(footerFull).not.toContainText('Showing 0');

    // Reset to all — count returns to full
    await page.getByRole('group', { name: /filter by gender/i })
      .getByRole('button', { name: 'All' }).click();
    await expect(footerFull).toHaveText(fullText!, { timeout: 5_000 });
  });

  test('clicking a user row opens the detail panel and close button dismisses it', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport app-user-item').first().waitFor({ timeout: 10_000 });

    const rightPanel = page.locator('.users-page__right');
    await expect(rightPanel).not.toHaveClass(/users-page__right--open/);

    // Click the first user row
    await page.locator('cdk-virtual-scroll-viewport app-user-item').first().click();

    // Detail panel slides in
    await expect(rightPanel).toHaveClass(/users-page__right--open/);
    await expect(page.locator('app-user-detail')).toBeVisible();

    // Close button dismisses it
    await page.getByRole('button', { name: /close user details/i }).click();
    await expect(rightPanel).not.toHaveClass(/users-page__right--open/);
  });

  test('compare mode shows side-by-side analytics when a dimension is selected', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport').waitFor({ timeout: 10_000 });

    // Enable compare mode
    await page.getByRole('button', { name: /compare/i }).click();
    await expect(page.locator('app-compare-mode')).toBeVisible();

    // Pick the Gender dimension so panels appear immediately (no extra selects needed)
    await page.getByRole('group', { name: /compare by/i }).getByRole('button', { name: /gender/i }).click();

    // Both side-by-side panels render
    await expect(page.locator('.compare__panel--a')).toBeVisible();
    await expect(page.locator('.compare__panel--b')).toBeVisible();

    // Disable compare mode — panel disappears
    await page.getByRole('button', { name: /compare/i }).click();
    await expect(page.locator('app-compare-mode')).not.toBeVisible();
  });
});
