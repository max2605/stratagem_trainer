import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('shared/application/configs', 'dist/configs', { recursive: true });
await cp('shared/application/lang', 'dist/lang', { recursive: true });
async function files(dir) { const entries = await readdir(dir, { withFileTypes: true }); return (await Promise.all(entries.map(async e => e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat(); }
const assets = (await files('dist')).map(f => './' + f.slice(5)).filter(f => f !== './sw.js');
await writeFile('dist/sw.js', `
const PREFIX='stratagem:'+self.registration.scope+':';
const CACHE=PREFIX+${JSON.stringify(Date.now().toString())};
const FILES=${JSON.stringify(['./', ...assets])};
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  // Bundled files are identical for every request Origin; module requests may
  // carry Origin where the installation request did not (Vary: Origin).
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,{ignoreVary:true})).then(r=>r||fetch(e.request)));
});
`);
