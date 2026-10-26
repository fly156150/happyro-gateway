// One parser for process startup, diagnostics and resource cache configuration.
const definitions = {
  HAPPYRO_GAME_PUBLIC_URL: { type: 'url', default: 'http://127.0.0.1:3338' },
  HAPPYRO_GATEWAY_LISTEN_PORT: { type: 'integer', default: 3338, min: 1, max: 65535 },
  HAPPYRO_GATEWAY_WS_PROXY_ENABLED: { type: 'boolean', default: false },
  HAPPYRO_GATEWAY_STATIC_SERVE_ENABLED: { type: 'boolean', default: false },
  HAPPYRO_GATEWAY_ESRGAN_ENABLED: { type: 'boolean', default: false },
  HAPPYRO_GATEWAY_CACHE_WARMUP_ENABLED: { type: 'boolean', default: false },
  HAPPYRO_GATEWAY_CACHE_MAX_FILES: { type: 'integer', default: 5000, min: 1, max: 1000000 },
  HAPPYRO_GATEWAY_CACHE_MAX_MEMORY_MB: { type: 'integer', default: 1024, min: 1, max: 1048576 },
  HAPPYRO_GATEWAY_CACHE_WARMUP_MAX_FILES: { type: 'integer', default: 500, min: 1, max: 1000000 },
  HAPPYRO_GATEWAY_GRF_SCAN_MAX_FILES: { type: 'integer', default: 0, min: 0, max: 10000000 },
  HAPPYRO_GATEWAY_HTTP_PROXY_TIMEOUT_MS: { type: 'integer', default: 5000, min: 1, max: 300000 },
  HAPPYRO_GATEWAY_API_UPSTREAM_URL: { type: 'url', default: 'http://127.0.0.1:18081' },
  HAPPYRO_GATEWAY_GAME_WEB_UPSTREAM_URL: { type: 'url', default: '' },
};
function readValue(env, name) {
  const field = definitions[name];
  if (!field) throw new Error(`Unknown configuration field: ${name}`);
  const raw = env[name];
  if (raw === undefined || raw === '') return field.default;
  if (field.type === 'boolean') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    throw new Error(`${name} must be true or false`);
  }
  if (field.type === 'integer') {
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < field.min || value > field.max) {
      throw new Error(`${name} must be an integer in [${field.min}, ${field.max}]`);
    }
    return value;
  }
  let url;
  try { url = new URL(raw); } catch { throw new Error(`${name} must be an absolute HTTP(S) URL`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) URL without credentials, query or fragment`);
  }
  return raw;
}
function readEnvironment(env = process.env) {
  return Object.fromEntries(Object.keys(definitions).map(name => [name, readValue(env, name)]));
}
module.exports = { definitions, readValue, readEnvironment };
