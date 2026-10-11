const express = require('express');
const { randomBytes } = require('node:crypto');

const TOKEN = /^[a-f0-9]{64}$/;
const COOKIE_PATH = '/api/game-session';

// Persistent credentials never enter JavaScript. Page-only credentials are returned
// to the caller and must remain in memory, not browser storage.
function createGameSessionRouter({ targetUrl, fetchBackend = fetch }) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    let origin;
    try { origin = new URL(req.get('origin')); } catch { return res.sendStatus(403); }
    if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.get('host') ||
        req.get('sec-fetch-site') === 'cross-site') return res.sendStatus(403);
    if (!req.is('application/json')) return res.sendStatus(415);
    req.sessionSecure = origin.protocol === 'https:';
    next();
  });
  router.use(express.json({ limit: '4kb' }));

  function cookieName(req) { return req.sessionSecure ? 'happyro_session_tls' : 'happyro_session'; }
  function credential(req) {
    if (TOKEN.test(req.body?.token || '')) return req.body.token;
    const prefix = `${cookieName(req)}=`;
    const value = (req.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(prefix));
    const token = value?.slice(prefix.length);
    return TOKEN.test(token || '') ? token : null;
  }
  function setCookie(req, res, token, expires) {
    res.cookie(cookieName(req), token, {
      httpOnly: true, secure: req.sessionSecure, sameSite: 'strict', path: COOKIE_PATH,
      expires: new Date(expires * 1000),
    });
  }
  async function backend(operation, body) {
    const result = await fetchBackend(new URL(`/session/${operation}`, targetUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) return { status: result.status === 401 ? 401 : 503 };
    return { status: 200, data: await result.json() };
  }
  for (const operation of ['create', 'resume', 'revoke']) {
    router.post(`/${operation}`, async (req, res) => {
      if (!targetUrl) return res.sendStatus(503);
      const token = credential(req);
      if (operation !== 'create' && !token) return res.sendStatus(401);
      if (operation === 'create' && (!Number.isSafeInteger(req.body?.accountId) ||
          req.body.accountId <= 0 || typeof req.body.webToken !== 'string' ||
          req.body.webToken.length > 64 || typeof req.body.persistent !== 'boolean')) return res.sendStatus(400);
      const nextToken = randomBytes(32).toString('hex');
      const ticket = randomBytes(32).toString('hex');
      const body = operation === 'create'
        ? { accountId: req.body.accountId, webToken: req.body.webToken,
          persistent: req.body.persistent, nextToken, previousToken: token }
        : { token, nextToken, ticket };
      try {
        const result = await backend(operation, body);
        // Never erase a cookie on failed resume: another tab may just have rotated it.
        if (result.status !== 200) return res.sendStatus(result.status);
        if (operation === 'revoke') {
          setCookie(req, res, '', 0);
          return res.sendStatus(204);
        }
        const data = result.data;
        if (!Number.isSafeInteger(data.expires) || typeof data.persistent !== 'boolean') return res.sendStatus(503);
        if (data.persistent) setCookie(req, res, nextToken, data.expires);
        else if (operation === 'create') setCookie(req, res, '', 0);
        res.json({ accountId: data.accountId, username: data.username, expires: data.expires,
          persistent: data.persistent, ...(data.persistent ? {} : { token: nextToken }),
          ...(operation === 'resume' ? { ticket } : {}) });
      } catch { res.sendStatus(503); }
    });
  }
  return router;
}

module.exports = { createGameSessionRouter };
