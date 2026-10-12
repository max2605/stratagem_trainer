import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  DEFAULT_KEY_BINDINGS,
  KeyBindingError,
  MAX_PACK_BYTES,
  PackValidationError,
  applyDirection,
  buildPool,
  completionAccuracy,
  createShuffleBag,
  createTrainingState,
  currentItem,
  directionForKey,
  emptyStatistics,
  formatKeyCode,
  inputAccuracy,
  mergeStatistics,
  parsePack,
  validateKeyBindings,
  validatePack,
  type Direction,
  type Pack,
  type PackErrorCode,
  type TrainingState,
} from '../core';

function pack(id = 'test-pack'): Pack {
  return {
    schemaVersion: 1,
    id,
    name: 'Test pack',
    kind: 'custom',
    stratagems: [
      { id: 'reinforce', name: 'Reinforce', sequence: ['up', 'down', 'right'] },
      { id: 'resupply', name: 'Resupply', sequence: ['down', 'up'] },
      { id: 'sentry', name: 'Sentry', sequence: ['left', 'right'] },
    ],
  };
}

function expectPackError(action: () => unknown, code: PackErrorCode, path?: string): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof PackValidationError);
    assert.equal(error.code, code);
    if (path !== undefined) assert.equal(error.path, path);
    return true;
  });
}

function finish(state: TrainingState, start = 0, repeatMistakes = true): TrainingState {
  const item = currentItem(state);
  assert.ok(item);
  let next = state;
  for (const [index, direction] of item.sequence.entries()) {
    next = applyDirection(next, direction, { rng: () => 0, nowMs: start + index * 100, repeatMistakes }).state;
  }
  return next;
}

test('pack validation clones JSON and preserves optional provenance', () => {
  const source: Pack = {
    ...pack(),
    description: 'A practice pack',
    source: ['https://example.com/warbond'],
    verifiedAt: '2026-10-12T21:30:00Z',
    releaseDate: '2024-02-29',
    notes: 'A source note',
  };
  source.stratagems[0]!.source = ['https://example.com/reinforce'];
  source.stratagems[0]!.tags = ['support'];
  const result = parsePack(JSON.stringify(source));
  assert.deepEqual(result, source);
  assert.notEqual(result, source);
  result.stratagems[0]!.sequence.push('left');
  result.stratagems[0]!.tags!.push('extra');
  assert.equal(source.stratagems[0]!.sequence.length, 3);
  assert.equal(source.stratagems[0]!.tags!.length, 1);
});

test('invalid JSON and UTF-8 byte limits return localized error codes', () => {
  expectPackError(() => parsePack('{'), 'pack.invalid_json', '$');
  const oversized = 'ä'.repeat(Math.floor(MAX_PACK_BYTES / 2) + 1);
  assert.ok(oversized.length < MAX_PACK_BYTES);
  expectPackError(() => parsePack(oversized), 'pack.too_large', '$');
});

test('pack versions, names, and IDs cannot bypass validation', () => {
  expectPackError(() => validatePack({ ...pack(), schemaVersion: 2 }), 'pack.invalid_schema_version');
  for (const id of ['', '../escape', 'a:b', 'constructor', 'a'.repeat(65)]) {
    expectPackError(() => validatePack({ ...pack(), id }), 'pack.invalid_id', '$.id');
  }
  for (const name of ['', ' whitespace ', '<script>', 'a\u202eb', 'a\u0000b']) {
    expectPackError(() => validatePack({ ...pack(), name }), 'pack.invalid_text', '$.name');
  }
  assert.equal(validatePack({ ...pack(), name: 'Überraschung — 支援' }).name, 'Überraschung — 支援');
});

test('imports reject dangerous keys, unknown fields, and executable accessors', () => {
  const json = JSON.stringify(pack());
  expectPackError(() => parsePack(json.replace('"schemaVersion":1', '"schemaVersion":1,"__proto__":{"polluted":true}')), 'pack.dangerous_key', '$.__proto__');
  expectPackError(() => validatePack({ ...pack(), unexpected: true }), 'pack.unknown_field', '$.unexpected');
  const withGetter = { ...pack() };
  Object.defineProperty(withGetter, 'name', { enumerable: true, get() { throw new Error('Accessor executed'); } });
  expectPackError(() => validatePack(withGetter), 'pack.object_required', '$.name');
  expectPackError(() => validatePack(Object.create(pack())), 'pack.object_required', '$');
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('stratagem and sequence bounds reject excessive data and empty sequences', () => {
  const tooMany = Array.from({ length: 501 }, (_, index) => ({ id: `entry-${index}`, name: `Entry ${index}`, sequence: ['up'] }));
  expectPackError(() => validatePack({ ...pack(), stratagems: tooMany }), 'pack.stratagem_count');
  for (const sequence of [[], Array(17).fill('up'), ['north']]) {
    const expected = sequence.length === 1 ? 'pack.invalid_direction' : 'pack.sequence_length';
    expectPackError(() => validatePack({ ...pack(), stratagems: [{ id: 'entry', name: 'Entry', sequence }] }), expected);
  }
  const valid = Array.from({ length: 500 }, (_, index) => ({ id: `entry-${index}`, name: `Entry ${index}`, sequence: Array(16).fill('left') }));
  assert.equal(validatePack({ ...pack(), stratagems: valid }).stratagems.length, 500);
});

test('empty warbonds and draft custom packs are valid and create an empty training pool', () => {
  for (const kind of ['base', 'warbond', 'custom'] as const) {
    const empty = validatePack({ ...pack(), kind, stratagems: [] });
    const pool = buildPool([empty], [empty.id]);
    assert.deepEqual(pool, []);
    assert.equal(currentItem(createTrainingState(pool)), null);
  }
});

test('every shipped pack passes the same strict import validation', () => {
  const directory = new URL('../../application/configs/', import.meta.url);
  const files = readdirSync(directory).filter((file) => file.endsWith('.json') && file !== 'index.json');
  assert.ok(files.length > 0);
  const packs = files.map((file) => parsePack(readFileSync(new URL(file, directory), 'utf8')));
  assert.equal(new Set(packs.map((entry) => entry.id)).size, packs.length);
  assert.ok(packs.some((entry) => entry.kind === 'warbond' && entry.stratagems.length === 0));
  assert.ok(buildPool(packs, packs.map((entry) => entry.id)).length > 0);
});

test('duplicate IDs and invalid optional metadata are rejected', () => {
  const source = pack();
  source.stratagems[1]!.id = source.stratagems[0]!.id;
  expectPackError(() => validatePack(source), 'pack.duplicate_stratagem_id');
  expectPackError(() => validatePack({ ...pack(), source: ['javascript:alert(1)'] }), 'pack.invalid_source');
  expectPackError(() => validatePack({ ...pack(), source: ['https://user:secret@example.com/'] }), 'pack.invalid_source');
  expectPackError(() => validatePack({ ...pack(), releaseDate: '2024-02-31' }), 'pack.invalid_date');
  expectPackError(() => validatePack({ ...pack(), verifiedAt: 'yesterday' }), 'pack.invalid_date');
  const tagged = pack();
  tagged.stratagems[0]!.tags = Array(21).fill('tag');
  expectPackError(() => validatePack(tagged), 'pack.tag_count');
});

test('sparse or decorated arrays cannot bypass per-entry checks', () => {
  const source = pack();
  source.stratagems[0]!.sequence = new Array(3);
  expectPackError(() => validatePack(source), 'pack.invalid_direction');
  const decorated = pack();
  Object.defineProperty(decorated.stratagems, 'constructor', { value: 'bad', enumerable: true });
  expectPackError(() => validatePack(decorated), 'pack.dangerous_key');
});

test('pool uses qualified IDs to select identical IDs from different packs', () => {
  const first = pack('first');
  const second = pack('second');
  assert.equal(buildPool([first, second], ['first']).length, 3);
  assert.deepEqual(buildPool([first, second], ['first', 'second'], ['second:reinforce']).map((item) => item.qualifiedId), ['second:reinforce']);
  assert.equal(buildPool([first, second], ['first'], ['reinforce']).length, 0);
  assert.equal(buildPool([first], ['first'], []).length, 0);
  assert.equal(buildPool([first], []).length, 0);
  assert.throws(() => buildPool([first, first], ['first']), /Duplicate pack ID/);
});

test('shuffle bags contain each ID once and avoid boundary repeats', () => {
  assert.deepEqual(createShuffleBag(['a', 'b', 'c', 'a'], () => 0), ['b', 'c', 'a']);
  assert.deepEqual(createShuffleBag(['a', 'b', 'c'], () => 0, 'b'), ['c', 'b', 'a']);
  assert.deepEqual(createShuffleBag([], () => 0), []);
  assert.deepEqual(createShuffleBag(['a'], () => 0, 'a'), ['a']);
  for (const number of [-0.1, 1, Infinity, NaN]) assert.throws(() => createShuffleBag(['a', 'b'], () => number), /random source/);
});

test('normal training cycle visits every selected item before refill', () => {
  const source = pack();
  let state = createTrainingState(buildPool([source], [source.id]), () => 0);
  const visited: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    visited.push(state.currentId!);
    state = finish(state, index * 1000);
  }
  assert.equal(new Set(visited).size, 3);
  assert.notEqual(state.currentId, visited[2]);
  assert.equal(state.stats.completed, 3);
  assert.equal(state.stats.perfect, 3);
  assert.equal(state.stats.streak, 3);
  assert.equal(state.stats.bestStreak, 3);
});

test('transitions preserve previous state and measure time from the first key', () => {
  const source = pack();
  const pool = buildPool([source], [source.id], [`${source.id}:reinforce`]);
  const original = createTrainingState(pool, () => 0);
  const before = JSON.stringify(original);
  const first = applyDirection(original, 'up', { nowMs: 0 });
  assert.equal(first.event, 'correct');
  assert.equal(first.state.progress, 1);
  assert.equal(JSON.stringify(original), before);
  const second = applyDirection(first.state, 'down', { nowMs: 500 });
  const result = applyDirection(second.state, 'right', { nowMs: 750 });
  assert.equal(result.event, 'completed');
  assert.equal(result.durationMs, 750);
  assert.equal(result.item!.qualifiedId, 'test-pack:reinforce');
  assert.equal(result.state.progress, 0);
  assert.equal(result.state.attemptStartedAt, null);
  assert.equal(result.state.stats.perStratagem['test-pack:reinforce']!.bestDurationMs, 750);
});

test('mistakes reset the prefix and repeat each missed item once after the full bag', () => {
  const source = pack();
  let state = createTrainingState(buildPool([source], [source.id]), () => 0);
  const missedId = state.currentId!;
  const firstDirection = currentItem(state)!.sequence[0]!;
  state = applyDirection(state, firstDirection, { nowMs: 0 }).state;
  const wrong: Direction = currentItem(state)!.sequence[state.progress] === 'up' ? 'down' : 'up';
  const failure = applyDirection(state, wrong, { nowMs: 25 });
  assert.equal(failure.event, 'mistake');
  assert.equal(failure.state.progress, 0);
  state = applyDirection(failure.state, 'left', { nowMs: 30 }).state;
  // Resupply starts with down, so this second mistake still yields one queued review.
  assert.deepEqual(state.mistakeQueue, [missedId]);
  state = finish(state, 100);
  state = finish(state, 1000);
  state = finish(state, 2000);
  assert.equal(state.phase, 'review');
  assert.equal(state.currentId, missedId);
  assert.deepEqual(state.mistakeQueue, []);
  assert.equal(state.stats.completed, 3);
  assert.equal(state.stats.perfect, 2);
  assert.equal(state.stats.mistakes, 2);
  assert.equal(state.stats.perStratagem[missedId]!.mistakes, 2);
  state = finish(state, 3000);
  assert.equal(state.phase, 'normal');
  assert.equal(state.bag.length, 2);
});

test('disabling mistake review retains accurate statistics without extra review', () => {
  const source = pack();
  let state = createTrainingState(buildPool([source], [source.id]), () => 0);
  state = applyDirection(state, 'up', { nowMs: 0, repeatMistakes: false }).state;
  assert.equal(state.stats.mistakes, 1);
  assert.deepEqual(state.mistakeQueue, []);
  for (let index = 0; index < 3; index += 1) state = finish(state, 1000 * (index + 1), false);
  assert.equal(state.phase, 'normal');
  assert.equal(state.stats.completed, 3);
  assert.equal(state.stats.perfect, 2);
});

test('empty pools, single-direction sequences, and invalid transitions are safe', () => {
  const empty = createTrainingState([]);
  assert.equal(currentItem(empty), null);
  assert.equal(applyDirection(empty, 'up').event, 'empty');
  const source = pack();
  source.stratagems = [{ id: 'single', name: 'Single', sequence: ['up'] }];
  const state = createTrainingState(buildPool([source], [source.id]));
  const result = applyDirection(state, 'up', { nowMs: 0 });
  assert.equal(result.event, 'completed');
  assert.equal(result.durationMs, 0);
  assert.equal(result.state.currentId, state.currentId);
  assert.throws(() => applyDirection(state, 'up', { nowMs: NaN }), /Input time/);
  assert.throws(() => createTrainingState([...state.pool, ...state.pool]), /unique/);
});

test('accuracy and lifetime statistics merge independent sessions without double mutation', () => {
  const source = pack();
  const initial = createTrainingState(buildPool([source], [source.id], ['test-pack:reinforce']));
  const first = finish(initial, 0).stats;
  const next = applyDirection(initial, 'left', { nowMs: 0 }).state;
  const second = finish(next, 100).stats;
  const combined = mergeStatistics(first, second);
  assert.equal(combined.completed, 2);
  assert.equal(combined.perfect, 1);
  assert.equal(combined.mistakes, 1);
  assert.equal(combined.bestStreak, 1);
  assert.equal(combined.perStratagem['test-pack:reinforce']!.totalDurationMs, 500);
  assert.equal(combined.perStratagem['test-pack:reinforce']!.bestDurationMs, 200);
  assert.equal(inputAccuracy(combined), 6 / 7);
  assert.equal(completionAccuracy(combined), 1 / 2);
  assert.equal(inputAccuracy(emptyStatistics()), 0);
  assert.equal(completionAccuracy(emptyStatistics()), 0);
  assert.equal(first.completed, 1);
});

test('WASD and arrows map by physical code and custom keys do not mutate defaults', () => {
  assert.equal(directionForKey('KeyW'), 'up');
  assert.equal(directionForKey('ArrowDown'), 'down');
  assert.equal(directionForKey('a'), 'left');
  assert.equal(directionForKey('D'), 'right');
  assert.equal(directionForKey('Escape'), undefined);
  const custom = validateKeyBindings({ up: ['i'], down: ['k'], left: ['j'], right: ['l'] });
  assert.equal(directionForKey('KeyI', custom), 'up');
  assert.equal(directionForKey('KeyW', custom), undefined);
  const cloned = validateKeyBindings(DEFAULT_KEY_BINDINGS);
  cloned.up.push('KeyI');
  assert.equal(DEFAULT_KEY_BINDINGS.up.includes('KeyI'), false);
  assert.equal(formatKeyCode('ArrowUp'), '↑');
  assert.equal(formatKeyCode('KeyW'), 'W');
});

test('key validation rejects ambiguous, missing, dangerous, and reserved mappings', () => {
  const cases = [
    { up: ['w'], down: ['W'], left: ['a'], right: ['d'] },
    { up: ['KeyW'], down: [], left: ['KeyA'], right: ['KeyD'] },
    { up: ['ControlLeft'], down: ['s'], left: ['a'], right: ['d'] },
    { up: ['w'], down: ['s'], left: ['a'] },
    JSON.parse('{"up":["w"],"down":["s"],"left":["a"],"right":["d"],"__proto__":{}}'),
  ];
  for (const value of cases) assert.throws(() => validateKeyBindings(value), KeyBindingError);
});

test('extended physical keys map consistently and survive JSON persistence', () => {
  const bindings = validateKeyBindings({
    up: ['F24', 'CapsLock'],
    down: ['IntlBackslash', 'NumpadComma'],
    left: ['IntlRo', 'ContextMenu'],
    right: ['IntlYen', 'AudioVolumeMute'],
  });
  const restored = validateKeyBindings(JSON.parse(JSON.stringify(bindings)));
  assert.deepEqual(restored, bindings);
  assert.equal(directionForKey('F24', restored), 'up');
  assert.equal(directionForKey('CapsLock', restored), 'up');
  assert.equal(directionForKey('IntlBackslash', restored), 'down');
  assert.equal(directionForKey('NumpadComma', restored), 'down');
  assert.equal(directionForKey('IntlRo', restored), 'left');
  assert.equal(directionForKey('IntlYen', restored), 'right');
  assert.equal(directionForKey('ArrowUp', restored), undefined);
  assert.deepEqual(DEFAULT_KEY_BINDINGS.up, ['KeyW', 'ArrowUp']);
});

test('function-key boundaries, international layouts, and keypad variants are accepted', () => {
  const codes = [
    ...Array.from({ length: 24 }, (_, index) => `F${index + 1}`),
    'Lang1', 'Lang5', 'Convert', 'NonConvert', 'KanaMode',
    'NumLock', 'ScrollLock', 'PrintScreen', 'Pause', 'Help',
    'NumpadEqual', 'NumpadClear', 'NumpadParenLeft', 'NumpadParenRight',
    'BrowserBack', 'MediaPlayPause',
  ];
  for (const code of codes) {
    const bindings = validateKeyBindings({ up: [code], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] });
    assert.equal(directionForKey(code, bindings), 'up');
  }
  const eightKeys = validateKeyBindings({ up: codes.slice(0, 8), down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] });
  assert.equal(eightKeys.up.length, 8);
});

test('extended binding errors distinguish invalid keys, duplicate keys, and invalid mappings', () => {
  function expectKeyError(value: unknown, code: KeyBindingError['code']): void {
    assert.throws(() => validateKeyBindings(value), (error: unknown) => {
      assert.ok(error instanceof KeyBindingError);
      assert.equal(error.code, code);
      return true;
    });
  }
  for (const key of [
    'Escape', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'Fn',
    'F0', 'F25', 'F01', 'F100', 'Lang6', 'IntlUnknown', 'Numpad10', 'Unidentified', '', 'F1\n',
  ]) expectKeyError({ up: [key], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] }, 'keys.invalid_key');
  expectKeyError({ up: ['F13'], down: ['F13'], left: ['KeyA'], right: ['KeyD'] }, 'keys.duplicate_key');
  expectKeyError({ up: ['CapsLock', 'CapsLock'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] }, 'keys.duplicate_key');
  expectKeyError({ up: Array.from({ length: 9 }, (_, index) => `F${index + 1}`), down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] }, 'keys.invalid_mapping');
});
