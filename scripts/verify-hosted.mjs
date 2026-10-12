import { chromium, devices } from '@playwright/test';
import assert from 'node:assert/strict';

const url = 'https://max2605.github.io/stratagem_trainer/';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    defaultBrowserType: 'chromium',
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, {
    timeout: 45000,
  });
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(scope, url);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Start training' }).click();
  const sequence = await page.locator('[data-direction]').evaluateAll((nodes) =>
    nodes.map((node) => node.dataset.direction),
  );
  for (const direction of sequence) await page.getByTestId(`pad-${direction}`).tap();
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('stratagem-trainer-profile-v1')).statistics.completed,
    ),
    1,
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
  console.log('Hosted mobile PWA: scoped worker, offline reload, touch input and one-screen layout passed.');
} finally {
  await browser.close();
}
