const fs = require('node:fs');
const path = require('node:path');

function readClientDefaultsSchema(env) {
  const root = path.resolve(__dirname, env.ROBROWSER_PATH || '../../repos/happyro-client/dist/Web');
  return JSON.parse(fs.readFileSync(path.join(root, 'client-defaults.schema.json'), 'utf8'));
}

function parseValue(name, input, field) {
  const invalid = message => { throw new Error(`${name}: ${message}`); };
  if (field.type === 'boolean') {
    if (input === 'true') return true;
    if (input === 'false') return false;
    return invalid('must be true or false');
  }
  if (field.type === 'list') {
    const items = input.split(',').map(item => item.trim());
    if (items.some(item => !field.options.includes(item)) || new Set(items).size !== items.length) {
      return invalid(`must be a comma-separated selection of ${field.options.join(',')} without duplicates`);
    }
    return items;
  }
  if (field.type !== 'number') return invalid('unsupported schema type');
  const value = Number(input);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input) || !Number.isFinite(value)) {
    return invalid('must be a finite decimal number');
  }
  if (field.integer && !Number.isInteger(value)) return invalid('must be an integer');
  if (field.options && !field.options.includes(value)) return invalid(`must be one of ${field.options.join(',')}`);
  if (field.min !== undefined && value < field.min) return invalid(`must be at least ${field.min}`);
  if (field.max !== undefined && value > field.max) return invalid(`must be at most ${field.max}`);
  return value;
}

function createClientDefaults(env, schema = readClientDefaultsSchema(env)) {
  const defaults = {};
  for (const [name, field] of Object.entries(schema.fields)) {
    const input = env[name]?.trim();
    const value = input ? parseValue(name, input, field) : structuredClone(field.default);
    const keys = field.path.split('.');
    let target = defaults;
    for (const key of keys.slice(0, -1)) target = target[key] ??= {};
    target[keys.at(-1)] = value;
  }
  const ranges = defaults.autoCombat.ranges;
  if (ranges.activity < ranges.search) {
    throw new Error('CLIENT_AUTO_COMBAT_ACTIVITY_RANGE must be at least CLIENT_AUTO_COMBAT_SEARCH_RANGE');
  }
  for (const stat of ['hp', 'sp']) {
    const { trigger, target } = defaults.autoRecovery[stat];
    if (target <= trigger) {
      const prefix = `CLIENT_AUTO_RECOVERY_${stat.toUpperCase()}`;
      throw new Error(`${prefix}_TARGET_PERCENT must be greater than ${prefix}_TRIGGER_PERCENT`);
    }
  }
  return defaults;
}

module.exports = { createClientDefaults, readClientDefaultsSchema };
