import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve(process.argv[2] || 'release');
const lines = [];
for (const filename of (await readdir(directory)).sort()) {
  if (filename === 'SHA256SUMS.txt' || !(await stat(path.join(directory, filename))).isFile()) continue;
  lines.push(`${createHash('sha256').update(await readFile(path.join(directory, filename))).digest('hex')}  ${filename}`);
}
await writeFile(path.join(directory, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
console.log(`Checksummed ${lines.length} release artifacts.`);
