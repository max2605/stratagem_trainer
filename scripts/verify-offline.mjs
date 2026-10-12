import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const url='http://127.0.0.1:5174';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5174','--strictPort'],{stdio:['ignore','pipe','pipe']});
let output='';
for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{output=(output+data.toString()).slice(-4000);});
let browser;
try {
  const deadline=Date.now()+20000;
  while(true){
    const ready=await fetch(url,{signal:AbortSignal.timeout(1000)}).then(r=>r.ok,()=>false);
    if(ready)break;
    if(server.exitCode!==null||Date.now()>deadline)throw new Error('Preview failed to start: '+output);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  browser=await chromium.launch();const context=await browser.newContext({locale:'en-US'});const page=await context.newPage();
  page.on('pageerror',error=>console.log('Page error: '+error.message));
  page.on('requestfailed',request=>console.log('Failed: '+request.url()+' '+request.failure()?.errorText));
  page.on('console',message=>{if(message.type()==='error')console.log(message.text());});
  await page.goto(url);await page.waitForFunction(()=>!!navigator.serviceWorker.controller,undefined,{timeout:20000});await page.reload();
  assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller),'Service worker must control the page');
  await context.setOffline(true);await page.reload();
  await page.getByRole('button',{name:'Start training'}).click();
  const sequence=await page.locator('[data-direction]').evaluateAll(nodes=>nodes.map(node=>node.dataset.direction));const keys={up:'w',down:'s',left:'a',right:'d'};
  for(const direction of sequence)await page.keyboard.press(keys[direction]);
  const completed=await page.evaluate(()=>JSON.parse(localStorage.getItem('stratagem-trainer-profile-v1')).statistics.completed);assert.equal(completed,1);
  const config=await page.evaluate(async()=>{const response=await fetch('./configs/base-game.json');return response.json();});assert.equal(config.schemaVersion,1);
  console.log('Production PWA: offline reload, training, storage and config assets passed.');
} finally {if(browser)await browser.close();server.kill();}
