const http = require('http');
const https = require('https');

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function withoutHopByHopHeaders(headers) {
  const connectionTokens = String(headers.connection || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  const excluded = new Set([...HOP_BY_HOP_HEADERS, ...connectionTokens]);

  return Object.fromEntries(
    Object.entries(headers).filter(([name, value]) => value !== undefined && !excluded.has(name.toLowerCase()))
  );
}

function createHttpProxyMiddleware({
  targetUrl,
  path: resolvePath = request => request.originalUrl,
  timeoutMs = 5000,
  logger,
  serviceName,
  unavailableBody,
}) {
  const target = new URL(targetUrl);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error(`${serviceName} proxy target must use http: or https:`);
  }
  const transport = target.protocol === 'https:' ? https : http;

  return (request, response) => {
    let timedOut = false;
    const headers = {
      ...withoutHopByHopHeaders(request.headers),
      host: target.host,
      'x-forwarded-for': request.socket.remoteAddress || '',
      'x-forwarded-host': request.headers.host || '',
      'x-forwarded-proto': request.protocol,
    };
    const proxyRequest = transport.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: request.method,
      path: resolvePath(request),
      headers,
    }, proxyResponse => {
      response.status(proxyResponse.statusCode || 502);
      for (const [name, value] of Object.entries(withoutHopByHopHeaders(proxyResponse.headers))) {
        response.setHeader(name, value);
      }
      proxyResponse.pipe(response);
    });

    proxyRequest.setTimeout(timeoutMs, () => {
      timedOut = true;
      proxyRequest.destroy(new Error(`${serviceName} proxy timed out`));
    });
    proxyRequest.on('error', error => {
      logger.error(`${serviceName} proxy error: ${error.message}`);
      if (!response.headersSent) {
        response.status(timedOut ? 504 : 502).json(unavailableBody);
      } else if (!response.writableEnded) {
        response.end();
      }
    });
    request.on('aborted', () => proxyRequest.destroy());
    response.on('close', () => {
      if (!response.writableEnded) proxyRequest.destroy();
    });
    request.pipe(proxyRequest);
  };
}

module.exports = { createHttpProxyMiddleware, withoutHopByHopHeaders };
