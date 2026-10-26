const test = require('node:test');
const assert = require('node:assert/strict');
const { definitions, readEnvironment, readValue } = require('../environment');

test('process configuration accepts defaults, false and boundary integers without silent fallback', () => {
  assert.equal(readEnvironment({}).HAPPYRO_GAME_PUBLIC_URL, 'http://127.0.0.1:3338');
  for (const [name, field] of Object.entries(definitions)) {
    assert.equal(readValue({}, name), field.default);
    assert.equal(readValue({ [name]: '' }, name), field.default);
    if (field.type === 'boolean') {
      for (const value of ['true', 'false']) assert.equal(readValue({ [name]: value }, name), value === 'true');
      for (const value of ['1', '0', 'TRUE', 'false ', 'typo']) assert.throws(() => readValue({ [name]: value }, name), /must be true or false/);
    } else if (field.type === 'integer') {
      for (const value of [field.min, field.max]) assert.equal(readValue({ [name]: String(value) }, name), value);
      for (const value of ['NaN', '2ms', '1.5', ' 1', String(field.min-1), String(field.max+1)]) assert.throws(() => readValue({ [name]: value }, name), /must be an integer/);
    } else {
      assert.equal(readValue({ [name]: 'https://example.test' }, name), 'https://example.test');
      for (const value of ['ftp://example.test', 'http://user:secret@example.test', 'http://example.test/?q=1', 'bad']) assert.throws(() => readValue({ [name]: value }, name), /HTTP/);
    }
  }
});
