const { createClientDefaults } = require('./client-defaults');

function optionalUrl(value, protocols, name, ensureTrailingSlash = false) {
  const input = value?.trim();
  if (!input) return undefined;

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(' or ')}`);
  }

  if (ensureTrailingSlash && !url.pathname.endsWith('/')) {
    url.pathname += '/';
  }

  return url.toString();
}

function createRuntimeConfig(env = process.env, schema) {
  const remoteClient = optionalUrl(env.REMOTE_CLIENT_URL, ['http:', 'https:'], 'REMOTE_CLIENT_URL', true);
  const socketProxy = optionalUrl(env.SOCKET_PROXY_URL, ['ws:', 'wss:'], 'SOCKET_PROXY_URL');

  return {
    clientDefaults: createClientDefaults(env, schema),
    ...(remoteClient && { remoteClient }),
    ...(socketProxy && { socketProxy }),
  };
}

// Serve from memory rather than the build directory: rebuilding the PWA cannot replace deployment settings.
function createRuntimeConfigHandler(config) {
  const source = `window.ROConfigRuntime = ${JSON.stringify(config)};\n`;
  return (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('application/javascript').send(source);
  };
}

module.exports = { createRuntimeConfig, createRuntimeConfigHandler };
