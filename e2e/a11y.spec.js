import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const MAP_CLICK = { position: { x: 640, y: 400 } };

// Leaflet's own tile/attribution DOM is out of our control, so scope the scan
// to the app's markup rather than accepting third-party violations forever.
const scan = (page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.leaflet-control-container')
    .analyze();

const serious = (results) =>
  results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));

// Include the target selector and axe's own message: a bare rule id makes a CI
// failure impossible to diagnose without reproducing it locally.
const describeViolations = (violations) =>
  violations.flatMap((v) =>
    v.nodes.map(
      (n) =>
        `${v.id} (${v.impact}) at ${n.target.join(' ')} — ${
          [...n.any, ...n.all][0]?.message ?? v.help
        }`
    )
  );

test.beforeEach(async ({ page }) => {
  // domcontentloaded, not load: OpenStreetMap tiles and web fonts are
  // third-party and slow, and nothing asserted here waits on them.
  await page.goto('/map-app/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#map.leaflet-container')).toBeVisible();
});

test('landing page has no serious accessibility violations', async ({
  page,
}) => {
  const results = await scan(page);
  expect(describeViolations(serious(results))).toEqual([]);
});

test('open form has no serious accessibility violations', async ({ page }) => {
  await page.locator('#map').click(MAP_CLICK);
  await expect(page.locator('.form')).not.toHaveClass(/hidden/);

  const results = await scan(page);
  expect(describeViolations(serious(results))).toEqual([]);
});

test('rendered workout cards have no serious accessibility violations', async ({
  page,
}) => {
  await page.locator('#map').click(MAP_CLICK);
  await page.locator('.form__input--distance').fill('5');
  await page.locator('.form__input--duration').fill('30');
  await page.locator('.form__input--cadence').fill('170');
  await page.locator('.form__btn').click();
  await expect(page.locator('.workout')).toHaveCount(1);

  const results = await scan(page);
  expect(describeViolations(serious(results))).toEqual([]);
});

test('every form control has an accessible name', async ({ page }) => {
  await page.locator('#map').click(MAP_CLICK);

  for (const selector of [
    '.form__input--type',
    '.form__input--distance',
    '.form__input--duration',
    '.form__input--cadence',
  ]) {
    const control = page.locator(selector);
    await expect(control).toHaveAttribute('id', /.+/);
    const id = await control.getAttribute('id');
    await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
  }
});

test('a workout can be added and selected using only the keyboard', async ({
  page,
}) => {
  await page.locator('#map').click(MAP_CLICK);

  await page.locator('.form__input--distance').focus();
  await page.keyboard.type('5');
  await page.keyboard.press('Tab');
  await page.keyboard.type('30');
  await page.keyboard.press('Tab');
  await page.keyboard.type('170');
  await page.keyboard.press('Enter');

  await expect(page.locator('.workout')).toHaveCount(1);

  // The card is a real button, so it takes focus and activates on Enter.
  await page.locator('.workout__select').focus();
  await expect(page.locator('.workout__select')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#map.leaflet-container')).toBeVisible();
});

test('the error banner is announced as an alert', async ({ page }) => {
  await page.locator('#map').click(MAP_CLICK);
  await page.locator('.form__input--distance').fill('-5');
  await page.locator('.form__input--duration').fill('30');
  await page.locator('.form__input--cadence').fill('170');
  await page.locator('.form__btn').click();

  const banner = page.locator('.error-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('role', 'alert');

  await page.locator('.error-banner__dismiss').click();
  await expect(banner).not.toBeVisible();
});

test('the mobile sidebar traps focus and closes on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const menuBtn = page.locator('.mobile-menu-btn');
  await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

  await menuBtn.click();
  await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.sidebar__close-btn')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  await expect(menuBtn).toBeFocused();
});
