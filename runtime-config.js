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
  const remoteClient = optionalUrl(env.HAPPYRO_CLIENT_RESOURCE_URL, ['http:', 'https:'], 'HAPPYRO_CLIENT_RESOURCE_URL', true);
  const socketProxy = optionalUrl(env.HAPPYRO_CLIENT_SOCKET_PROXY_URL, ['ws:', 'wss:'], 'HAPPYRO_CLIENT_SOCKET_PROXY_URL');

  const timeZone = env.HAPPYRO_TIMEZONE || 'Asia/Shanghai';
  // Fail startup for a typo instead of falling back to the host/browser timezone.
  new Intl.DateTimeFormat('en', { timeZone }).format(0);
  return {
    timeZone,
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
