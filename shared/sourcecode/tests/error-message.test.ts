import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import de from '../../application/lang/de.json';
import en from '../../application/lang/en.json';
import {
  DEFAULT_KEY_BINDINGS,
  KeyBindingError,
  PackValidationError,
  parsePack,
  validateKeyBindings,
  type PackErrorCode,
} from '../core';
import { formatUserError } from '../ui/error-message';
import { downloadPack } from '../ui/io';

const dictionaries: Record<string, Record<string, string>> = { de, en };
const capture = (action: () => unknown): unknown => {
  try { action(); } catch (error) { return error; }
  assert.fail('Expected an error');
};

describe('localized user errors', () => {
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    const t = (key: string) => dictionary[key] ?? key;

    it(`${language}: translates every pack code and retains the offending field`, () => {
      const codes = Object.keys(dictionary).filter(key => key.startsWith('pack.'));
      assert.equal(codes.length, 17);
      for (const code of codes) {
        const error = new PackValidationError(code as PackErrorCode, '$.stratagems[0].sequence', 'RAW ENGLISH DETAIL');
        assert.equal(formatUserError(error, t), `${dictionary.invalidPack}: ${dictionary[code]} ($.stratagems[0].sequence)`);
      }
      assert.equal(
        formatUserError(capture(() => parsePack('{')), t),
        `${dictionary.invalidPack}: ${dictionary['pack.invalid_json']} ($)`,
      );
      assert.equal(
        formatUserError(capture(() => parsePack(JSON.stringify({
          schemaVersion: 1, id: 'test', name: 'Test', kind: 'custom',
          stratagems: [{ id: 'example', name: 'Example', sequence: ['sideways'] }],
        }))), t),
        `${dictionary.invalidPack}: ${dictionary['pack.invalid_direction']} ($.stratagems[0].sequence[0])`,
      );
    });

    it(`${language}: distinguishes unsupported keys, malformed bindings, and duplicates`, () => {
      const invalidKey = capture(() => validateKeyBindings({ ...DEFAULT_KEY_BINDINGS, up: ['Escape'] }));
      const invalidMapping = capture(() => validateKeyBindings({ up: ['KeyW'] }));
      const duplicate = capture(() => validateKeyBindings({ ...DEFAULT_KEY_BINDINGS, up: ['KeyS'] }));
      assert.ok(invalidKey instanceof KeyBindingError);
      assert.equal(formatUserError(invalidKey, t), dictionary['keys.invalid_key']);
      assert.equal(formatUserError(invalidMapping, t), dictionary['keys.invalid_mapping']);
      assert.equal(formatUserError(duplicate, t), dictionary.keyDuplicate);
      assert.notEqual(formatUserError(invalidKey, t), formatUserError(duplicate, t));
    });

    it(`${language}: translates known I/O failures and preserves only a neutral HTTP status`, () => {
      for (const key of ['invalidUrl', 'httpsOnly', 'tooLarge', 'downloadFailed', 'downloadError', 'storageFailed', 'invalidBackup', 'keyUnsupported']) {
        assert.ok(dictionary[key]);
        assert.equal(formatUserError(new Error(key), t), dictionary[key]);
        assert.equal(formatUserError({ code: key, message: 'Native English exception' }, t), dictionary[key]);
      }
      assert.equal(formatUserError(new Error('HTTP 404'), t), `${dictionary.downloadError} (HTTP 404)`);
      assert.equal(formatUserError(new Error('HTTP 503'), t), `${dictionary.downloadError} (HTTP 503)`);
    });

    it(`${language}: hides unknown browser and native exception messages`, () => {
      for (const error of [
        new TypeError('Failed to fetch'),
        new Error('The operation was aborted'),
        { code: 'pack.future_code', message: 'Untranslated implementation detail' },
        { code: 'constructor', message: 'Unexpected internal data' },
        'Unexpected browser error', null, undefined,
      ]) {
        assert.equal(formatUserError(error, t), dictionary.actionFailed);
      }
    });
  }

  it('reports malformed URLs before accessing browser APIs or making a request', async () => {
    for (const raw of ['', 'not a URL', 'https://']) {
      await assert.rejects(downloadPack(raw), { message: 'invalidUrl' });
    }
    for (const raw of ['http://example.com/test.json', 'ftp://example.com/test.json', 'https://user:password@example.com/test.json']) {
      await assert.rejects(downloadPack(raw), { message: 'httpsOnly' });
    }
  });
});
