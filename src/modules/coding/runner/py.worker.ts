/// <reference lib="webworker" />
/*
 * Runs the user's Python with Pyodide (CPython compiled to WebAssembly) in a
 * Web Worker. Pyodide is served by this app from /vendor/pyodide (copied
 * from node_modules by scripts/copy-vendor.mjs), so no third-party CDN sees
 * the user. Loading takes a few seconds once; the page keeps this worker
 * alive between runs and terminates it only when a test runs too long.
 */
import { outputsMatch } from "./harness";
import { type RunRequest, type WorkerMessage } from "./protocol";
import { PYTHON_HARNESS } from "./python-harness";

const scope = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerMessage) {
  scope.postMessage(message);
}

interface PyFunction {
  (...args: string[]): string;
}
interface Pyodide {
  runPython(code: string): unknown;
  globals: { get(name: string): PyFunction };
}

async function start(): Promise<{ load: PyFunction; run: PyFunction }> {
  const base = new URL("/vendor/pyodide/", scope.location.origin).href;
  const pyodideModule = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ `${base}pyodide.mjs`
  )) as {
    loadPyodide(options: { indexURL: string }): Promise<Pyodide>;
  };
  const pyodide = await pyodideModule.loadPyodide({ indexURL: base });
  pyodide.runPython(PYTHON_HARNESS);
  return { load: pyodide.globals.get("_ps_load"), run: pyodide.globals.get("_ps_run") };
}

const runtime = start();
runtime.then(
  () => post({ type: "ready" }),
  (error: unknown) =>
    post({
      type: "fatal",
      message: `Python could not start: ${error instanceof Error ? error.message : String(error)}`,
    }),
);

// Runs are queued so a second click waits for the first.
let queue: Promise<void> = Promise.resolve();

scope.onmessage = (event: MessageEvent<RunRequest>) => {
  const request = event.data;
  if (request.type !== "run") return;
  queue = queue.then(() => handle(request)).catch(() => undefined);
};

async function handle(request: RunRequest): Promise<void> {
  const { runId } = request;
  const { load, run } = await runtime;
  post({ type: "compiling", runId });
  const loaded = JSON.parse(load(request.code)) as { error: string | null };
  if (loaded.error) {
    post({ type: "compile-error", runId, message: loaded.error });
    post({ type: "done", runId });
    return;
  }
  const spec = JSON.stringify(request.spec);
  for (const [index, test] of request.tests.entries()) {
    post({ type: "test-start", runId, index });
    const result = JSON.parse(run(spec, JSON.stringify(test.args))) as {
      output: unknown;
      stdout: string;
      timeMs: number;
      error: string | null;
    };
    const passed =
      result.error === null && outputsMatch(result.output, test.expected, request.compare);
    post({ type: "test-result", runId, index, passed, ...result });
    if (!passed && request.stopOnFailure) break;
  }
  post({ type: "done", runId });
}
