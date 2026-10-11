const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const Client = require('../src/controllers/clientController');
// Route tests do not initialize live GRF files or services.
Client.init = async () => {};
const router = require('../src/routes/index');

test('custom resource HTTP responses bypass stale ETags and report invalid overrides', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'happyro-custom-http-'));
  const previous = process.env.CUSTOM_RESOURCE_PATH;
  process.env.CUSTOM_RESOURCE_PATH = root;
  const app = express(); app.use(router);
  app.use((error, req, res, next) => res.status(500).send('Invalid custom resource'));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.CUSTOM_RESOURCE_PATH; else process.env.CUSTOM_RESOURCE_PATH = previous;
    await fs.rm(root, {recursive:true});
  });
  const url = `http://127.0.0.1:${server.address().port}/data/http-custom.bmp`;
  await fs.writeFile(path.join(root, 'http-custom.bmp'), 'first');
  let response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const tag = response.headers.get('etag');
  assert.equal(await response.text(), 'first');
  await fs.writeFile(path.join(root, 'http-custom.bmp'), 'second');
  response = await fetch(url, {headers:{'If-None-Match': tag}});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'second');
  await fs.unlink(path.join(root, 'http-custom.bmp'));
  await fs.symlink('/not-a-real-custom-file', path.join(root, 'http-custom.bmp'));
  response = await fetch(url);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
