import { _electron } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';

const executable = process.argv[2];
const launch = executable
  ? { executablePath: path.resolve(executable), args: ['--smoke-test', ...process.argv.slice(3)] }
  : { args: ['.', '--smoke-test'] };
const app = await _electron.launch({ ...launch, timeout: 30_000 });
try {
  const window = await app.firstWindow();
  const errors = [];
  window.on('pageerror', (error) => errors.push(error.message));
  await window.waitForSelector('main');
  const result = await window.evaluate(async () => {
    const response = await fetch('./configs/index.json');
    const manifest = await response.json();
    localStorage.setItem('trainer-smoke-test', 'ok');
    const storage = localStorage.getItem('trainer-smoke-test');
    localStorage.removeItem('trainer-smoke-test');
    let rejectedDownload = '';
    try { await window.trainer.downloadPack('http://example.com/pack.json'); }
    catch (error) { rejectedDownload = error.message; }
    return {
      url: location.href,
      hasDownloader: typeof window.trainer?.downloadPack === 'function',
      storage,
      rejectedDownload,
      manifest,
      heading: document.querySelector('h1')?.textContent,
    };
  });
  assert.match(result.url, /^app:\/\/trainer\//);
  assert.equal(result.hasDownloader, true);
  assert.equal(result.storage, 'ok');
  assert.match(result.rejectedDownload, /HTTPS/);
  assert.ok(result.manifest && typeof result.manifest === 'object');
  assert.ok(result.heading);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ desktopSmokeTest: 'passed', heading: result.heading, origin: result.url }));
} finally {
  await app.close();
}
