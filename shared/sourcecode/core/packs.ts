import { isDirection, type Pack, type Stratagem, type TrainingItem } from './types';

export const MAX_PACK_BYTES = 1024 * 1024;
export const MAX_STRATAGEMS = 500;
export const MAX_SEQUENCE_LENGTH = 16;

export type PackErrorCode =
  | 'pack.invalid_json'
  | 'pack.too_large'
  | 'pack.object_required'
  | 'pack.dangerous_key'
  | 'pack.unknown_field'
  | 'pack.invalid_schema_version'
  | 'pack.invalid_id'
  | 'pack.invalid_text'
  | 'pack.invalid_kind'
  | 'pack.invalid_array'
  | 'pack.stratagem_count'
  | 'pack.duplicate_stratagem_id'
  | 'pack.sequence_length'
  | 'pack.invalid_direction'
  | 'pack.tag_count'
  | 'pack.invalid_source'
  | 'pack.invalid_date';

/** Use code for translated UI messages and path to identify the offending field. */
export class PackValidationError extends Error {
  readonly code: PackErrorCode;
  readonly path: string;

  constructor(code: PackErrorCode, path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = 'PackValidationError';
    this.code = code;
    this.path = path;
  }
}

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const idPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const unsafeText = /[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

function fail(code: PackErrorCode, path: string, detail: string): never {
  throw new PackValidationError(code, path, detail);
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('pack.object_required', path, 'Expected an object.');
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('pack.object_required', path, 'Expected a plain object.');
  }
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  // Check keys before reading values, so a dangerous field is never copied or merged.
  for (const key of Object.keys(value)) {
    if (forbiddenKeys.has(key)) fail('pack.dangerous_key', `${path}.${key}`, 'This field is not allowed.');
    if (!allowed.includes(key)) fail('pack.unknown_field', `${path}.${key}`, 'Unknown field.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) {
      fail('pack.object_required', `${path}.${key}`, 'Accessors are not allowed.');
    }
  }
}

function identifier(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length > 64 || !idPattern.test(value) || forbiddenKeys.has(value)) {
    fail('pack.invalid_id', path, 'Use 1–64 letters or digits separated by hyphens or underscores.');
  }
  return value;
}

function label(value: unknown, path: string, maxLength = 120): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > maxLength || unsafeText.test(value)) {
    fail('pack.invalid_text', path, `Use a nonempty plain-text string of at most ${maxLength} characters, without surrounding whitespace.`);
  }
  return value;
}

function sources(value: unknown, path: string): string[] {
  const entries = array(value, path);
  if (entries.length > 20) fail('pack.invalid_source', path, 'Use at most 20 HTTP or HTTPS source URLs.');
  return Array.from(entries, (entry, index) => {
    if (typeof entry !== 'string' || entry.length > 2048 || entry !== entry.trim()) {
      fail('pack.invalid_source', `${path}[${index}]`, 'Expected an HTTP or HTTPS source URL.');
    }
    try {
      const url = new URL(entry);
      if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
        fail('pack.invalid_source', `${path}[${index}]`, 'Expected an HTTP or HTTPS source URL without credentials.');
      }
    } catch {
      fail('pack.invalid_source', `${path}[${index}]`, 'Expected an HTTP or HTTPS source URL without credentials.');
    }
    return entry;
  });
}

function date(value: unknown, path: string, allowTime: boolean): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    fail('pack.invalid_date', path, 'Expected an ISO date (YYYY-MM-DD) or timestamp.');
  }
  if (!allowTime && value.length !== 10) fail('pack.invalid_date', path, 'Expected an ISO date (YYYY-MM-DD).');
  const day = value.slice(0, 10);
  const parsedDay = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsedDay.getTime()) || parsedDay.toISOString().slice(0, 10) !== day || !Number.isFinite(Date.parse(value))) {
    fail('pack.invalid_date', path, 'Expected a valid calendar date.');
  }
  return value;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail('pack.invalid_array', path, 'Expected an array.');
  // JSON arrays cannot contain named properties; reject these for direct API callers too.
  for (const key of Object.keys(value)) {
    if (forbiddenKeys.has(key)) fail('pack.dangerous_key', `${path}.${key}`, 'This field is not allowed.');
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) {
      fail('pack.invalid_array', path, 'Array properties are not allowed.');
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) fail('pack.invalid_array', path, 'Array accessors are not allowed.');
  }
  return value;
}

/** Validate and return an independent, allowlisted copy. Never merge imported JSON. */
export function validatePack(value: unknown): Pack {
  const source = object(value, '$');
  keys(source, ['schemaVersion', 'id', 'name', 'description', 'kind', 'stratagems', 'source', 'verifiedAt', 'releaseDate', 'notes'], '$');
  if (source.schemaVersion !== 1) fail('pack.invalid_schema_version', '$.schemaVersion', 'Expected schemaVersion 1.');
  const id = identifier(source.id, '$.id');
  const name = label(source.name, '$.name');
  if (source.kind !== 'base' && source.kind !== 'warbond' && source.kind !== 'custom') {
    fail('pack.invalid_kind', '$.kind', 'Expected base, warbond, or custom.');
  }
  const rawItems = array(source.stratagems, '$.stratagems');
  if (rawItems.length > MAX_STRATAGEMS) {
    fail('pack.stratagem_count', '$.stratagems', `Use at most ${MAX_STRATAGEMS} stratagems.`);
  }
  const seen = new Set<string>();
  const stratagems = Array.from(rawItems, (raw, index): Stratagem => {
    const path = `$.stratagems[${index}]`;
    const item = object(raw, path);
    keys(item, ['id', 'name', 'sequence', 'category', 'tags', 'source'], path);
    const itemId = identifier(item.id, `${path}.id`);
    if (seen.has(itemId)) fail('pack.duplicate_stratagem_id', `${path}.id`, 'Stratagem IDs must be unique within a pack.');
    seen.add(itemId);
    const rawSequence = array(item.sequence, `${path}.sequence`);
    if (rawSequence.length < 1 || rawSequence.length > MAX_SEQUENCE_LENGTH) {
      fail('pack.sequence_length', `${path}.sequence`, `Use 1–${MAX_SEQUENCE_LENGTH} directions.`);
    }
    const sequence = Array.from(rawSequence, (direction, position) => {
      if (!isDirection(direction)) fail('pack.invalid_direction', `${path}.sequence[${position}]`, 'Expected up, down, left, or right.');
      return direction;
    });
    const result: Stratagem = { id: itemId, name: label(item.name, `${path}.name`), sequence };
    if (item.category !== undefined) result.category = label(item.category, `${path}.category`, 80);
    if (item.tags !== undefined) {
      const rawTags = array(item.tags, `${path}.tags`);
      if (rawTags.length > 20) fail('pack.tag_count', `${path}.tags`, 'Use at most 20 tags.');
      result.tags = Array.from(rawTags, (tag, tagIndex) => label(tag, `${path}.tags[${tagIndex}]`, 40));
    }
    if (item.source !== undefined) result.source = sources(item.source, `${path}.source`);
    return result;
  });
  const result: Pack = { schemaVersion: 1, id, name, kind: source.kind, stratagems };
  if (source.description !== undefined) result.description = label(source.description, '$.description', 1000);
  if (source.source !== undefined) result.source = sources(source.source, '$.source');
  if (source.verifiedAt !== undefined) result.verifiedAt = date(source.verifiedAt, '$.verifiedAt', true);
  if (source.releaseDate !== undefined) result.releaseDate = date(source.releaseDate, '$.releaseDate', false);
  if (source.notes !== undefined) result.notes = label(source.notes, '$.notes', 4000);
  return result;
}

export function parsePack(text: string): Pack {
  if (typeof text !== 'string') fail('pack.invalid_json', '$', 'Expected JSON text.');
  if (new TextEncoder().encode(text).byteLength > MAX_PACK_BYTES) {
    fail('pack.too_large', '$', 'The configuration exceeds 1 MiB.');
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    fail('pack.invalid_json', '$', 'The configuration contains invalid JSON.');
  }
  return validatePack(value);
}

export function qualifiedStratagemId(packId: string, stratagemId: string): string {
  return `${packId}:${stratagemId}`;
}

/** An explicit empty stratagem selection produces an empty pool. */
export function buildPool(
  packs: readonly Pack[],
  selectedPackIds: readonly string[],
  selectedStratagemIds?: readonly string[],
): TrainingItem[] {
  const selectedPacks = new Set(selectedPackIds);
  const selectedItems = selectedStratagemIds === undefined ? undefined : new Set(selectedStratagemIds);
  const seenPacks = new Set<string>();
  const result: TrainingItem[] = [];
  for (const pack of packs) {
    if (seenPacks.has(pack.id)) throw new Error(`Duplicate pack ID: ${pack.id}`);
    seenPacks.add(pack.id);
    if (!selectedPacks.has(pack.id)) continue;
    for (const item of pack.stratagems) {
      const qualifiedId = qualifiedStratagemId(pack.id, item.id);
      if (selectedItems !== undefined && !selectedItems.has(qualifiedId)) continue;
      result.push({
        ...item,
        sequence: [...item.sequence],
        ...(item.tags === undefined ? {} : { tags: [...item.tags] }),
        ...(item.source === undefined ? {} : { source: [...item.source] }),
        qualifiedId,
        packId: pack.id,
        packName: pack.name,
      });
    }
  }
  return result;
}
