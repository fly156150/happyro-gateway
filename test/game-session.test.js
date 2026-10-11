const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const { createGameSessionRouter } = require('../src/routes/gameSession');
async function setup(t, handler) {
  const app = express(), requests = [];
  app.use('/api/game-session', createGameSessionRouter({ targetUrl: 'http://backend',
    fetchBackend: async (url, options) => {
      const body = JSON.parse(options.body); requests.push({ path: url.pathname, body });
      return handler ? handler(body) : Response.json({ accountId: 42, username: 'player', persistent: body.persistent ?? true, expires: 1900000000 });
    },
  }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(() => { server.closeAllConnections(); server.close(); });
  const post = (path, body, headers = {}) => fetch(`${origin}/api/game-session/${path}`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  return { post, origin, requests };
}
const login = { accountId: 42, webToken: 'a'.repeat(32), persistent: true };
test('HTTP persistence uses HttpOnly cookie without exposing credential', async t => {
  const { post, requests } = await setup(t);
  const response = await post('create', login);
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /happyro_session=[a-f0-9]{64}/);
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.doesNotMatch(cookie, /Secure/);
  assert.equal((await response.json()).token, undefined);
  assert.match(requests[0].body.nextToken, /^[a-f0-9]{64}$/);
});
test('HTTPS reverse proxy origin sets Secure cookie', async t => {
  const { post, origin } = await setup(t);
  const response = await post('create', login, { Origin: origin.replace('http:', 'https:') });
  assert.match(response.headers.get('set-cookie'), /happyro_session_tls=/);
  assert.match(response.headers.get('set-cookie'), /Secure/);
});
test('page-only login returns memory token and removes persistent cookie', async t => {
  const { post } = await setup(t);
  const response = await post('create', { ...login, persistent: false });
  assert.match((await response.json()).token, /^[a-f0-9]{64}$/);
  assert.match(response.headers.get('set-cookie'), /1970/);
});
test('resume rotates credential and exposes one-use ticket; logout revokes', async t => {
  const { post, requests } = await setup(t);
  const cookie = `happyro_session=${'b'.repeat(64)}`;
  const response = await post('resume', {}, { Cookie: cookie });
  const data = await response.json();
  assert.match(data.ticket, /^[a-f0-9]{64}$/); assert.equal(data.token, undefined);
  assert.equal(requests[0].body.token, 'b'.repeat(64));
  assert.notEqual(requests[0].body.nextToken, requests[0].body.token);
  const logout = await post('revoke', {}, { Cookie: cookie });
  assert.equal(logout.status, 204); assert.match(logout.headers.get('set-cookie'), /1970/);
});
test('cross-origin and malformed requests never reach backend', async t => {
  const { post, requests } = await setup(t);
  assert.equal((await post('create', login, { Origin: 'http://evil.test' })).status, 403);
  assert.equal((await post('create', login, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post('create', { ...login, accountId: '42' })).status, 400);
  assert.equal((await post('resume', {})).status, 401);
  assert.equal(requests.length, 0);
});
test('expired credential does not erase a concurrently rotated cookie', async t => {
  const { post } = await setup(t, () => new Response('', { status: 401 }));
  const response = await post('resume', { token: 'c'.repeat(64) });
  assert.equal(response.status, 401); assert.equal(response.headers.get('set-cookie'), null);
});
