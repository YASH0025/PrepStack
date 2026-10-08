/*
 * Page-side controller for the runner workers (client components only).
 * Starts a worker per language, enforces time limits by terminating the
 * worker, and turns worker messages into a report with a verdict.
 */
import { type Language, type Verdict } from "../schemas";
import { type CompareMode, type EntrySpec } from "./harness";
import { type RunRequest, type WorkerMessage } from "./protocol";

export type TestStatus =
  "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "ERROR" | "TIMEOUT" | "SKIPPED";

export interface TestOutcome {
  status: TestStatus;
  output?: unknown;
  stdout: string;
  timeMs: number | null;
  error: string | null;
}

export interface RunReport {
  /** null while running. */
  verdict: Verdict | null;
  compileError: string | null;
  outcomes: TestOutcome[];
  passed: number;
  total: number;
  /** Slowest test, in ms (null when nothing ran). */
  maxTimeMs: number | null;
}

export type RunnerPhase = "starting" | "running";

/** Per-test limit (also applied to loading the code). Python runs ~10–50× slower. */
export const TIME_LIMIT_MS: Record<Language, number> = { js: 3000, py: 8000 };
const STARTUP_LIMIT_MS = 90_000;

/**
 * Workers are native ES modules built from js.worker.ts / py.worker.ts by
 * scripts/copy-vendor.mjs (Pyodide needs a module worker, which bundlers do
 * not reliably produce).
 */
function createWorker(language: Language): Worker {
  return new Worker(`/vendor/runner/${language}.worker.mjs`, { type: "module" });
}

export function verdictOf(report: Pick<RunReport, "compileError" | "outcomes">): Verdict {
  if (report.compileError) return "COMPILE_ERROR";
  const statuses = report.outcomes.map((outcome) => outcome.status);
  if (statuses.includes("TIMEOUT")) return "TIME_LIMIT";
  const firstBad = statuses.find((status) => status === "ERROR" || status === "FAILED");
  if (firstBad === "ERROR") return "RUNTIME_ERROR";
  if (firstBad === "FAILED") return "WRONG_ANSWER";
  return "ACCEPTED";
}

export class CodeRunner {
  private workers: Partial<Record<Language, Worker>> = {};
  private pythonReady = false;
  private pythonFailure: string | null = null;
  private runId = 0;

  /** Starts Python in the background so the first run is faster. */
  warmUp(language: Language): void {
    if (language === "py") this.worker("py");
  }

  private worker(language: Language): Worker {
    let worker = this.workers[language];
    if (!worker) {
      worker = createWorker(language);
      this.workers[language] = worker;
      if (language === "py") {
        this.pythonReady = false;
        this.pythonFailure = null;
        worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
          if (event.data.type === "ready") this.pythonReady = true;
          if (event.data.type === "fatal") this.pythonFailure = event.data.message;
        });
      }
    }
    return worker;
  }

  private kill(language: Language): void {
    this.workers[language]?.terminate();
    delete this.workers[language];
    if (language === "py") this.pythonReady = false;
  }

  dispose(): void {
    this.kill("js");
    this.kill("py");
  }

  run(
    options: {
      language: Language;
      code: string;
      spec: EntrySpec;
      compare: CompareMode;
      tests: { args: unknown[]; expected: unknown }[];
      stopOnFailure: boolean;
    },
    onUpdate: (report: RunReport, phase: RunnerPhase) => void,
  ): Promise<RunReport> {
    const { language, tests } = options;
    // JavaScript gets a fresh worker per run, so globals never leak between runs.
    if (language === "js") this.kill("js");
    const worker = this.worker(language);
    const runId = ++this.runId;
    const limit = TIME_LIMIT_MS[language];

    const report: RunReport = {
      verdict: null,
      compileError: null,
      outcomes: tests.map(() => ({ status: "PENDING", stdout: "", timeMs: null, error: null })),
      passed: 0,
      total: tests.length,
      maxTimeMs: null,
    };
    const snapshot = (): RunReport => ({
      ...report,
      outcomes: report.outcomes.map((o) => ({ ...o })),
    });

    return new Promise<RunReport>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let current = -1;

      if (language === "py" && this.pythonFailure) {
        // Python failed to start earlier: report it, and start fresh next time.
        report.compileError = this.pythonFailure;
        this.kill("py");
        report.verdict = "COMPILE_ERROR";
        for (const outcome of report.outcomes) outcome.status = "SKIPPED";
        resolve(snapshot());
        return;
      }

      const finish = () => {
        clearTimeout(timer);
        worker.removeEventListener("message", listener);
        for (const outcome of report.outcomes) {
          if (outcome.status === "PENDING" || outcome.status === "RUNNING")
            outcome.status = "SKIPPED";
        }
        report.verdict = verdictOf(report);
        resolve(snapshot());
      };

      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const outcome = report.outcomes[current];
          if (outcome) {
            outcome.status = "TIMEOUT";
            outcome.error = `Stopped after ${limit / 1000} seconds. Look for an infinite loop or a slow algorithm.`;
          } else {
            report.compileError = `Loading your code took longer than ${limit / 1000} seconds.`;
          }
          this.kill(language);
          finish();
        }, limit);
      };

      const listener = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        if (message.type === "fatal") {
          report.compileError = message.message;
          this.kill(language);
          finish();
          return;
        }
        if (!("runId" in message) || message.runId !== runId) return;
        switch (message.type) {
          case "compiling":
            arm();
            onUpdate(snapshot(), "running");
            break;
          case "compile-error":
            report.compileError = message.message;
            break;
          case "test-start": {
            current = message.index;
            const outcome = report.outcomes[current];
            if (outcome) outcome.status = "RUNNING";
            arm();
            onUpdate(snapshot(), "running");
            break;
          }
          case "test-result": {
            const outcome = report.outcomes[message.index];
            if (!outcome) break;
            outcome.status = message.error ? "ERROR" : message.passed ? "PASSED" : "FAILED";
            outcome.output = message.output;
            outcome.stdout = message.stdout;
            outcome.timeMs = message.timeMs;
            outcome.error = message.error;
            if (message.passed) report.passed += 1;
            report.maxTimeMs = Math.max(report.maxTimeMs ?? 0, message.timeMs);
            onUpdate(snapshot(), "running");
            break;
          }
          case "done":
            finish();
            break;
        }
      };

      worker.addEventListener("message", listener);
      const starting = language === "py" && !this.pythonReady;
      onUpdate(snapshot(), starting ? "starting" : "running");
      if (starting) {
        // Downloading and starting Python can take a while on a slow connection.
        timer = setTimeout(() => {
          report.compileError =
            "Python took too long to load. Check your connection and try again.";
          this.kill(language);
          finish();
        }, STARTUP_LIMIT_MS);
      }
      const request: RunRequest = {
        type: "run",
        runId,
        code: options.code,
        spec: options.spec,
        compare: options.compare,
        tests,
        stopOnFailure: options.stopOnFailure,
      };
      worker.postMessage(request);
    });
  }
}
