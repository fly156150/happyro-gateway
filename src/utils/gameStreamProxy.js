const { createWebSocketStream } = require('ws');

// Both directions are byte streams. pipe() propagates backpressure instead of
// dropping game messages, including while TCP is still connecting.
function bridgeGameStream(ws, tcp, { onClose = () => {}, connectTimeoutMs = 10000 } = {}) {
  const stream = createWebSocketStream(ws, { highWaterMark: 64 * 1024 });
  let closed = false;
  const timer = setTimeout(() => finish('connect timeout'), connectTimeoutMs);
  timer.unref();

  function finish(reason) {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    stream.unpipe(tcp);
    tcp.unpipe(stream);
    tcp.destroy();
    stream.destroy();
    onClose(reason);
  }

  tcp.once('connect', () => clearTimeout(timer));
  if (!tcp.connecting) clearTimeout(timer);
  tcp.once('error', err => finish(`tcp error: ${err.code || err.message}`));
  stream.once('error', err => finish(`websocket error: ${err.code || err.message}`));
  tcp.once('close', () => finish('tcp closed'));
  stream.once('close', () => finish('websocket closed'));
  stream.pipe(tcp);
  tcp.pipe(stream);
  return { close: finish };
}

module.exports = { bridgeGameStream };
