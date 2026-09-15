const path = require('path');

function staysInside(root, resolved) {
  const relative = path.relative(root, resolved);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveContainedPath(root, filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return null;
  const normalized = filePath.replace(/\\/g, '/');
  if (path.isAbsolute(normalized) || /(^|\/)\.\.(\/|$)/.test(normalized)) return null;
  const resolved = path.resolve(root, normalized);
  if (!staysInside(root, resolved)) return null;
  return resolved;
}

function resolveConfiguredRoot(base, configuredPath) {
  if (typeof configuredPath !== 'string' || configuredPath.length === 0) return null;
  return path.resolve(base, configuredPath);
}

function literalSearchRegExp(filter) {
  if (typeof filter !== 'string' || filter.trim() === '') return null;
  return new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

module.exports = { resolveContainedPath, resolveConfiguredRoot, literalSearchRegExp };
