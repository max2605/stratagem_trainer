import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const gh = process.env.GH_EXECUTABLE || (process.platform === 'win32' ? 'C:/Program Files/GitHub CLI/gh.exe' : 'gh');
const steps = JSON.parse(await readFile('codex/steps.json', 'utf8'));
await mkdir('codex/issues', { recursive: true });
let linked = {}; try { linked = JSON.parse(await readFile('codex/issues.json', 'utf8')); } catch {}
for (const step of steps) {
  if (linked[step.key]) continue;
  const path = `codex/issues/${step.key}.md`; await writeFile(path, step.body + '\n');
  const url = execFileSync(gh, ['issue', 'create', '--repo', 'max2605/stratagem_trainer', '--title', step.title, '--body-file', path], { encoding: 'utf8' }).trim();
  linked[step.key] = { url, number: Number(url.split('/').pop()) };
  await writeFile('codex/issues.json', JSON.stringify(linked, null, 2) + '\n');
  console.log(`${step.key}: ${url}`);
}
