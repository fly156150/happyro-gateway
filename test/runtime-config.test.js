const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createRuntimeConfig, writeRuntimeConfig } = require('../runtime-config');

test('uses the client defaults when runtime URLs are not configured', t => {
  assert.deepEqual(createRuntimeConfig({}), {});
  assert.deepEqual(createRuntimeConfig({ REMOTE_CLIENT_URL: ' ', SOCKET_PROXY_URL: '' }), {});

  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'happyro-runtime-config-'));
  t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(outputDirectory, 'Config.runtime.js'),
    'window.ROConfigRuntime = {"remoteClient":"https://old.example.com/"};\n'
  );

  assert.equal(writeRuntimeConfig({ ROBROWSER_PATH: outputDirectory }), true);
  assert.equal(
    fs.readFileSync(path.join(outputDirectory, 'Config.runtime.js'), 'utf8'),
    'window.ROConfigRuntime = {};\n'
  );
});

test('accepts independent resource and WebSocket URLs', () => {
  assert.deepEqual(
    createRuntimeConfig({
      REMOTE_CLIENT_URL: 'https://happyro-static.example.com',
      SOCKET_PROXY_URL: 'wss://happyro-ws.example.com/ws/',
    }),
    {
      remoteClient: 'https://happyro-static.example.com/',
      socketProxy: 'wss://happyro-ws.example.com/ws/',
    }
  );
});

test('rejects unsupported URL protocols', () => {
  assert.throws(
    () => createRuntimeConfig({ REMOTE_CLIENT_URL: 'ftp://static.example.com' }),
    /REMOTE_CLIENT_URL must use http: or https:/
  );
  assert.throws(
    () => createRuntimeConfig({ SOCKET_PROXY_URL: 'https://ws.example.com/ws/' }),
    /SOCKET_PROXY_URL must use ws: or wss:/
  );
});

test('writes a browser-safe runtime configuration when an override is set', t => {
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'happyro-runtime-config-'));
  t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));

  assert.equal(
    writeRuntimeConfig({
      ROBROWSER_PATH: outputDirectory,
      REMOTE_CLIENT_URL: 'https://happyro-static.example.com/',
    }),
    true
  );
  assert.equal(
    fs.readFileSync(path.join(outputDirectory, 'Config.runtime.js'), 'utf8'),
    'window.ROConfigRuntime = {"remoteClient":"https://happyro-static.example.com/"};\n'
  );
});
