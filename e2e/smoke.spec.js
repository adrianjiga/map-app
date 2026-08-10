import { test, expect } from '@playwright/test';

const MAP_CLICK = { position: { x: 640, y: 400 } };

async function addRunningWorkout(page) {
  await page.locator('#map').click(MAP_CLICK);
  await page.locator('.form__input--distance').fill('5');
  await page.locator('.form__input--duration').fill('30');
  await page.locator('.form__input--cadence').fill('170');
  await page.locator('.form__input--cadence').press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/map-app/');
  await expect(page.locator('#map.leaflet-container')).toBeVisible();
});

test('map initialises from geolocation', async ({ page }) => {
  await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
});

test('default marker icons load in the production build', async ({ page }) => {
  await addRunningWorkout(page);

  const icon = page.locator('.leaflet-marker-icon').first();
  await expect(icon).toBeVisible();

  // A 404'd icon is still "visible" to Leaflet but decodes to nothing. This is
  // the assertion that catches the Vite/Leaflet icon-path regression.
  await expect
    .poll(() => icon.evaluate((img) => img.naturalWidth))
    .toBeGreaterThan(0);
});

test('adding a workout renders a card and a popup', async ({ page }) => {
  await addRunningWorkout(page);

  const card = page.locator('.workout');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveClass(/workout--running/);
  await expect(card.locator('.workout__value').first()).toHaveText('5');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Running');
});

test('cycling workouts use the elevation field', async ({ page }) => {
  await page.locator('#map').click(MAP_CLICK);
  await page.locator('.form__input--type').selectOption('cycling');
  await page.locator('.form__input--distance').fill('20');
  await page.locator('.form__input--duration').fill('60');
  await page.locator('.form__input--elevation').fill('300');
  await page.locator('.form__input--elevation').press('Enter');

  const card = page.locator('.workout');
  await expect(card).toHaveClass(/workout--cycling/);
  await expect(card).toContainText('300');
});

test('invalid input surfaces the error banner and adds nothing', async ({
  page,
}) => {
  await page.locator('#map').click(MAP_CLICK);
  await page.locator('.form__input--distance').fill('-5');
  await page.locator('.form__input--duration').fill('30');
  await page.locator('.form__input--cadence').fill('170');
  await page.locator('.form__input--cadence').press('Enter');

  await expect(page.locator('.error-banner')).toBeVisible();
  await expect(page.locator('.workout')).toHaveCount(0);
});

test('workouts survive a reload', async ({ page }) => {
  await addRunningWorkout(page);
  await expect(page.locator('.workout')).toHaveCount(1);

  await page.reload();

  await expect(page.locator('.workout')).toHaveCount(1);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
});

test('clicking a stored workout pans the map without erroring', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await addRunningWorkout(page);
  await page.reload();

  // Clicking the moment the card appears exercises the window where the
  // sidebar exists but the map has not resolved yet.
  await page.locator('.workout').click();
  await expect(page.locator('.leaflet-container')).toBeVisible();

  expect(errors).toEqual([]);
});
