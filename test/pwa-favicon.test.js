const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { resolvePwaFaviconPath } = require('../src/utils/pwaFavicon');

test('returns the PWA favicon when ROBROWSER_PATH is absolute', t => {
  const gatewayRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'happyro-gateway-root-'));
  const pwaRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'happyro-pwa-'));
  t.after(() => {
    fs.rmSync(gatewayRoot, { recursive: true, force: true });
    fs.rmSync(pwaRoot, { recursive: true, force: true });
  });
  const favicon = path.join(pwaRoot, 'favicon.ico');
  fs.writeFileSync(favicon, 'pwa-icon');
  assert.equal(resolvePwaFaviconPath(gatewayRoot, pwaRoot), favicon);
});

test('resolves the default client dist path from the gateway root', t => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'happyro-workspace-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const gatewayRoot = path.join(workspace, 'repos', 'happyro-gateway');
  const favicon = path.join(workspace, 'repos', 'happyro-client', 'dist', 'Web', 'favicon.ico');
  fs.mkdirSync(path.dirname(favicon), { recursive: true });
  fs.mkdirSync(gatewayRoot, { recursive: true });
  fs.writeFileSync(favicon, 'pwa-icon');
  assert.equal(resolvePwaFaviconPath(gatewayRoot), favicon);
});

test('returns null when the PWA favicon is missing', () => {
  assert.equal(resolvePwaFaviconPath('/tmp/missing-gateway-root', '/tmp/missing-pwa-root'), null);
});
