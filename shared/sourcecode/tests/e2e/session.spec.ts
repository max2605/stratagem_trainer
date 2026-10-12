import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { DEFAULT_KEY_BINDINGS, emptyStatistics, type Direction, type Pack } from '../../core';
import type { Profile } from '../../ui/profile';

const storageKey = 'stratagem-trainer-profile-v1';
const practicePack: Pack = {
  schemaVersion: 1,
  id: 'session-practice',
  name: 'Session practice',
  kind: 'custom',
  stratagems: [{ id: 'command', name: 'Practice command', sequence: ['up', 'right', 'down'] }],
};

function fixture(): Profile {
  return {
    customPacks: [structuredClone(practicePack)],
    selectedPackIds: [practicePack.id],
    groups: [{ id: 'practice-group', name: 'Saved group', items: ['session-practice:command'] }],
    favorites: ['session-practice:command'],
    settings: {
      language: 'en', display: 'arrows', labels: { up: 'W', down: 'S', left: 'A', right: 'D' },
      keys: structuredClone(DEFAULT_KEY_BINDINGS), sound: false, haptics: false,
      repeatMistakes: true, showHint: true, timeLimit: 0, leftHand: false, reducedMotion: true,
    },
    statistics: emptyStatistics(),
  };
}

async function storedProfile(page: Page): Promise<Profile> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function replaceProfile(page: Page, profile: Profile): Promise<void> {
  // Apply the fixture before React mounts on reload, so a pending save cannot overwrite it.
  await page.evaluate((profile) => sessionStorage.setItem('test-pending-profile', JSON.stringify(profile)), profile);
  await page.reload();
}

async function finishCommand(page: Page): Promise<void> {
  for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown']) await page.keyboard.press(key);
}

test.beforeEach(async ({ page }, testInfo) => {
  const timerTest = testInfo.title.startsWith('pausing') || testInfo.title.startsWith('an expired');
  const profile = fixture();
  if (timerTest) {
    profile.settings.timeLimit = 3;
    await page.clock.install({ time: new Date('2026-10-12T12:00:00Z') });
  }
  await page.addInitScript(({ key, profile }) => {
    const pending = sessionStorage.getItem('test-pending-profile');
    if (pending) {
      localStorage.setItem(key, pending);
      sessionStorage.removeItem('test-pending-profile');
    } else if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(profile));
  }, { key: storageKey, profile });
  await page.goto('/');
  await expect(page.getByTestId('current-name')).toHaveText('Practice command');
  if (timerTest) await page.clock.pauseAt(new Date('2026-10-12T12:01:00Z'));
});

test('pausing freezes the countdown and excludes inactive time from command statistics', async ({ page }) => {
  await page.clock.runFor(10);
  await page.getByRole('button', { name: 'Start training' }).click();
  await page.keyboard.press('ArrowUp');
  await page.clock.runFor(250);
  await page.getByRole('button', { name: 'Pause' }).click();
  const pausedRemaining = await page.locator('.timer').textContent();
  await page.clock.runFor(10000);
  await expect(page.locator('.timer')).toHaveText(pausedRemaining!);
  await expect(page.getByTestId('sequence').locator('.entered')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(300);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await storedProfile(page)).statistics.completed).toBe(1);
  const measured = (await storedProfile(page)).statistics.perStratagem['session-practice:command']!.bestDurationMs!;
  expect(measured).toBeGreaterThanOrEqual(540);
  expect(measured).toBeLessThanOrEqual(560);
  await expect(page.locator('.timer')).toHaveText('3.0 seconds remaining');
});

test('an expired command counts one mistake, clears its prefix, and survives reload', async ({ page }) => {
  await page.clock.runFor(10);
  await page.getByRole('button', { name: 'Start training' }).click();
  await page.keyboard.press('ArrowUp');
  await page.clock.runFor(3200);
  await expect(page.locator('.feedback')).toHaveText('Time expired — try again');
  await expect(page.getByTestId('sequence').locator('.entered')).toHaveCount(0);
  await expect.poll(async () => (await storedProfile(page)).statistics.mistakes).toBe(1);
  await page.clock.runFor(5000);
  expect((await storedProfile(page)).statistics.mistakes).toBe(1);
  expect((await storedProfile(page)).statistics.completed).toBe(0);
  await page.reload();
  expect((await storedProfile(page)).statistics.perStratagem['session-practice:command']!.mistakes).toBe(1);
  await page.getByRole('button', { name: 'Start training' }).click();
  await finishCommand(page);
  await expect.poll(async () => (await storedProfile(page)).statistics.completed).toBe(1);
});

test('the mistakes practice pool stays active when input updates lifetime statistics', async ({ page }) => {
  const profile = fixture();
  profile.statistics.mistakes = 1;
  profile.statistics.perStratagem['session-practice:command'] = {
    completed: 0, perfect: 0, mistakes: 1, totalDurationMs: 0, bestDurationMs: null,
  };
  await replaceProfile(page, profile);
  await page.getByRole('combobox', { name: 'Practice session', exact: true }).selectOption('mistakesMode');
  await page.getByRole('button', { name: 'Start training' }).click();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('sequence').locator('.entered')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await storedProfile(page)).statistics.completed).toBe(1);
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.locator('.training-options select').first()).toHaveValue('mistakesMode');
  await expect(page.getByTestId('current-name')).toHaveText('Practice command');
});

test('hidden hints stay hidden after a completed command until explicitly revealed', async ({ page }) => {
  const profile = fixture();
  profile.settings.showHint = false;
  await replaceProfile(page, profile);
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(page.getByTestId('sequence')).toHaveText('···');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('sequence')).toHaveText('↑··');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await storedProfile(page)).statistics.completed).toBe(1);
  await expect(page.getByTestId('sequence')).toHaveText('···');
  await page.getByRole('button', { name: 'Show sequence', exact: true }).click();
  await expect(page.getByTestId('sequence')).toHaveText('↑→↓');
});

test('exported backups restore progress, groups, favorites, packs, and input settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Start training' }).click();
  await finishCommand(page);
  await expect.poll(async () => (await storedProfile(page)).statistics.completed).toBe(1);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Input pad display', exact: true }).selectOption('custom');
  await page.getByLabel('Up', { exact: true }).fill('NORTH');
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  const content = await readFile((await download.path())!, 'utf8');
  const backup = JSON.parse(content);
  expect(backup.format).toBe('stratagem-trainer-backup');
  expect(backup.version).toBe(1);
  expect(backup.profile.statistics.completed).toBe(1);
  await replaceProfile(page, { ...fixture(), groups: [], favorites: [], customPacks: [], selectedPackIds: [] });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(content) });
  await expect(page.getByRole('alert')).toContainText('Backup restored');
  await expect.poll(async () => (await storedProfile(page)).statistics.completed).toBe(1);
  const restored = await storedProfile(page);
  expect(restored.groups).toEqual(backup.profile.groups);
  expect(restored.favorites).toEqual(backup.profile.favorites);
  expect(restored.customPacks).toEqual(backup.profile.customPacks);
  expect(restored.settings).toEqual(backup.profile.settings);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Training', exact: true }).click();
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(page.getByTestId('pad-up')).toContainText('NORTH');
});

test('backups larger than the individual JSON pack limit remain restorable', async ({ page }) => {
  const profile = fixture();
  const sourceUrl = `https://example.com/${'a'.repeat(1950)}`;
  profile.customPacks = Array.from({ length: 12 }, (_, packIndex) => ({
    schemaVersion: 1 as const, id: `large-${packIndex}`, name: `Large pack ${packIndex}`, kind: 'custom' as const,
    stratagems: Array.from({ length: 50 }, (_, itemIndex) => ({ id: `item-${itemIndex}`, name: `Item ${itemIndex}`, sequence: ['up', 'down'] as Direction[], source: [sourceUrl] })),
  }));
  profile.selectedPackIds = profile.customPacks.map((pack) => pack.id);
  profile.groups = [];
  profile.favorites = [];
  await replaceProfile(page, profile);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  const content = await readFile((await download.path())!, 'utf8');
  expect(Buffer.byteLength(content)).toBeGreaterThan(1024 * 1024);
  await replaceProfile(page, fixture());
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'large-backup.json', mimeType: 'application/json', buffer: Buffer.from(content) });
  await expect(page.getByRole('alert')).toContainText('Backup restored');
  await expect.poll(async () => (await storedProfile(page)).customPacks.filter((pack) => pack.id.startsWith('large-')).length).toBe(12);
});

