const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const { createHttpProxyMiddleware, withoutHopByHopHeaders } = require('../src/middlewares/httpProxyMiddleware');

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { headers }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    request.on('error', reject);
  });
}

async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

test('removes standard and connection-declared hop-by-hop headers', () => {
  assert.deepEqual(withoutHopByHopHeaders({
    connection: 'keep-alive, x-private',
    'keep-alive': 'timeout=5',
    'x-private': 'secret',
    'x-public': 'visible',
  }), { 'x-public': 'visible' });
});

test('forwards the request through the configured target and path', async t => {
  const backend = http.createServer((request, response) => {
    response.setHeader('connection', 'x-backend-private');
    response.setHeader('x-backend-private', 'hidden');
    response.setHeader('x-backend-public', 'visible');
    response.end(JSON.stringify({ path: request.url, private: request.headers['x-client-private'] }));
  });
  const targetUrl = await listen(backend);
  t.after(() => close(backend));

  const app = express();
  app.use('/proxy', createHttpProxyMiddleware({
    targetUrl,
    path: request => `/target${request.url}`,
    logger: { error() {} },
    serviceName: 'Test',
    unavailableBody: { error: 'unavailable' },
  }));
  const gateway = http.createServer(app);
  const gatewayUrl = await listen(gateway);
  t.after(() => close(gateway));

  const response = await get(`${gatewayUrl}/proxy/example?q=1`, {
    connection: 'x-client-private',
    'x-client-private': 'hidden',
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers['x-backend-public'], 'visible');
  assert.equal(response.headers['x-backend-private'], undefined);
  assert.deepEqual(JSON.parse(response.body), { path: '/target/example?q=1' });
});

test('returns 504 when the target exceeds the configured timeout', async t => {
  const backend = http.createServer(() => {});
  const targetUrl = await listen(backend);
  t.after(() => close(backend));

  const app = express();
  app.use(createHttpProxyMiddleware({
    targetUrl,
    timeoutMs: 20,
    logger: { error() {} },
    serviceName: 'Test',
    unavailableBody: { error: 'unavailable' },
  }));
  const gateway = http.createServer(app);
  const gatewayUrl = await listen(gateway);
  t.after(() => close(gateway));

  const response = await fetch(gatewayUrl);

  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: 'unavailable' });
});

test('rejects unsupported target protocols at startup', () => {
  assert.throws(() => createHttpProxyMiddleware({
    targetUrl: 'ftp://example.com',
    logger: { error() {} },
    serviceName: 'Test',
    unavailableBody: {},
  }), /must use http: or https:/);
});
