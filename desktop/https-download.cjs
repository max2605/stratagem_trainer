'use strict';

const https = require('node:https');

const MAX_BYTES = 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

function validateDownloadUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid download URL.');
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid download URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Use an HTTPS URL without embedded credentials.');
  }
  return url;
}

function downloadPack(value, options = {}) {
  const request = options.request || https.request;
  const maxBytes = options.maxBytes || MAX_BYTES;
  const timeoutMs = options.timeoutMs || TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;

  function download(url, redirects) {
    return new Promise((resolve, reject) => {
      let deadline;
      const succeed = (value) => { clearTimeout(deadline); resolve(value); };
      const fail = (error) => { clearTimeout(deadline); reject(error); };
      const req = request(url, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain;q=0.9', 'User-Agent': 'StratagemTrainer/1' },
      }, (response) => {
        const status = response.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.resume();
          if (redirects >= maxRedirects) return fail(new Error('Too many download redirects.'));
          try {
            if (typeof response.headers.location !== 'string') throw new Error('Download redirect has no destination.');
            const next = validateDownloadUrl(new URL(response.headers.location, url).href);
            clearTimeout(deadline);
            download(next, redirects + 1).then(succeed, fail);
          } catch (error) { fail(error); }
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          fail(new Error(`Download failed (HTTP ${status}).`));
          return;
        }
        if (Number(response.headers['content-length']) > maxBytes) {
          response.destroy();
          fail(new Error('JSON exceeds the 1 MiB download limit.'));
          return;
        }
        let size = 0;
        const chunks = [];
        response.on('data', (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            response.destroy();
            fail(new Error('JSON exceeds the 1 MiB download limit.'));
          } else chunks.push(chunk);
        });
        response.on('error', fail);
        response.on('aborted', () => fail(new Error('Download was interrupted.')));
        response.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''));
            if (json === null || typeof json !== 'object' || Array.isArray(json)) {
              throw new Error('A JSON object is required.');
            }
            succeed(json);
          } catch { fail(new Error('Downloaded file is not a JSON object.')); }
        });
      });
      req.setTimeout(timeoutMs, () => req.destroy(new Error('Download timed out.')));
      deadline = setTimeout(() => req.destroy(new Error('Download timed out.')), timeoutMs);
      req.on('error', fail);
      req.end();
    });
  }

  return download(validateDownloadUrl(value), 0);
}

module.exports = { downloadPack, validateDownloadUrl, MAX_BYTES, TIMEOUT_MS, MAX_REDIRECTS };
