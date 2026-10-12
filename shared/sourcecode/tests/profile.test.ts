import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDirection, buildPool, createTrainingState, type Pack } from '../core';

Object.defineProperty(globalThis, 'navigator', { value: { language: 'de-DE' }, configurable: true });
Object.defineProperty(globalThis, 'matchMedia', {
  value: (query: string) => ({ matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }),
  configurable: true,
});

const stored = new Map<string, string>();
const storage: Storage = {
  get length() { return stored.size; },
  clear() { stored.clear(); },
  getItem(key: string) { return stored.get(key) ?? null; },
  key(index: number) { return [...stored.keys()][index] ?? null; },
  removeItem(key: string) { stored.delete(key); },
  setItem(key: string, value: string) { stored.set(key, String(value)); },
};
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

const { DEFAULT_SETTINGS, PROFILE_KEY, emptyProfile, loadProfile, validateProfile } = await import('../ui/profile');
type Profile = ReturnType<typeof emptyProfile>;

const customPack: Pack = {
  schemaVersion: 1,
  id: 'custom-practice',
  name: 'My practice',
  kind: 'custom',
  stratagems: [{ id: 'call', name: 'Call', sequence: ['up', 'down'] }],
};

function fixture(): Profile {
  const profile = emptyProfile(['base-game', customPack.id]);
  profile.customPacks = [structuredClone(customPack)];
  profile.groups = [{ id: 'practice', name: 'My group', items: ['custom-practice:call'] }];
  profile.favorites = ['custom-practice:call'];
  const initial = createTrainingState(buildPool([customPack], [customPack.id]));
  const first = applyDirection(initial, 'up', { nowMs: 0 });
  profile.statistics = applyDirection(first.state, 'down', { nowMs: 200 }).state.stats;
  return profile;
}

test('new profiles detect language and reduced motion, and own their mutable defaults', () => {
  assert.equal(DEFAULT_SETTINGS.language, 'de');
  assert.equal(DEFAULT_SETTINGS.reducedMotion, true);
  const ids = ['base-game'];
  const first = emptyProfile(ids);
  const second = emptyProfile(ids);
  first.settings.keys.up.push('KeyI');
  first.settings.labels.up = '↑';
  first.selectedPackIds.push('other');
  assert.deepEqual(ids, ['base-game']);
  assert.deepEqual(second.selectedPackIds, ['base-game']);
  assert.equal(second.settings.keys.up.includes('KeyI'), false);
  assert.equal(second.settings.labels.up, 'W');
});

test('backup roundtrip retains packs, groups, settings, favorites, and earned statistics', () => {
  const original = fixture();
  original.settings.language = 'en';
  original.settings.keys = { up: ['KeyI'], down: ['KeyK'], left: ['KeyJ'], right: ['KeyL'] };
  original.settings.timeLimit = 15;
  const restored = validateProfile(JSON.parse(JSON.stringify(original)), ['base-game']);
  assert.deepEqual(restored, original);
});

test('backup validation copies data instead of sharing mutable objects with its caller', () => {
  const original = fixture();
  const restored = validateProfile(original, ['base-game']);
  original.statistics.completed = 99;
  original.statistics.perStratagem['custom-practice:call']!.completed = 99;
  original.customPacks[0]!.stratagems[0]!.sequence.push('right');
  original.groups[0]!.items.push('other:call');
  original.settings.keys.up.push('KeyI');
  assert.equal(restored.statistics.completed, 1);
  assert.equal(restored.statistics.perStratagem['custom-practice:call']!.completed, 1);
  assert.deepEqual(restored.customPacks[0]!.stratagems[0]!.sequence, ['up', 'down']);
  assert.deepEqual(restored.groups[0]!.items, ['custom-practice:call']);
  assert.equal(restored.settings.keys.up.includes('KeyI'), false);
});

test('duplicate group IDs and blank group identities cannot create ambiguous selections', () => {
  const duplicate = fixture();
  duplicate.groups.push({ ...duplicate.groups[0]!, name: 'Second group' });
  assert.throws(() => validateProfile(duplicate, []));
  for (const update of [{ id: '' }, { id: ' ' }, { name: '' }, { name: '   ' }]) {
    const profile = fixture();
    profile.groups[0] = { ...profile.groups[0]!, ...update };
    assert.throws(() => validateProfile(profile, []));
  }
});

test('selection lists are deduplicated while dangling qualified IDs survive restoration', () => {
  const profile = fixture();
  profile.selectedPackIds.push(customPack.id);
  profile.favorites.push('custom-practice:call', 'future-pack:future-call');
  profile.groups[0]!.items.push('custom-practice:call');
  const restored = validateProfile(profile, []);
  assert.deepEqual(restored.selectedPackIds, ['base-game', 'custom-practice']);
  assert.deepEqual(restored.favorites, ['custom-practice:call', 'future-pack:future-call']);
  assert.deepEqual(restored.groups[0]!.items, ['custom-practice:call']);
});

test('malformed imports reject duplicate pack IDs and dangerous statistic object keys', () => {
  const duplicate = fixture();
  duplicate.customPacks.push(structuredClone(customPack));
  assert.throws(() => validateProfile(duplicate, []));
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const profile = fixture();
    Object.defineProperty(profile.statistics.perStratagem, key, { value: { completed: 1, perfect: 1, mistakes: 0, totalDurationMs: 200, bestDurationMs: 200 }, enumerable: true });
    assert.throws(() => validateProfile(profile, []));
  }
});

test('statistics counters must be finite integers and internally consistent', () => {
  for (const value of [-1, NaN, Infinity, 0.5]) {
    const profile = fixture();
    profile.statistics.completed = value;
    assert.throws(() => validateProfile(profile, []));
  }
  for (const change of [
    { completed: 0, perfect: 1 },
    { streak: 3, bestStreak: 2 },
  ]) {
    const profile = fixture();
    Object.assign(profile.statistics, change);
    assert.throws(() => validateProfile(profile, []));
  }
  const invalidItem = fixture();
  invalidItem.statistics.perStratagem['custom-practice:call']!.perfect = 2;
  assert.throws(() => validateProfile(invalidItem, []));
});

test('invalid backup duration measurements and settings mappings are rejected', () => {
  for (const value of [-1, Infinity, NaN]) {
    const profile = fixture();
    profile.statistics.perStratagem['custom-practice:call']!.totalDurationMs = value;
    assert.throws(() => validateProfile(profile, []));
  }
  const duplicateKey = fixture();
  duplicateKey.settings.keys.down = ['KeyW'];
  assert.throws(() => validateProfile(duplicateKey, []));
  const executable = fixture();
  executable.customPacks[0]!.stratagems[0]!.sequence = ['north' as never];
  assert.throws(() => validateProfile(executable, []));
});

test('loading missing or corrupt stored profiles recovers usable defaults', () => {
  storage.clear();
  assert.deepEqual(loadProfile(['base-game']), emptyProfile(['base-game']));
  storage.setItem(PROFILE_KEY, '{ broken JSON');
  assert.deepEqual(loadProfile(['base-game']), emptyProfile(['base-game']));
  storage.setItem(PROFILE_KEY, JSON.stringify({ customPacks: [] }));
  assert.deepEqual(loadProfile(['base-game']), emptyProfile(['base-game']));
  storage.setItem(PROFILE_KEY, JSON.stringify(fixture()));
  assert.deepEqual(loadProfile(['base-game']), fixture());
  storage.clear();
});
