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

  test('agent mode replaces the filter UI and the normal label restores it', async ({ page }) => {
    // Normal mode: filter toggle and search bar visible
    await expect(page.getByRole('button', { name: /toggle filters/i })).toBeVisible();
    await expect(page.locator('app-command-bar')).toBeVisible();

    // Switch to agent mode
    await page.getByRole('button', { name: /agent/i }).click();
    await expect(page.locator('app-agent-mode')).toBeVisible();
    // Filter toggle and standard search bar are hidden in agent mode
    await expect(page.getByRole('button', { name: /toggle filters/i })).not.toBeVisible();
    await expect(page.locator('app-command-bar')).not.toBeVisible();

    // The NL input is present
    await expect(page.getByLabel('Natural language filter query')).toBeVisible();

    // Switch back to normal
    await page.getByRole('button', { name: /normal/i }).click();
    await expect(page.locator('app-agent-mode')).not.toBeVisible();
    await expect(page.locator('app-command-bar')).toBeVisible();
  });

  test('group by Age regroups the list and switching back to A–Z restores letter headers', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport').waitFor({ timeout: 10_000 });

    // Open filter drawer
    await page.getByRole('button', { name: /toggle filters/i }).click();

    // Switch to Age grouping
    await page.getByRole('group', { name: /group users by/i }).getByRole('button', { name: 'Age' }).click();

    // Age group headers appear (e.g. "20s", "30s", "40s", "50s")
    await expect(page.locator('.group-header').first()).toBeVisible({ timeout: 5_000 });

    // Switch back to A–Z
    await page.getByRole('group', { name: /group users by/i }).getByRole('button', { name: 'A–Z' }).click();

    // Letter group headers appear again
    await expect(page.locator('.group-header').first()).toBeVisible({ timeout: 5_000 });
  });

  test('sort by Name orders the list and Default restores original order', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport app-user-item').first().waitFor({ timeout: 10_000 });

    // Open filter drawer
    await page.getByRole('button', { name: /toggle filters/i }).click();

    // Apply Name sort
    await page.getByRole('group', { name: /sort users by/i }).getByRole('button', { name: 'Name' }).click();

    // List footer still shows all users (sort doesn't filter)
    await expect(page.locator('.list-footer')).not.toContainText('Showing 0');

    // Reset to Default
    await page.getByRole('group', { name: /sort users by/i }).getByRole('button', { name: 'Default' }).click();
    await expect(page.locator('.list-footer')).not.toContainText('Showing 0');
  });

  test('letter jump scrolls to that group and All clears it', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport').waitFor({ timeout: 10_000 });

    // Letter jump input is visible (A–Z grouping is default)
    const jumpInput = page.getByLabel('Jump to letter group');
    await expect(jumpInput).toBeVisible();

    // Type a letter that exists in our fixture (A for Alice)
    await jumpInput.fill('A');

    // "All" clear button appears
    await expect(page.getByLabel('Show all letter groups')).toBeVisible();

    // Clear it — the All button disappears
    await page.getByLabel('Show all letter groups').click();
    await expect(page.getByLabel('Show all letter groups')).not.toBeVisible();
  });

  test('"Restore Default" button appears after filtering and resets to full count', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport app-user-item').first().waitFor({ timeout: 10_000 });

    // "Restore Default" is not visible initially (no active filters)
    await expect(page.getByLabel('Restore default view')).not.toBeVisible();

    // Apply a gender filter
    await page.getByRole('button', { name: /toggle filters/i }).click();
    await page.getByRole('group', { name: /filter by gender/i }).getByRole('button', { name: 'Male', exact: true }).click();

    // Wait for filter to apply
    const footer = page.locator('.list-footer');
    const fullText = await footer.textContent();
    await expect(footer).not.toHaveText(fullText!, { timeout: 5_000 });

    // Close the drawer via the backdrop so it doesn't block the main area
    await page.locator('.users-page__backdrop').click();
    await expect(page.locator('.users-page__backdrop')).not.toBeVisible();

    // Restore Default button now visible — click it
    await expect(page.getByLabel('Restore default view')).toBeVisible();
    await page.getByLabel('Restore default view').click();

    // Count returns to full
    await expect(footer).toHaveText(fullText!, { timeout: 5_000 });
    await expect(page.getByLabel('Restore default view')).not.toBeVisible();
  });

  test('nationality filter narrows results and stacks with gender filter', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport app-user-item').first().waitFor({ timeout: 10_000 });

    // Open filter drawer
    await page.getByRole('button', { name: /toggle filters/i }).click();

    const footer = page.locator('.list-footer');
    const fullText = await footer.textContent();

    // Filter to DE (Germany) — fixture has 3 DE users
    await page.getByRole('group', { name: /filter by nationality/i }).getByRole('button', { name: 'DE' }).click();
    await expect(footer).not.toHaveText(fullText!, { timeout: 5_000 });

    // Stack gender = female on top — narrows further
    await page.getByRole('group', { name: /filter by gender/i }).getByRole('button', { name: /female/i }).click();
    const afterGender = await footer.textContent();
    const afterNat = await footer.textContent();
    // Female + DE must be ≤ DE-only count
    expect(afterGender).not.toBe(fullText);
    expect(afterNat).not.toContain('Showing 0');
  });

  test('save a filter preset and apply it to restore the same state', async ({ page }) => {
    await page.locator('cdk-virtual-scroll-viewport app-user-item').first().waitFor({ timeout: 10_000 });

    // Open filter drawer and apply a gender filter to create a non-default state
    await page.getByRole('button', { name: /toggle filters/i }).click();
    await page.getByRole('group', { name: /filter by gender/i }).getByRole('button', { name: /female/i }).click();

    const footer = page.locator('.list-footer');
    await expect(footer).not.toContainText('Showing 8', { timeout: 5_000 });
    const filteredText = await footer.textContent();

    // Save this filter configuration
    await page.locator('.saved-filters__save-btn').click();
    await expect(page.getByLabel('Filter name')).toBeVisible();
    await page.getByLabel('Filter name').fill('Female only');
    await page.getByLabel('Confirm').click();

    // Saved filter appears in the list (use title attribute to pick the apply button precisely)
    const applyBtn = page.locator('button[title="Apply: Female only"]');
    await expect(applyBtn).toBeVisible();

    // Reset all filters (click All gender chip)
    await page.getByRole('group', { name: /filter by gender/i }).getByRole('button', { name: 'All' }).click();
    await expect(footer).toHaveText('Showing 8 users', { timeout: 5_000 });

    // Apply the saved filter
    await applyBtn.click();
    await expect(footer).toHaveText(filteredText!, { timeout: 5_000 });

    // Clean up — delete the saved filter
    await page.getByRole('button', { name: 'Delete Female only' }).click();
    await expect(applyBtn).not.toBeVisible();
  });
});
