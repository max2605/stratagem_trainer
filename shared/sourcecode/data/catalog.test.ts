import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Pack } from '../core/types';
import { validatePack } from '../core/packs';

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = readJson('../../application/configs/index.json') as { packs: string[]; totalStratagems: number; verifiedAt: string };
const builtInPacks = manifest.packs.map((file) => readJson(`../../application/configs/${file}`)) as Pack[];
const languages: Record<string, Record<string, string>> = {
  de: readJson('../../application/lang/de.json'),
  en: readJson('../../application/lang/en.json'),
};

describe('shipped catalog', () => {
  it('loads only manifest packs, each accepted by the import validator', () => {
    assert.equal(builtInPacks.length, manifest.packs.length);
    for (const pack of builtInPacks) assert.deepEqual(validatePack(pack), pack);
    assert.equal(new Set(builtInPacks.map((pack) => pack.id)).size, builtInPacks.length);
  });

  it('includes every released Warbond and keeps empty packs explicit', () => {
    const warbonds = builtInPacks.filter((pack) => pack.kind === 'warbond');
    assert.equal(warbonds.length, 25);
    assert.equal(warbonds.filter((pack) => pack.stratagems.length === 0).length, 11);
    assert.equal(warbonds.flatMap((pack) => pack.stratagems).length, 29);
    assert.ok(warbonds.every((pack) => (pack.releaseDate ?? '') <= manifest.verifiedAt));
  });

  it('has unique item identities and the documented total', () => {
    const items = builtInPacks.flatMap((pack) => pack.stratagems);
    assert.equal(items.length, manifest.totalStratagems);
    assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  });

  it('preserves mission variants and corrected Warbond associations', () => {
    const findPack = (id: string) => builtInPacks.find((pack) => pack.id === id)!;
    const findItem = (id: string) => builtInPacks.flatMap((pack) => pack.stratagems).find((item) => item.id === id)!;
    assert.deepEqual(findItem('sssd-delivery').sequence, ['down', 'down', 'down', 'up', 'up']);
    assert.deepEqual(findItem('sssd-delivery-automaton').sequence, ['down', 'down', 'down', 'down', 'down', 'up', 'up']);
    assert.deepEqual(findItem('b-100-portable-hellbomb').sequence, ['down', 'right', 'up', 'up', 'up']);
    assert.deepEqual(findItem('portable-hellbomb-spore-lung').sequence, ['down', 'right', 'up', 'up', 'down']);
    assert.ok(findPack('base-game').stratagems.some((item) => item.id === 'td-220-bastion-mk-xvi'));
    assert.ok(!findPack('siege-breakers').stratagems.some((item) => item.id === 'td-220-bastion-mk-xvi'));
    assert.deepEqual(findPack('castellan-s-creed').stratagems[0].sequence, ['down', 'left', 'up', 'left', 'left', 'down']);
    assert.deepEqual(findPack('ironclad-democracy').stratagems, []);
  });
});

describe('language dictionaries', () => {
  it('supplies the same nonempty string keys in every shipped language', () => {
    const englishKeys = Object.keys(languages.en).sort();
    for (const dictionary of Object.values(languages)) {
      assert.deepEqual(Object.keys(dictionary).sort(), englishKeys);
      assert.ok(Object.values(dictionary).every((value) => typeof value === 'string' && value.trim().length > 0));
    }
  });
});
