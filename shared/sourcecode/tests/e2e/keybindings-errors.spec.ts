import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('en');
});

test('arrow and function keys can be reassigned and persist through training', async ({ page }) => {
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'mapping.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      schemaVersion: 1, id: 'mapping', name: 'Mapping test', kind: 'custom',
      stratagems: [{ id: 'command', name: 'Mapped command', sequence: ['up', 'down'] }],
    })),
  });
  await page.getByRole('button', { name: 'None', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mapping test', exact: true }).check();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Up Remove key 2', exact: true }).click();
  await page.getByRole('button', { name: 'Down Key bindings 2', exact: true }).click();
  await page.keyboard.press('ArrowUp');
  await page.getByRole('button', { name: 'Up Key bindings 1', exact: true }).click();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: 'Down Key bindings 1', exact: true }).click();
  await page.keyboard.press('F8');

  await page.getByRole('button', { name: 'Up Add key', exact: true }).click();
  await page.keyboard.press('F8');
  await expect(page.getByRole('alert')).toContainText('already used');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Up Add key', exact: true }).click();
  await page.keyboard.press('Shift');
  await expect(page.getByRole('alert')).not.toContainText('already used');
  await page.keyboard.press('Escape');

  await page.reload();
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(page.getByTestId('current-name')).toHaveText('Mapped command');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('F8');
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('stratagem-trainer-profile-v1')!).statistics.completed,
  )).toBe(1);
});

test('pack and malformed URL errors use the selected language', async ({ page }) => {
  for (const language of ['de', 'en']) {
    await page.getByRole('combobox', { name: /Language|Sprache/ }).selectOption(language);
    await page.getByRole('button', {
      name: language === 'de' ? 'Sammlung' : 'Library', exact: true,
    }).click();
    await page.locator('input[type=file]').first().setInputFiles({
      name: 'invalid.json', mimeType: 'application/json',
      buffer: Buffer.from('{"schemaVersion":1}'),
    });
    await expect(page.getByRole('alert')).toContainText('ID');
    await expect(page.getByRole('alert')).not.toContainText('invalid_id');
    await page.locator('input[type=url]').fill('%%%');
    await page.getByRole('button', {
      name: language === 'de' ? 'Link laden' : 'Load link', exact: true,
    }).click();
    await expect(page.getByRole('alert')).toContainText(language === 'de' ? 'Ungültige URL' : 'Invalid URL');
  }
});
