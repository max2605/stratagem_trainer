import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('build/screenshots', { recursive: true });
const browser = await chromium.launch();
for (const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  const page=await browser.newPage({viewport,locale:'de-DE',deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Training starten'}).click();
  await page.screenshot({path:`build/screenshots/${name}.png`,fullPage:true});await page.close();
}
await browser.close();
