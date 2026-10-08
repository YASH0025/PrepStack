import { type CompareMode, type EntrySpec } from "./harness";

/** Page → worker. */
export interface RunRequest {
  type: "run";
  runId: number;
  code: string;
  spec: EntrySpec;
  compare: CompareMode;
  tests: { args: unknown[]; expected: unknown }[];
  /** Stop after the first test that does not pass (submissions). */
  stopOnFailure: boolean;
}

/** Worker → page. */
export type WorkerMessage =
  /** Python only: the runtime has loaded. */
  | { type: "ready" }
  /** The user's code is being loaded (its top level runs now). */
  | { type: "compiling"; runId: number }
  | { type: "compile-error"; runId: number; message: string }
  | { type: "test-start"; runId: number; index: number }
  | {
      type: "test-result";
      runId: number;
      index: number;
      passed: boolean;
      output: unknown;
      stdout: string;
      timeMs: number;
      error: string | null;
    }
  | { type: "done"; runId: number }
  /** The runtime itself failed (e.g. Python could not be loaded). */
  | { type: "fatal"; message: string };

/** Longest output kept from console.log / print per test. */
export const MAX_STDOUT = 4000;
