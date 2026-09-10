const fs = require('fs');
const path = require('path');

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

function createRuntimeConfig(env = process.env) {
  const remoteClient = optionalUrl(env.REMOTE_CLIENT_URL, ['http:', 'https:'], 'REMOTE_CLIENT_URL', true);
  const socketProxy = optionalUrl(env.SOCKET_PROXY_URL, ['ws:', 'wss:'], 'SOCKET_PROXY_URL');

  return {
    ...(remoteClient && { remoteClient }),
    ...(socketProxy && { socketProxy }),
  };
}

function writeRuntimeConfig(env = process.env) {
  const config = createRuntimeConfig(env);
  const robrowserPath = path.resolve(__dirname, env.ROBROWSER_PATH || '../roBrowserLegacy');
  const outputPath = path.join(robrowserPath, 'Config.runtime.js');
  fs.writeFileSync(outputPath, `window.ROConfigRuntime = ${JSON.stringify(config)};\n`, 'utf8');
  return true;
}

module.exports = { createRuntimeConfig, writeRuntimeConfig };
