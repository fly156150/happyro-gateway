const fs = require('fs');
const path = require('path');

const DEFAULT_ROBROWSER_PATH = '../../repos/happyro-client/dist/Web';

function resolvePwaFaviconPath(gatewayRoot, robrowserPath) {
  const base = typeof robrowserPath === 'string' && robrowserPath.trim() ? robrowserPath : DEFAULT_ROBROWSER_PATH;
  const resolved = path.resolve(gatewayRoot, base, 'favicon.ico');
  if (!fs.existsSync(resolved)) {
    return null;
  }
  return resolved;
}

module.exports = { DEFAULT_ROBROWSER_PATH, resolvePwaFaviconPath };
