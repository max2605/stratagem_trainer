import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const custom={schemaVersion:1,id:'test-pack',name:'Test Pack',kind:'custom',stratagems:[{id:'test-command',name:'Test Command',sequence:['up','right','down']}]};
test.beforeEach(async({page})=>{await page.goto('/');await page.getByRole('combobox',{name:'Language'}).selectOption('en');});
test('keyboard works immediately after Start and persists earned progress',async({page})=>{
 await page.getByRole('button',{name:'Start training'}).click();
 const directions=await page.getByTestId('sequence').locator('[data-direction]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.direction!));
 const keys:Record<string,string>={up:'w',down:'s',left:'a',right:'d'};
 for(const direction of directions)await page.keyboard.press(keys[direction]);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('stratagem-trainer-profile-v1')!).statistics.completed)).toBe(1);
 await page.reload();await page.getByRole('button',{name:'Progress',exact:true}).click();await expect(page.getByRole('cell',{name:'1',exact:true}).first()).toBeVisible();
});
test('JSON file import, export and custom group practice roundtrip',async({page})=>{
 await page.getByRole('button',{name:'Library',exact:true}).click();
 await page.locator('input[type=file]').first().setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))});
 const card=page.locator('details.pack-card').filter({has:page.getByRole('heading',{name:'Test Pack',exact:true})});
 await card.locator('summary').click();
 const downloaded=page.waitForEvent('download');await card.getByRole('button',{name:'Export JSON',exact:true}).click();const download=await downloaded;expect(JSON.parse(await readFile((await download.path())!,'utf8')).stratagems[0].sequence).toEqual(['up','right','down']);
 await card.getByRole('checkbox',{name:'Group Test Command',exact:true}).check();await page.getByRole('textbox',{name:'Group name'}).fill('My group');await page.getByRole('button',{name:'Save group'}).click();await page.getByRole('button',{name:'My group (1)'}).click();
 await page.getByRole('button',{name:'Start training'}).click();await expect(page.getByTestId('current-name')).toHaveText('Test Command');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('stratagem-trainer-profile-v1')!).statistics.completed)).toBe(1);
});
test('structured editor saves a new command and permits cleared descriptions',async({page})=>{
 await page.getByRole('button',{name:'Editor',exact:true}).click();await page.getByRole('textbox',{name:'Pack name',exact:true}).fill('Editor pack');await page.getByRole('textbox',{name:'Description',exact:true}).fill('Draft');await page.getByRole('textbox',{name:'Description',exact:true}).clear();
 await page.getByRole('button',{name:'Add stratagem',exact:true}).click();await page.getByRole('textbox',{name:'Stratagem name'}).fill('Editor command');await page.getByRole('button',{name:'Add stratagem Up',exact:true}).click();await page.getByRole('button',{name:'Add stratagem Right',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Saved');await page.reload();await page.getByRole('button',{name:'Library',exact:true}).click();await expect(page.getByRole('heading',{name:'Editor pack'})).toBeVisible();
});
test('invalid imports are rejected and HTTPS downloads are validated',async({page})=>{
 await page.getByRole('button',{name:'Library',exact:true}).click();await page.locator('input[type=file]').first().setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":1}')});await expect(page.getByRole('alert')).toContainText('Invalid JSON');
 await page.route('https://unit.example/pack.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(custom)}));await page.getByRole('textbox',{name:'Direct HTTPS link to a JSON file'}).fill('https://unit.example/pack.json');await page.getByRole('button',{name:'Load link'}).click();await expect(page.getByRole('heading',{name:'Test Pack'})).toBeVisible();
});
test('language, custom display and key mapping survive reload',async({page})=>{
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Input pad display').selectOption('custom');await page.getByLabel('Up',{exact:true}).fill('NORTH');await page.getByRole('button',{name:'↑ W / ↑',exact:true}).click();await page.keyboard.press('i');await page.reload();await page.getByRole('button',{name:'Start training'}).click();await expect(page.getByTestId('pad-up')).toContainText('NORTH');
 await page.getByRole('button',{name:'Pause'}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('combobox',{name:'Language'}).selectOption('de');await expect(page.getByRole('button',{name:'Einstellungen',exact:true})).toBeVisible();
});
test('pointer inputs register once and mobile pad uses half a screen',async({page},testInfo)=>{
 await page.getByRole('button',{name:'Library',exact:true}).click();await page.locator('input[type=file]').first().setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))});await page.getByRole('button',{name:'None',exact:true}).click();await page.getByRole('checkbox',{name:'Test Pack',exact:true}).check();await page.getByRole('button',{name:'Training',exact:true}).click();await page.getByRole('button',{name:'Start training'}).click();
 for(const d of ['up','right','down']){if(testInfo.project.use.isMobile)await page.getByTestId(`pad-${d}`).tap();else await page.getByTestId(`pad-${d}`).click();}
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('stratagem-trainer-profile-v1')!).statistics.completed)).toBe(1);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('stratagem-trainer-profile-v1')!).statistics.mistakes)).toBe(0);
 if(testInfo.project.use.isMobile){const box=await page.locator('.input-pad').boundingBox();expect(box!.height).toBeGreaterThanOrEqual((page.viewportSize()!.height*.5)-2);expect(box!.y+box!.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(page.viewportSize()!.height+1);}
});
