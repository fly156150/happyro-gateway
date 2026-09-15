const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { resolveContainedPath, literalSearchRegExp } = require('../src/utils/safePath');

const root = path.resolve('/tmp/happyro-gateway-root');

test('rejects parent-directory traversal in getFile paths', () => {
  assert.equal(resolveContainedPath(root, '../etc/passwd'), null);
  assert.equal(resolveContainedPath(root, 'data/../../etc/passwd'), null);
  assert.equal(resolveContainedPath(root, '/etc/passwd'), null);
});

test('resolves files that stay inside the gateway tree', () => {
  const resolved = resolveContainedPath(root, 'data/prontera.gat');
  assert.equal(resolved, path.join(root, 'data/prontera.gat'));
});

test('distinguishes a sibling path from the gateway root', () => {
  assert.equal(resolveContainedPath(root, '../happyro-gateway-root2/secret.js'), null);
  assert.equal(resolveContainedPath(root, 'data/client2/secret.js'), path.join(root, 'data/client2/secret.js'));
});

test('compiles user search filters as literals instead of regex', () => {
  const regex = literalSearchRegExp('prontera.gat');
  assert.ok(regex.test('data/prontera.gat'));
  assert.equal(regex.test('pronteraxgat'), false);
  assert.equal(literalSearchRegExp(''), null);
});
