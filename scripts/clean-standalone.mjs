/**
 * Runs after `next build` (npm "postbuild"). Next's file tracing can copy the
 * local data folder (which holds PRIVATE user files) and env files into
 * .next/standalone. Remove them, then fail loudly if anything is left.
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".next/standalone");
if (!existsSync(root)) process.exit(0);

const removable = ["data", ".e2e-data", "test-results"];
for (const name of removable) rmSync(path.join(root, name), { recursive: true, force: true });

const offenders = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = path.join(dir, entry);
    if (/^\.env/.test(entry)) {
      rmSync(full, { force: true });
      continue;
    }
    if (statSync(full).isDirectory()) {
      if (entry === "private" || entry === "data") offenders.push(full);
      walk(full);
    }
  }
}
walk(root);

if (offenders.length) {
  console.error("[clean-standalone] private data found in the bundle:\n" + offenders.join("\n"));
  process.exit(1);
}
console.info("[clean-standalone] bundle contains no data folders or env files");
