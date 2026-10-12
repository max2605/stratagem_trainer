import type { PackErrorCode } from '../core';

export type Translate = (key: string) => string;

// Exhaustive against PackErrorCode: a new validation code requires a UI message.
const packMessages: Record<PackErrorCode, string> = {
  'pack.invalid_json': 'pack.invalid_json',
  'pack.too_large': 'pack.too_large',
  'pack.object_required': 'pack.object_required',
  'pack.dangerous_key': 'pack.dangerous_key',
  'pack.unknown_field': 'pack.unknown_field',
  'pack.invalid_schema_version': 'pack.invalid_schema_version',
  'pack.invalid_id': 'pack.invalid_id',
  'pack.invalid_text': 'pack.invalid_text',
  'pack.invalid_kind': 'pack.invalid_kind',
  'pack.invalid_array': 'pack.invalid_array',
  'pack.stratagem_count': 'pack.stratagem_count',
  'pack.duplicate_stratagem_id': 'pack.duplicate_stratagem_id',
  'pack.sequence_length': 'pack.sequence_length',
  'pack.invalid_direction': 'pack.invalid_direction',
  'pack.tag_count': 'pack.tag_count',
  'pack.invalid_source': 'pack.invalid_source',
  'pack.invalid_date': 'pack.invalid_date',
};

const keyMessages: Record<string, string> = {
  'keys.invalid_mapping': 'keys.invalid_mapping',
  'keys.invalid_key': 'keys.invalid_key',
  'keys.duplicate_key': 'keyDuplicate',
};

const ioMessages = new Set([
  'invalidUrl',
  'httpsOnly',
  'tooLarge',
  'downloadFailed',
  'downloadError',
  'storageFailed',
  'invalidBackup',
  'keyUnsupported',
]);

/** Display stable localized messages, never browser or native exception prose. */
export function formatUserError(error: unknown, t: Translate): string {
  const record = error !== null && typeof error === 'object'
    ? error as { code?: unknown; path?: unknown; message?: unknown }
    : {};
  const code = typeof record.code === 'string' ? record.code : '';

  if (Object.hasOwn(packMessages, code)) {
    const message = `${t('invalidPack')}: ${t(packMessages[code as PackErrorCode])}`;
    return typeof record.path === 'string' && record.path
      ? `${message} (${record.path})`
      : message;
  }
  if (Object.hasOwn(keyMessages, code)) return t(keyMessages[code]);

  const message = typeof record.message === 'string'
    ? record.message
    : typeof error === 'string' ? error : '';
  if (ioMessages.has(code)) return t(code);
  if (ioMessages.has(message)) return t(message);

  const status = /^HTTP ([1-5]\d{2})$/.exec(message);
  if (status) return `${t('downloadError')} (HTTP ${status[1]})`;
  return t('actionFailed');
}
