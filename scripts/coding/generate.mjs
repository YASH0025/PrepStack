#!/usr/bin/env node
/**
 * Builds src/modules/coding/content/problems.json from the problems authored
 * in scripts/coding/problems/*.mjs.
 *
 *   npm run coding:generate            regenerate (expected outputs from the JS reference)
 *   npm run coding:generate -- --check also run every Python reference in Pyodide
 *   npm run coding:generate -- --check --only=arrays
 *                                      check one authoring file (nothing is written)
 *
 * Every problem has a JavaScript and a Python reference solution. Expected
 * outputs come from the JavaScript one; --check proves the independent Python
 * solution agrees on every test, which also exercises the Python harness for
 * that problem's input and output types. Reference solutions are never
 * shipped to the app.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { outputsMatch, runJsTests } from "../../src/modules/coding/runner/harness.ts";
import { ALL_PROBLEMS, FILES, SKILL_BY_TOPIC, TOPICS } from "./problems/index.mjs";
import { jsStarter, pyStarter } from "./starter.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(here, "../../src/modules/coding/content/problems.json");
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const COMPARE = ["exact", "unordered", "unordered-nested", "float"];

function fail(problem, message) {
  throw new Error(`[${problem?.slug ?? "?"}] ${message}`);
}

function validate(problem, seen) {
  const required = [
    "slug",
    "title",
    "difficulty",
    "topics",
    "statement",
    "entry",
    "tests",
    "js",
    "py",
  ];
  for (const key of required) if (problem[key] === undefined) fail(problem, `missing ${key}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(problem.slug)) fail(problem, "slug must be kebab-case");
  if (seen.has(problem.slug)) fail(problem, "duplicate slug");
  seen.add(problem.slug);
  if (!DIFFICULTIES.includes(problem.difficulty)) fail(problem, "bad difficulty");
  if (!problem.topics.length || problem.topics.some((t) => !TOPICS.includes(t))) {
    fail(problem, `topics must be from ${TOPICS.join(", ")}`);
  }
  if (!COMPARE.includes(problem.compare ?? "exact")) fail(problem, "bad compare mode");
  const samples = problem.samples ?? 2;
  if (problem.tests.length < 5) fail(problem, "write at least 5 tests");
  if (samples < 1 || samples > problem.tests.length) fail(problem, "bad samples count");
  if (
    problem.leetcode &&
    !/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/.test(problem.leetcode)
  ) {
    fail(problem, "leetcode must look like https://leetcode.com/problems/<slug>/");
  }
}

function build(problem) {
  const tests = problem.tests.map((args) => ({ args }));
  const results = runJsTests(problem.js, problem.entry, tests);
  const built = tests.map((test, index) => {
    const result = results[index];
    if (result.error) fail(problem, `JS reference failed on test ${index + 1}: ${result.error}`);
    return { args: test.args, expected: result.output };
  });
  const samples = problem.samples ?? 2;
  return {
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    topics: problem.topics,
    skill: SKILL_BY_TOPIC[problem.topics[0]],
    leetcodeUrl: problem.leetcode ?? null,
    statement: problem.statement.trim(),
    constraints: problem.constraints ?? [],
    hints: problem.hints ?? [],
    entry: problem.entry,
    compare: problem.compare ?? "exact",
    starter: { js: jsStarter(problem.entry), py: pyStarter(problem.entry) },
    examples: built.slice(0, samples).map((test, index) => ({
      ...test,
      explanation: problem.explanations?.[index] ?? null,
    })),
    hiddenTests: built.slice(samples),
  };
}

async function checkPython(problems, built) {
  const { loadPyodide } = await import("pyodide");
  const { PYTHON_HARNESS } = await import("../../src/modules/coding/runner/python-harness.ts");
  const pyodide = await loadPyodide();
  pyodide.runPython(PYTHON_HARNESS);
  const load = pyodide.globals.get("_ps_load");
  const run = pyodide.globals.get("_ps_run");
  let failures = 0;
  problems.forEach((problem, i) => {
    const loaded = JSON.parse(load(problem.py));
    if (loaded.error) {
      failures++;
      console.error(`✗ ${problem.slug}: Python reference does not load: ${loaded.error}`);
      return;
    }
    const all = [...built[i].examples, ...built[i].hiddenTests];
    all.forEach((test, index) => {
      const result = JSON.parse(run(JSON.stringify(problem.entry), JSON.stringify(test.args)));
      if (result.error) {
        failures++;
        console.error(`✗ ${problem.slug} test ${index + 1}: ${result.error}`);
      } else if (!outputsMatch(result.output, test.expected, built[i].compare)) {
        failures++;
        console.error(
          `✗ ${problem.slug} test ${index + 1}: Python ${JSON.stringify(result.output)} vs JS ${JSON.stringify(test.expected)}`,
        );
      }
    });
  });
  load.destroy();
  run.destroy();
  if (failures > 0) throw new Error(`${failures} Python check failure(s)`);
  console.info(`✓ Python references agree on all ${problems.length} problems`);
}

const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
if (only && !FILES[only])
  throw new Error(`Unknown file "${only}". Use one of: ${Object.keys(FILES).join(", ")}`);
const selected = only ? FILES[only] : ALL_PROBLEMS;
const seen = new Set();
for (const problem of selected) validate(problem, seen);
const built = selected.map(build);
if (process.argv.includes("--check")) await checkPython(selected, built);
if (only) {
  console.info(`Checked ${built.length} problem(s) in ${only}.mjs (nothing written)`);
  process.exit(0);
}

await mkdir(path.dirname(outFile), { recursive: true });
// One problem per line keeps diffs readable without bloating the file.
const body = built.map((problem) => JSON.stringify(problem)).join(",\n");
await writeFile(outFile, `{"version":1,"problems":[\n${body}\n]}\n`);
const counts = Object.fromEntries(
  DIFFICULTIES.map((d) => [d, built.filter((p) => p.difficulty === d).length]),
);
console.info(
  `Wrote ${built.length} problems (${JSON.stringify(counts)}) to ${path.relative(process.cwd(), outFile)}`,
);
