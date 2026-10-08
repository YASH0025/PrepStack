/**
 * Prepares public/vendor, served by the app itself (no third-party CDN sees users):
 *   - Pyodide (Python in WebAssembly) and Monaco (the VS Code editor), copied
 *     from node_modules when the installed versions change
 *   - the coding runner's Web Workers (vendor/runner/*.mjs), built every time
 *     from src/modules/coding/runner/*.ts by stripping TypeScript types. They
 *     are served as native ES module workers because Pyodide refuses to run in
 *     the classic workers a bundler produces.
 * Runs before dev and build. public/vendor is git-ignored.
 */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const out = path.resolve("public/vendor");

function packageDir(name) {
  return path.resolve("node_modules", name);
}

async function version(name) {
  return JSON.parse(await readFile(path.join(packageDir(name), "package.json"), "utf8")).version;
}

const PYODIDE_FILES = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

const RUNNER_SOURCES = ["harness", "protocol", "python-harness", "js.worker", "py.worker"];

/** Builds vendor/runner/<name>.mjs from src/modules/coding/runner/<name>.ts. */
async function buildRunner() {
  const from = path.resolve("src/modules/coding/runner");
  const to = path.join(out, "runner");
  await mkdir(to, { recursive: true });
  for (const name of RUNNER_SOURCES) {
    const source = await readFile(path.join(from, `${name}.ts`), "utf8");
    const js = stripTypeScriptTypes(source, { mode: "strip" }).replace(
      /from "\.\/([\w.-]+)"/g,
      (_match, file) => `from "./${file}.mjs"`,
    );
    await writeFile(path.join(to, `${name}.mjs`), js);
  }
}

process.removeAllListeners("warning"); // stripTypeScriptTypes is marked experimental.
await mkdir(out, { recursive: true });
await buildRunner();

const stamp = path.join(out, "versions.json");
const wanted = { pyodide: await version("pyodide"), monaco: await version("monaco-editor") };
const current = await readFile(stamp, "utf8").then(JSON.parse, () => null);
if (current?.pyodide === wanted.pyodide && current?.monaco === wanted.monaco) process.exit(0);

await rm(path.join(out, "pyodide"), { recursive: true, force: true });
await rm(path.join(out, "monaco"), { recursive: true, force: true });
await mkdir(path.join(out, "pyodide"), { recursive: true });
for (const file of PYODIDE_FILES) {
  await cp(path.join(packageDir("pyodide"), file), path.join(out, "pyodide", file));
}
await cp(path.join(packageDir("monaco-editor"), "min", "vs"), path.join(out, "monaco", "vs"), {
  recursive: true,
  filter: (source) => !source.endsWith(".map"),
});
await writeFile(stamp, `${JSON.stringify(wanted)}\n`);
console.info(
  `[vendor] copied pyodide ${wanted.pyodide} and monaco-editor ${wanted.monaco} to public/vendor`,
);
