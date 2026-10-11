const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createClientDiagnosticsRouter } = require('../src/routes/clientDiagnostics');

async function setup(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'happyro-diagnostics-'));
  const app = express();
  app.use('/api/client-diagnostics', await createClientDiagnosticsRouter({ directory, ...options }));
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const post = (endpoint, body, from = origin) => fetch(origin + '/api/client-diagnostics' + endpoint, {
    method: 'POST', headers: { Origin: from, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  async function session() {
    const response = await post('/sessions', {});
    assert.equal(response.status, 201);
    return (await response.json()).session;
  }
  return { directory, post, session };
}
const entry = { event: 'perf.frame-gap', time: '2026-09-24T12:00:00.000Z', elapsedMs: 1234, intervalMs: 85 };

test('disabled receiver never creates a session', async t => {
  const { post } = await setup(t, { directory: undefined });
  assert.equal((await post('/sessions', {})).status, 404);
});

test('writes separate JSONL sessions and deduplicates concurrent retries', async t => {
  const { post, session, directory } = await setup(t);
  const one = await session(), two = await session();
  const batch = { sequence: 1, entries: [entry] };
  const responses = await Promise.all([post(`/sessions/${one}/events`, batch), post(`/sessions/${one}/events`, batch)]);
  assert.deepEqual(responses.map(response => response.status), [204, 204]);
  assert.equal((await post(`/sessions/${two}/events`, { sequence: 1, entries: [{ ...entry, intervalMs: 60 }] })).status, 204);
  const [date] = await fs.readdir(directory);
  const lines = (await fs.readFile(path.join(directory, date, `${one}.jsonl`), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].intervalMs, 85);
  assert.equal(lines[1].batch, 1);
  assert.ok(lines[1].receivedAt);
  assert.equal((await fs.readdir(path.join(directory, date))).length, 2);
});

test('rejects other origins, forged sessions, malformed entries and oversized bodies', async t => {
  const { post, session } = await setup(t);
  assert.equal((await post('/sessions', {}, 'http://unrelated.example')).status, 403);
  const id = await session();
  assert.equal((await post(`/sessions/${id}/events`, { sequence: 1, entries: [{ ...entry, elapsedMs: null }] })).status, 400);
  assert.equal((await post('/sessions/00000000-0000-0000-0000-000000000000/events', { sequence: 1, entries: [entry] })).status, 404);
  assert.equal((await post(`/sessions/${id}/events`, { sequence: 2, entries: [entry] })).status, 409);
  assert.equal((await post(`/sessions/${id}/events`, { sequence: 1, entries: [{ ...entry, message: 'x'.repeat(50000) }] })).status, 413);
});

test('enforces file and session limits without appending beyond the limit', async t => {
  const { post, session, directory } = await setup(t, { maxSessionBytes: 200, maxSessions: 1 });
  const id = await session();
  assert.equal((await post('/sessions', {})).status, 507);
  assert.equal((await post(`/sessions/${id}/events`, { sequence: 1, entries: [entry] })).status, 507);
  const [date] = await fs.readdir(directory);
  const lines = (await fs.readFile(path.join(directory, date, `${id}.jsonl`), 'utf8')).trim().split('\n');
  assert.equal(lines.length, 1);
});

test('includes existing files in the total quota after receiver restart', async t => {
  const { directory, session } = await setup(t);
  await session();
  const app = express();
  app.use('/api/client-diagnostics', await createClientDiagnosticsRouter({ directory, maxTotalBytes: 1 }));
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(origin + '/api/client-diagnostics/sessions', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(response.status, 507);
});
