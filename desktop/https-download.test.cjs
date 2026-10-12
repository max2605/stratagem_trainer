'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { downloadPack, validateDownloadUrl } = require('./https-download.cjs');

function transport(responses) {
  const visited = [];
  return {
    visited,
    request(url, _options, callback) {
      visited.push(url.href);
      const request = new EventEmitter();
      request.setTimeout = () => request;
      request.destroy = (error) => { queueMicrotask(() => request.emit('error', error)); return request; };
      request.end = () => queueMicrotask(() => {
        const entry = responses.shift();
        const response = new PassThrough();
        response.statusCode = entry.status || 200;
        response.headers = entry.headers || {};
        callback(response);
        response.end(entry.body || '');
      });
      return request;
    },
  };
}

test('accepts HTTPS and refuses local schemes and embedded credentials', () => {
  assert.equal(validateDownloadUrl('https://example.com/pack.json').hostname, 'example.com');
  for (const url of ['http://example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'https://user:secret@example.com', 'invalid']) {
    assert.throws(() => validateDownloadUrl(url));
  }
});

test('downloads JSON and follows a relative HTTPS redirect', async () => {
  const mock = transport([{ status: 302, headers: { location: '/next.json' } }, { body: '{"id":"custom","stratagems":[]}' }]);
  const result = await downloadPack('https://example.com/pack.json', mock);
  assert.equal(result.id, 'custom');
  assert.deepEqual(mock.visited, ['https://example.com/pack.json', 'https://example.com/next.json']);
});

test('refuses redirects to HTTP and excessive redirect chains', async () => {
  const insecure = transport([{ status: 301, headers: { location: 'http://example.com/pack.json' } }]);
  await assert.rejects(downloadPack('https://example.com/pack.json', insecure), /HTTPS/);
  const loop = transport([{ status: 302, headers: { location: '/again' } }]);
  await assert.rejects(downloadPack('https://example.com/pack.json', { ...loop, maxRedirects: 0 }), /redirects/);
});

test('rejects oversized response bodies and advertised sizes', async () => {
  for (const entry of [{ body: '{"value":"abcdef"}' }, { headers: { 'content-length': '20' }, body: '{}' }]) {
    await assert.rejects(downloadPack('https://example.com/pack.json', { ...transport([entry]), maxBytes: 4 }), /limit/);
  }
});

test('rejects failed HTTP responses and invalid JSON objects', async () => {
  for (const entry of [{ status: 404 }, { body: '<html>error</html>' }, { body: '[]' }, { body: 'null' }]) {
    await assert.rejects(downloadPack('https://example.com/pack.json', transport([entry])), /failed|JSON object/);
  }
});

test('times out even when a server never supplies a response', async () => {
  const request = () => {
    const req = new EventEmitter();
    req.setTimeout = () => req;
    req.end = () => {};
    req.destroy = (error) => queueMicrotask(() => req.emit('error', error));
    return req;
  };
  await assert.rejects(downloadPack('https://example.com/pack.json', { request, timeoutMs: 5 }), /timed out/);
});
