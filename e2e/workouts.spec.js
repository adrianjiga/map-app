import { test, expect } from '@playwright/test';

async function addWorkout(page, { x, y, distance, duration, cadence }) {
  await page.locator('#map').click({ position: { x, y } });
  await page.locator('.form__input--distance').fill(distance);
  await page.locator('.form__input--duration').fill(duration);
  await page.locator('.form__input--cadence').fill(cadence);
  await page.locator('.form__btn').click();
}

test.beforeEach(async ({ page }) => {
  // domcontentloaded, not load: OpenStreetMap tiles and web fonts are
  // third-party and slow, and nothing asserted here waits on them.
  await page.goto('/map-app/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#map.leaflet-container')).toBeVisible();
});

test('empty state shows until the first workout, then returns', async ({
  page,
}) => {
  const empty = page.locator('.workouts__empty');
  await expect(empty).toBeVisible();

  await addWorkout(page, {
    x: 640,
    y: 400,
    distance: '5',
    duration: '30',
    cadence: '170',
  });
  await expect(empty).toBeHidden();

  await page.locator('.workout__delete').click();
  await expect(empty).toBeVisible();
});

test('summary totals distance and duration across workouts', async ({
  page,
}) => {
  await addWorkout(page, {
    x: 500,
    y: 300,
    distance: '5',
    duration: '30',
    cadence: '170',
  });
  await addWorkout(page, {
    x: 700,
    y: 450,
    distance: '7.5',
    duration: '45',
    cadence: '175',
  });

  await expect(page.locator('[data-summary="count"]')).toHaveText('2');
  await expect(page.locator('[data-summary="distance"]')).toHaveText('12.5');
  await expect(page.locator('[data-summary="duration"]')).toHaveText('1h 15m');
});

test('deleting a workout removes its marker and survives a reload', async ({
  page,
}) => {
  await addWorkout(page, {
    x: 500,
    y: 300,
    distance: '5',
    duration: '30',
    cadence: '170',
  });
  await addWorkout(page, {
    x: 700,
    y: 450,
    distance: '8',
    duration: '40',
    cadence: '175',
  });
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);

  await page.locator('.workout').first().locator('.workout__delete').click();

  await expect(page.locator('.workout')).toHaveCount(1);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.workout')).toHaveCount(1);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
});

test('clear all requires confirmation and then wipes everything', async ({
  page,
}) => {
  await addWorkout(page, {
    x: 640,
    y: 400,
    distance: '5',
    duration: '30',
    cadence: '170',
  });

  const clearBtn = page.locator('[data-action="clear"]');
  await clearBtn.click();
  await expect(clearBtn).toHaveText('Confirm clear?');
  await expect(page.locator('.workout')).toHaveCount(1);

  await clearBtn.click();
  await expect(page.locator('.workout')).toHaveCount(0);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
  await expect(page.locator('.sidebar__actions')).toBeHidden();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.workout')).toHaveCount(0);
});

test('fit to markers brings every workout into view', async ({ page }) => {
  await addWorkout(page, {
    x: 520,
    y: 200,
    distance: '5',
    duration: '30',
    cadence: '170',
  });
  await addWorkout(page, {
    x: 700,
    y: 640,
    distance: '8',
    duration: '40',
    cadence: '175',
  });

  await page.locator('.leaflet-control-zoom-out').click();
  await page.locator('.leaflet-control-zoom-out').click();
  await page.waitForTimeout(500);

  await page.locator('[data-action="fit"]').click();
  await page.waitForTimeout(800);

  const mapBox = await page.locator('#map').boundingBox();
  const icons = page.locator('.leaflet-marker-icon');
  await expect(icons).toHaveCount(2);

  for (let i = 0; i < 2; i += 1) {
    const box = await icons.nth(i).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(mapBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(mapBox.x + mapBox.width);
    expect(box.y).toBeGreaterThanOrEqual(mapBox.y);
    expect(box.y + box.height).toBeLessThanOrEqual(mapBox.y + mapBox.height);
  }
});

test('selecting a workout opens its popup', async ({ page }) => {
  await addWorkout(page, {
    x: 520,
    y: 250,
    distance: '5',
    duration: '30',
    cadence: '170',
  });
  await addWorkout(page, {
    x: 690,
    y: 600,
    distance: '8',
    duration: '40',
    cadence: '175',
  });

  await page.locator('.leaflet-popup-close-button').first().click();
  await page.locator('.workout').last().locator('.workout__select').click();

  await expect(page.locator('.leaflet-popup-content').first()).toContainText(
    'Running'
  );
});

test('editing a workout updates it in place', async ({ page }) => {
  await addWorkout(page, {
    x: 400,
    y: 250,
    distance: '5',
    duration: '30',
    cadence: '170',
  });
  await addWorkout(page, {
    x: 600,
    y: 500,
    distance: '8',
    duration: '40',
    cadence: '175',
  });

  const target = page.locator('.workout').last();
  await target.locator('.workout__edit').click();

  await expect(page.locator('.form__input--distance')).toHaveValue('5');
  await expect(page.locator('.form__btn')).toHaveText('Save changes');

  await page.locator('.form__input--distance').fill('12');
  await page.locator('.form__btn').click();

  // Still two cards, and the edited one kept its position at the end.
  await expect(page.locator('.workout')).toHaveCount(2);
  await expect(page.locator('.workout').last()).toContainText('12');
  await expect(page.locator('[data-summary="distance"]')).toHaveText('20');
  await expect(page.locator('.form__btn')).toHaveText('Add workout');
});

test('an edit can change the workout type', async ({ page }) => {
  await addWorkout(page, {
    x: 500,
    y: 300,
    distance: '5',
    duration: '30',
    cadence: '170',
  });

  await page.locator('.workout__edit').click();
  await page.locator('.form__input--type').selectOption('cycling');
  await page.locator('.form__input--elevation').fill('250');
  await page.locator('.form__btn').click();

  const card = page.locator('.workout');
  await expect(card).toHaveClass(/workout--cycling/);
  await expect(card).toContainText('250');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.workout')).toHaveClass(/workout--cycling/);
});

test('edits survive a reload', async ({ page }) => {
  await addWorkout(page, {
    x: 500,
    y: 300,
    distance: '5',
    duration: '30',
    cadence: '170',
  });

  await page.locator('.workout__edit').click();
  await page.locator('.form__input--duration').fill('99');
  await page.locator('.form__btn').click();
  await expect(page.locator('.workout')).toContainText('99');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.workout')).toContainText('99');
  await expect(page.locator('.workout')).toHaveCount(1);
});

test('clicking the map cancels a pending edit', async ({ page }) => {
  await addWorkout(page, {
    x: 400,
    y: 250,
    distance: '5',
    duration: '30',
    cadence: '170',
  });

  await page.locator('.workout__edit').click();
  await expect(page.locator('.form__btn')).toHaveText('Save changes');

  await page.locator('#map').click({ position: { x: 650, y: 550 } });

  await expect(page.locator('.form__btn')).toHaveText('Add workout');
  await expect(page.locator('.form__input--distance')).toHaveValue('');
});

async function addCycling(page, { x, y, distance, duration, elevation }) {
  await page.locator('#map').click({ position: { x, y } });
  await page.locator('.form__input--type').selectOption('cycling');
  await page.locator('.form__input--distance').fill(distance);
  await page.locator('.form__input--duration').fill(duration);
  await page.locator('.form__input--elevation').fill(elevation);
  await page.locator('.form__btn').click();
}

async function seedMixed(page) {
  await addWorkout(page, {
    x: 250,
    y: 200,
    distance: '2',
    duration: '15',
    cadence: '170',
  });
  await addCycling(page, {
    x: 450,
    y: 350,
    distance: '30',
    duration: '80',
    elevation: '250',
  });
  await page.locator('#map').click({ position: { x: 620, y: 520 } });
  await page.locator('.form__input--type').selectOption('running');
  await page.locator('.form__input--distance').fill('10');
  await page.locator('.form__input--duration').fill('55');
  await page.locator('.form__input--cadence').fill('175');
  await page.locator('.form__btn').click();
  await expect(page.locator('.workout')).toHaveCount(3);
}

test('view controls appear only once a workout exists', async ({ page }) => {
  await expect(page.locator('.workout-controls')).toBeHidden();

  await addWorkout(page, {
    x: 400,
    y: 300,
    distance: '5',
    duration: '30',
    cadence: '170',
  });

  await expect(page.locator('.workout-controls')).toBeVisible();
});

test('sorting reorders the sidebar list', async ({ page }) => {
  await seedMixed(page);

  await page.locator('[data-control="sort"]').selectOption('distance');
  await expect(
    page.locator('.workout').first().locator('.workout__value').first()
  ).toHaveText('30');

  await page.locator('[data-control="sort"]').selectOption('oldest');
  await expect(
    page.locator('.workout').first().locator('.workout__value').first()
  ).toHaveText('2');
});

test('filtering hides both the cards and their markers', async ({ page }) => {
  await seedMixed(page);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3);

  await page.locator('[data-control="filter"]').selectOption('cycling');

  await expect(page.locator('.workout')).toHaveCount(1);
  await expect(page.locator('.workout')).toHaveClass(/workout--cycling/);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  await expect(page.locator('[data-summary="count"]')).toHaveText('1');

  await page.locator('[data-control="filter"]').selectOption('all');
  await expect(page.locator('.workout')).toHaveCount(3);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3);
});

test('a filter with no matches explains itself', async ({ page }) => {
  await addWorkout(page, {
    x: 400,
    y: 300,
    distance: '5',
    duration: '30',
    cadence: '170',
  });

  await page.locator('[data-control="filter"]').selectOption('cycling');

  const empty = page.locator('.workouts__empty');
  await expect(empty).toBeVisible();
  await expect(empty).toContainText('cycling');
});

test('the active view survives adding and deleting workouts', async ({
  page,
}) => {
  await seedMixed(page);
  await page.locator('[data-control="filter"]').selectOption('running');
  await page.locator('[data-control="sort"]').selectOption('distance');
  await expect(page.locator('.workout')).toHaveCount(2);

  await page.locator('.workout').first().locator('.workout__delete').click();

  await expect(page.locator('.workout')).toHaveCount(1);
  await expect(page.locator('.workout')).toContainText('2');
  // The cycling workout is untouched, just filtered out.
  await page.locator('[data-control="filter"]').selectOption('all');
  await expect(page.locator('.workout')).toHaveCount(2);
});
