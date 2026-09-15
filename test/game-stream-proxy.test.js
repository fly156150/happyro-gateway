const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
const WebSocket = require('ws');
const { bridgeGameStream } = require('../src/utils/gameStreamProxy');

test('preserves bytes through early sends, slow TCP reads and arbitrary message boundaries', { timeout: 10000 }, async t => {
  const peers = new Set();
  const tcpServer = net.createServer(socket => {
    peers.add(socket);
    socket.pause();
    setTimeout(() => socket.resume(), 30);
    socket.pipe(socket);
  });
  tcpServer.listen(0, '127.0.0.1');
  await once(tcpServer, 'listening');
  const wss = new WebSocket.Server({ port: 0, host: '127.0.0.1', maxPayload: 65536 });
  await once(wss, 'listening');
  const closed = [];
  wss.on('connection', ws => {
    const tcp = net.connect(tcpServer.address().port, '127.0.0.1');
    peers.add(tcp);
    bridgeGameStream(ws, tcp, { onClose: reason => closed.push(reason) });
  });
  const client = new WebSocket(`ws://127.0.0.1:${wss.address().port}`);
  t.after(() => {
    client.terminate();
    for (const ws of wss.clients) ws.terminate();
    for (const socket of peers) socket.destroy();
    wss.close();
    tcpServer.close();
  });
  const expected = Buffer.alloc(1024 * 1024);
  for (let i = 0; i < expected.length; i++) expected[i] = (i * 31 + (i >> 8)) & 255;
  const chunks = [];
  const received = new Promise((resolve, reject) => {
    let count = 0;
    client.on('error', reject);
    client.on('message', bytes => {
      chunks.push(bytes);
      count += bytes.length;
      if (count >= expected.length) resolve();
    });
  });
  await once(client, 'open');
  // More than the old 64-message pending limit; sends race the TCP connect.
  for (let offset = 0; offset < expected.length; offset += 838)
    client.send(expected.subarray(offset, offset + 838));
  await received;
  assert.deepEqual(Buffer.concat(chunks), expected);
  assert.equal(closed.length, 0);
  client.close();
  await once(client, 'close');
});

test('TCP failure tears down both sides exactly once', { timeout: 5000 }, async t => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const wss = new WebSocket.Server({ port: 0, host: '127.0.0.1' });
  await once(wss, 'listening');
  const reasons = [];
  wss.on('connection', ws => bridgeGameStream(ws, net.connect(port, '127.0.0.1'), {
    onClose: reason => reasons.push(reason)
  }));
  const client = new WebSocket(`ws://127.0.0.1:${wss.address().port}`);
  t.after(() => { client.terminate(); wss.close(); });
  await once(client, 'close');
  assert.equal(reasons.length, 1);
  assert.match(reasons[0], /ECONNREFUSED/);
});
