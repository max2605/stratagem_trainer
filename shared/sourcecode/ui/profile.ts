import {
  DEFAULT_KEY_BINDINGS,
  DIRECTIONS,
  emptyStatistics,
  validateKeyBindings,
  validatePack,
  type Direction,
  type ItemStatistics,
  type KeyBindings,
  type Pack,
  type SessionStatistics,
} from '../core';

export interface Settings {
  language: 'de' | 'en';
  display: 'arrows' | 'wasd' | 'custom';
  labels: Record<Direction, string>;
  keys: KeyBindings;
  sound: boolean;
  haptics: boolean;
  repeatMistakes: boolean;
  showHint: boolean;
  timeLimit: number;
  leftHand: boolean;
  reducedMotion: boolean;
}

export interface Group { id: string; name: string; items: string[] }
export interface Profile {
  customPacks: Pack[];
  selectedPackIds: string[];
  groups: Group[];
  favorites: string[];
  settings: Settings;
  statistics: SessionStatistics;
}

export const PROFILE_KEY = 'stratagem-trainer-profile-v1';
export const DEFAULT_SETTINGS: Settings = {
  language: navigator.language.startsWith('de') ? 'de' : 'en',
  display: 'arrows',
  labels: { up: 'W', down: 'S', left: 'A', right: 'D' },
  keys: DEFAULT_KEY_BINDINGS,
  sound: false,
  haptics: true,
  repeatMistakes: true,
  showHint: true,
  timeLimit: 0,
  leftHand: false,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};

export function emptyProfile(packIds: readonly string[]): Profile {
  return {
    customPacks: [],
    selectedPackIds: [...packIds],
    groups: [],
    favorites: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    statistics: emptyStatistics(),
  };
}

const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

function invalid(): never { throw new Error('invalidBackup'); }

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid();
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid();
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (forbiddenKeys.has(key) || !descriptor || !('value' in descriptor)) invalid();
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) invalid();
  for (const key of Object.keys(value)) {
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) invalid();
  }
  // Read only ordinary own entries, so sparse arrays and accessors cannot evade checks.
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (!descriptor || !('value' in descriptor)) invalid();
    result.push(descriptor.value);
  }
  return result;
}

function strings(value: unknown): string[] {
  return [...new Set(list(value, 10000).map((entry) => {
    if (typeof entry !== 'string' || !entry.trim() || entry.length > 200) invalid();
    return entry;
  }))];
}

function identity(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 100 || forbiddenKeys.has(value) || /[\u0000-\u001f\u007f]/u.test(value)) invalid();
  return value;
}

function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid();
  return value;
}

function duration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) invalid();
  return value;
}

function statistics(value: unknown): SessionStatistics {
  const source = record(value);
  const result: SessionStatistics = {
    completed: count(source.completed),
    perfect: count(source.perfect),
    mistakes: count(source.mistakes),
    correctInputs: count(source.correctInputs),
    streak: count(source.streak),
    bestStreak: count(source.bestStreak),
    perStratagem: {},
  };
  if (result.perfect > result.completed || result.streak > result.bestStreak || result.bestStreak > result.completed) invalid();
  const perStratagem = record(source.perStratagem);
  if (Object.keys(perStratagem).length > 10000) invalid();
  for (const [key, value] of Object.entries(perStratagem)) {
    if (!key || key.length > 200) invalid();
    const entry = record(value);
    const item: ItemStatistics = {
      completed: count(entry.completed),
      perfect: count(entry.perfect),
      mistakes: count(entry.mistakes),
      totalDurationMs: duration(entry.totalDurationMs),
      bestDurationMs: entry.bestDurationMs === null ? null : duration(entry.bestDurationMs),
    };
    if (item.perfect > item.completed || (item.bestDurationMs !== null && item.bestDurationMs > item.totalDurationMs)) invalid();
    if (item.completed === 0 && (item.bestDurationMs !== null || item.totalDurationMs !== 0)) invalid();
    if (item.completed > 0 && item.bestDurationMs === null) invalid();
    result.perStratagem[key] = item;
  }
  return result;
}

/** Construct an independent, allowlisted profile before writing imported data to storage. */
export function validateProfile(value: unknown, packIds: readonly string[]): Profile {
  const data = record(value);
  const profile = emptyProfile(packIds);
  profile.customPacks = list(data.customPacks, 200).map(validatePack);
  if (new Set(profile.customPacks.map((pack) => pack.id)).size !== profile.customPacks.length) invalid();
  profile.selectedPackIds = strings(data.selectedPackIds);
  profile.favorites = strings(data.favorites);
  const seenGroups = new Set<string>();
  profile.groups = list(data.groups, 200).map((value) => {
    const group = record(value);
    const id = identity(group.id);
    const name = identity(group.name);
    if (seenGroups.has(id)) invalid();
    seenGroups.add(id);
    return { id, name, items: strings(group.items) };
  });
  if (data.settings !== undefined) {
    const settings = record(data.settings);
    if (settings.keys !== undefined) profile.settings.keys = validateKeyBindings(settings.keys);
    if (settings.language === 'en' || settings.language === 'de') profile.settings.language = settings.language;
    if (settings.display === 'arrows' || settings.display === 'wasd' || settings.display === 'custom') profile.settings.display = settings.display;
    for (const key of ['sound', 'haptics', 'repeatMistakes', 'showHint', 'leftHand', 'reducedMotion'] as const) {
      if (typeof settings[key] === 'boolean') profile.settings[key] = settings[key];
    }
    if (typeof settings.timeLimit === 'number' && Number.isFinite(settings.timeLimit) && settings.timeLimit >= 0 && settings.timeLimit <= 120) profile.settings.timeLimit = settings.timeLimit;
    if (settings.labels !== undefined) {
      const labels = record(settings.labels);
      for (const direction of DIRECTIONS) if (typeof labels[direction] === 'string') profile.settings.labels[direction] = labels[direction].slice(0, 12);
    }
  }
  if (data.statistics !== undefined) profile.statistics = statistics(data.statistics);
  return profile;
}

export function loadProfile(ids: readonly string[]): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return validateProfile(JSON.parse(raw), ids);
  } catch { /* Recover locally from unavailable storage or a malformed saved profile. */ }
  return emptyProfile(ids);
}
