#!/usr/bin/env node

import { GrfNode } from "@chicowall/grf-loader";
import { chmodSync, closeSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const grfPath = process.argv[2];
const outputRoot = process.argv[3];
const encoding = process.argv[4] || "auto";

if (!grfPath || !outputRoot) {
  console.error("Usage: node tools/extract-grf.mjs <grfPath> <outputRoot> [encoding=auto]");
  process.exit(1);
}

function safeRelativePath(grfName) {
  const relative = String(grfName).replace(/[\\/]+/g, "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(relative);
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Unsafe GRF path: ${grfName}`);
  }
  return normalized;
}

function progress(index, total, bytes) {
  if (index % 250 !== 0 && index !== total) return;
  const percent = ((index / total) * 100).toFixed(2);
  process.stdout.write(`\r${index}/${total} (${percent}%) ${Math.round(bytes / 1024 / 1024)} MiB`);
}

const startedAt = new Date().toISOString();
const root = path.resolve(outputRoot);
mkdirSync(root, { recursive: true });
const fd = openSync(grfPath, "r");
const manifest = [];
let totalBytes = 0;
let failed = 0;

try {
  const grf = new GrfNode(fd, { filenameEncoding: encoding });
  await grf.load();
  const keys = Array.from(grf.files?.keys() || []);
  console.log(`Loaded ${keys.length} files from ${path.resolve(grfPath)}`);

  for (let index = 0; index < keys.length; index += 1) {
    const grfName = keys[index];
    const entry = { grfPath: grfName, status: "ok" };
    try {
      const relative = safeRelativePath(grfName);
      const target = path.resolve(root, relative);
      if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`Path escapes output root: ${grfName}`);
      const result = await grf.getFile(grfName);
      if (result?.error || !result?.data || typeof result.data.length !== "number") {
        throw new Error(String(result?.error || "Invalid GRF data"));
      }
      const directory = path.dirname(target);
      mkdirSync(directory, { recursive: true, mode: 0o755 });
      chmodSync(directory, 0o755);
      writeFileSync(target, result.data);
      chmodSync(target, 0o644);
      const digest = createHash("sha256").update(result.data).digest("hex");
      entry.path = relative;
      entry.bytes = result.data.length;
      entry.sha256 = digest;
      totalBytes += result.data.length;
    } catch (error) {
      failed += 1;
      entry.status = "failed";
      entry.error = String(error?.message || error);
    }
    manifest.push(entry);
    progress(index + 1, keys.length, totalBytes);
  }
} finally {
  closeSync(fd);
}

process.stdout.write("\n");
const report = {
  source: path.resolve(grfPath),
  encoding,
  startedAt,
  finishedAt: new Date().toISOString(),
  fileCount: manifest.length,
  extractedCount: manifest.length - failed,
  failedCount: failed,
  totalBytes,
  files: manifest,
};
const manifestPath = path.join(root, "manifest.json");
writeFileSync(manifestPath, JSON.stringify(report), "utf8");
console.log(`Extracted ${report.extractedCount}/${report.fileCount} files (${totalBytes} bytes)`);
console.log(`Manifest: ${manifestPath}`);
if (failed > 0) process.exitCode = 2;
