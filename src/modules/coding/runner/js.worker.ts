/// <reference lib="webworker" />
/*
 * Runs the user's JavaScript in a Web Worker, away from the page: it cannot
 * touch the DOM, cookies or the user's session. The page terminates this
 * worker when a test runs too long.
 */
import { compileJs, errorMessage, type JsProgram, outputsMatch } from "./harness";
import { MAX_STDOUT, type RunRequest, type WorkerMessage } from "./protocol";

const scope = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerMessage) {
  scope.postMessage(message);
}

let stdout = "";

function show(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function capture(...values: unknown[]) {
  if (stdout.length < MAX_STDOUT) {
    stdout = `${stdout}${values.map(show).join(" ")}\n`.slice(0, MAX_STDOUT);
  }
}

for (const method of ["log", "info", "warn", "error", "debug"] as const) {
  console[method] = capture;
}

scope.onmessage = (event: MessageEvent<RunRequest>) => {
  const request = event.data;
  if (request.type !== "run") return;
  const { runId } = request;

  post({ type: "compiling", runId });
  let program: JsProgram;
  stdout = "";
  try {
    program = compileJs(request.code, request.spec);
  } catch (error) {
    post({ type: "compile-error", runId, message: errorMessage(error) });
    post({ type: "done", runId });
    return;
  }

  for (const [index, test] of request.tests.entries()) {
    post({ type: "test-start", runId, index });
    stdout = "";
    const started = performance.now();
    let output: unknown = null;
    let error: string | null = null;
    try {
      output = program.run(test.args);
    } catch (thrown) {
      error = errorMessage(thrown);
    }
    const timeMs = performance.now() - started;
    const passed = error === null && outputsMatch(output, test.expected, request.compare);
    post({ type: "test-result", runId, index, passed, output, stdout, timeMs, error });
    if (!passed && request.stopOnFailure) break;
  }
  post({ type: "done", runId });
};
