const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const { createRuntimeConfig, createRuntimeConfigHandler } = require('../runtime-config');
const { createClientDefaults } = require('../client-defaults');
const schema = require('./support/client-defaults');
const config = env => createRuntimeConfig(env, schema);

test('uses the published PWA defaults and omits empty runtime URLs', () => {
  const expected = { timeZone: 'Asia/Shanghai', clientDefaults: createClientDefaults({}, schema) };
  assert.deepEqual(config({}), expected);
  assert.deepEqual(config({ REMOTE_CLIENT_URL: ' ', SOCKET_PROXY_URL: '', CLIENT_BGM_VOLUME: ' ' }), expected);
});
test('accepts independent resource and WebSocket URLs', () => {
  const result = config({ REMOTE_CLIENT_URL: 'https://happyro-static.example.com', SOCKET_PROXY_URL: 'wss://happyro-ws.example.com/ws/' });
  assert.equal(result.remoteClient, 'https://happyro-static.example.com/');
  assert.equal(result.socketProxy, 'wss://happyro-ws.example.com/ws/');
});
test('rejects unsupported URL protocols and invalid timezones', () => {
  assert.throws(() => config({ REMOTE_CLIENT_URL: 'ftp://static.example.com' }), /REMOTE_CLIENT_URL must use/);
  assert.throws(() => config({ SOCKET_PROXY_URL: 'https://ws.example.com/ws/' }), /SOCKET_PROXY_URL must use/);
  assert.throws(() => config({ APP_TIMEZONE: 'Invalid/Zone' }), RangeError);
  assert.equal(config({ APP_TIMEZONE: 'UTC' }).timeZone, 'UTC');
});
test('validates configured booleans, decimals, enums, category lists and combined ranges', () => {
  const result = config({ CLIENT_AUTO_TELEPORT_ENABLED: 'false', CLIENT_BGM_VOLUME: '0', CLIENT_GRAPHICS_FPS_LIMIT: '-1', CLIENT_AUTO_PICKUP_CATEGORIES: 'card, other', CLIENT_CAMERA_PHONE_PORTRAIT_ZOOM: '180.5' }).clientDefaults;
  assert.equal(result.autoCombat.teleport.enabled, false);
  assert.equal(result.audio.BGM.volume, 0);
  assert.equal(result.graphics.fpslimit, -1);
  assert.deepEqual(result.pickup.categories, ['card', 'other']);
  assert.equal(result.camera.phonePortraitZoom, 180.5);
  for (const [name, value] of [
    ['CLIENT_AUTO_TELEPORT_ENABLED', 'yes'], ['CLIENT_BGM_VOLUME', 'NaN'], ['CLIENT_BGM_VOLUME', 'Infinity'],
    ['CLIENT_BGM_VOLUME', '0x1'], ['CLIENT_BGM_VOLUME', '-1'], ['CLIENT_BGM_VOLUME', '1.1'],
    ['CLIENT_AUTO_COMBAT_SEARCH_RANGE', '2.5'], ['CLIENT_AUTO_COMBAT_SEARCH_RANGE', '51'],
    ['CLIENT_GRAPHICS_FPS_LIMIT', '59'], ['CLIENT_AUTO_PICKUP_CATEGORIES', 'card,card'],
    ['CLIENT_AUTO_PICKUP_CATEGORIES', 'secret'], ['CLIENT_AUTO_PICKUP_CATEGORIES', 'card,'],
  ]) assert.throws(() => config({ [name]: value }), new RegExp(name));
  assert.throws(() => config({ CLIENT_AUTO_COMBAT_SEARCH_RANGE: '40' }), /CLIENT_AUTO_COMBAT_ACTIVITY_RANGE/);
  assert.throws(() => config({ CLIENT_AUTO_COMBAT_ACTIVITY_RANGE: '10' }), /CLIENT_AUTO_COMBAT_ACTIVITY_RANGE/);
});
test('reads the shipped schema, produces independent defaults and exposes only configured public fields', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'happyro-defaults-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'client-defaults.schema.json'), JSON.stringify(schema));
  const first = createRuntimeConfig({ ROBROWSER_PATH: root, DATABASE_PASSWORD: 'private' });
  first.clientDefaults.pickup.categories.pop();
  const second = createRuntimeConfig({ ROBROWSER_PATH: root });
  assert.deepEqual(second.clientDefaults.pickup.categories, ['equipment', 'card']);
  assert(!JSON.stringify(first).includes('private'));
  assert.throws(() => createRuntimeConfig({ ROBROWSER_PATH: path.join(root, 'missing') }), /client-defaults.schema.json/);
});
test('runtime HTTP config survives PWA placeholder replacement and is not cached', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'happyro-runtime-http-'));
  const placeholder = path.join(root, 'Config.runtime.js');
  const settings = config({ CLIENT_AUTO_TELEPORT_ENABLED: 'false', CLIENT_BGM_VOLUME: '0.2', APP_TIMEZONE: 'UTC' });
  const app = express();
  app.get('/applications/pwa/Config.runtime.js', createRuntimeConfigHandler(settings));
  app.use('/applications/pwa', express.static(root));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${server.address().port}/applications/pwa/Config.runtime.js`;
  for (const contents of ['window.ROConfigRuntime = {};', 'window.ROConfigRuntime = {obsolete:true};']) {
    fs.writeFileSync(placeholder, contents);
    const response = await fetch(`${url}?v=new-build`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-type'), /javascript/);
    assert.equal(await response.text(), `window.ROConfigRuntime = ${JSON.stringify(settings)};\n`);
  }
});

test('validates the script text contrast policy without an off switch', () => {
  assert.equal(config({}).clientDefaults.scriptText.minContrast, 4.5);
  for (const value of ['4.5', '5.5', '7']) {
    assert.equal(config({ CLIENT_SCRIPT_TEXT_MIN_CONTRAST: value }).clientDefaults.scriptText.minContrast, Number(value));
  }
  for (const value of ['4.49', '7.01', 'false', 'NaN']) {
    assert.throws(() => config({ CLIENT_SCRIPT_TEXT_MIN_CONTRAST: value }), /CLIENT_SCRIPT_TEXT_MIN_CONTRAST/);
  }
});

test('validates independent recovery thresholds and their combined ordering', () => {
  const env = { CLIENT_AUTO_RECOVERY_HP_TRIGGER_PERCENT: '80', CLIENT_AUTO_RECOVERY_HP_TARGET_PERCENT: '100', CLIENT_AUTO_RECOVERY_SP_TRIGGER_PERCENT: '50', CLIENT_AUTO_RECOVERY_SP_TARGET_PERCENT: '90' };
  assert.deepEqual(config(env).clientDefaults.autoRecovery, { hp: { trigger: 80, target: 100 }, sp: { trigger: 50, target: 90 } });
  for (const stat of ['HP', 'SP']) {
    for (const value of ['0', '100', '2.5', 'NaN']) assert.throws(() => config({ ...env, [`CLIENT_AUTO_RECOVERY_${stat}_TRIGGER_PERCENT`]: value }), /TRIGGER_PERCENT/);
    for (const value of ['1', '101', '50']) assert.throws(() => config({ ...env, [`CLIENT_AUTO_RECOVERY_${stat}_TARGET_PERCENT`]: value }), /TARGET_PERCENT/);
  }
});
