import { DIRECTIONS, type Direction } from './types';

export type KeyBindings = Record<Direction, string[]>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

export class KeyBindingError extends Error {
  readonly code: 'keys.invalid_mapping' | 'keys.invalid_key' | 'keys.duplicate_key';

  constructor(code: KeyBindingError['code'], detail: string) {
    super(detail);
    this.name = 'KeyBindingError';
    this.code = code;
  }
}

// Physical KeyboardEvent.code values keep custom mappings stable across keyboard layouts.
const validCode = /^(?:Key[A-Z]|Digit[0-9]|Numpad[0-9]|Numpad(?:Add|Subtract|Multiply|Divide|Decimal|Enter)|Arrow(?:Up|Down|Left|Right)|Space|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Comma|Period|Slash|Backslash|Semicolon|Quote|BracketLeft|BracketRight|Backquote|Minus|Equal)$/;

export function normalizeKeyCode(key: string): string {
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  if (key === ' ') return 'Space';
  return key;
}

export function validateKeyBindings(value: unknown): KeyBindings {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new KeyBindingError('keys.invalid_mapping', 'Expected an object with up, down, left, and right mappings.');
  }
  if (Object.keys(value).length !== 4 || Object.keys(value).some((key) => !DIRECTIONS.includes(key as Direction))) {
    throw new KeyBindingError('keys.invalid_mapping', 'Use exactly up, down, left, and right mappings.');
  }
  const result = {} as KeyBindings;
  const assigned = new Set<string>();
  for (const direction of DIRECTIONS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, direction);
    if (!descriptor || !('value' in descriptor)) {
      throw new KeyBindingError('keys.invalid_mapping', `Expected a key list for ${direction}.`);
    }
    const entries: unknown = descriptor.value;
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 8) {
      throw new KeyBindingError('keys.invalid_mapping', `Assign 1–8 keys to ${direction}.`);
    }
    result[direction] = Array.from(entries, (entry: unknown): string => {
      if (typeof entry !== 'string') throw new KeyBindingError('keys.invalid_key', 'Expected a keyboard key code.');
      const code = normalizeKeyCode(entry);
      if (!validCode.test(code)) throw new KeyBindingError('keys.invalid_key', `Unsupported keyboard key: ${entry}`);
      if (assigned.has(code)) throw new KeyBindingError('keys.duplicate_key', `The key ${code} is assigned more than once.`);
      assigned.add(code);
      return code;
    });
  }
  return result;
}

export function directionForKey(key: string, bindings: KeyBindings = DEFAULT_KEY_BINDINGS): Direction | undefined {
  const code = normalizeKeyCode(key);
  return DIRECTIONS.find((direction) => bindings[direction].includes(code));
}

export function formatKeyCode(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  const arrows: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  return arrows[code] ?? code;
}
