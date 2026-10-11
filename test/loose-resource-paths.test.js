const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const iconv = require('iconv-lite');
const Client = require('../src/controllers/clientController');

test('serves Korean loose resources for the client CP949 byte-string paths', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'happyro-loose-icons-'));
  const previous = process.env.DATA_OVERRIDE_PATH;
  t.after(async () => {
    if (previous === undefined) delete process.env.DATA_OVERRIDE_PATH;
    else process.env.DATA_OVERRIDE_PATH = previous;
    await fs.rm(root, {recursive: true});
  });
  process.env.DATA_OVERRIDE_PATH = root;
  const relative = 'texture/유저인터페이스/item/DK_DRAGONIC_BREATH.bmp';
  const expected = Buffer.from('reviewed-icon-content');
  await fs.mkdir(path.dirname(path.join(root, relative)), {recursive: true});
  await fs.writeFile(path.join(root, relative), expected);
  const clientPath = 'data/' + iconv.encode(relative, 'cp949').toString('latin1');

  assert.deepEqual(await Client.getFile(clientPath), expected);
  assert.deepEqual(await Client.getFile('data/' + relative), expected);
  assert.deepEqual(await Client.getFile(clientPath.replaceAll('/', '\\')), expected);
  assert.equal(await Client.getFile('data/../../outside.bmp'), null);
});

test('custom resources win over cached built-ins and update or revert without restarting', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'happyro-custom-icons-'));
  const oldCustom = process.env.CUSTOM_RESOURCE_PATH, oldOverrides = process.env.DATA_OVERRIDE_PATH;
  t.after(async () => {
    if (oldCustom === undefined) delete process.env.CUSTOM_RESOURCE_PATH; else process.env.CUSTOM_RESOURCE_PATH = oldCustom;
    if (oldOverrides === undefined) delete process.env.DATA_OVERRIDE_PATH; else process.env.DATA_OVERRIDE_PATH = oldOverrides;
    await fs.rm(root, {recursive: true});
  });
  const builtin = path.join(root, 'builtin'), custom = path.join(root, 'custom');
  await fs.mkdir(builtin); await fs.mkdir(custom);
  await fs.writeFile(path.join(builtin, 'custom-priority.bmp'), 'builtin');
  process.env.DATA_OVERRIDE_PATH = builtin;
  process.env.CUSTOM_RESOURCE_PATH = custom;
  const file = 'data/custom-priority.bmp';
  assert.equal((await Client.getFile(file)).toString(), 'builtin');
  await fs.writeFile(path.join(custom, 'custom-priority.bmp'), 'custom');
  assert.equal(Client.getFileCachedETag(file), null);
  assert.equal((await Client.getFile(file)).toString(), 'custom');
  await fs.writeFile(path.join(custom, 'custom-priority.bmp'), 'updated');
  assert.equal((await Client.getFile(file)).toString(), 'updated');
  await fs.unlink(path.join(custom, 'custom-priority.bmp'));
  assert.equal((await Client.getFile(file)).toString(), 'builtin');
  assert.equal(await Client.getFile('data/../../outside.bmp'), null);
});
