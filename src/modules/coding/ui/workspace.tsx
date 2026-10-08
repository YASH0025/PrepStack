"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheckBig,
  ExternalLink,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";

import { RichText } from "@/components/rich-text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { recordSubmissionAction } from "../actions";
import { type ProblemStatus } from "../domain/stats";
import { type RunReport, type RunnerPhase, CodeRunner, type TestOutcome } from "../runner/client";
import { formatArgs, formatValue } from "../runner/harness";
import {
  CODING_TOPIC_LABELS,
  LANGUAGES,
  LANGUAGE_LABELS,
  type Language,
  type Problem,
  type ProblemTest,
  VERDICT_LABELS,
} from "../schemas";
import { DifficultyBadge, StatusIcon } from "./bits";

const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted-foreground">Loading editor…</p>,
});

const DRAFT_PREFIX = "prepstack-code";

function readDraft(slug: string, language: Language): string | null {
  try {
    return localStorage.getItem(`${DRAFT_PREFIX}:${slug}:${language}`);
  } catch {
    return null;
  }
}

function writeDraft(slug: string, language: Language, code: string): void {
  try {
    localStorage.setItem(`${DRAFT_PREFIX}:${slug}:${language}`, code);
  } catch {
    // Private mode or storage full: drafts are a convenience only.
  }
}

function clearDraft(slug: string, language: Language): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}:${slug}:${language}`);
  } catch {
    // Ignore.
  }
}

type Mode = "run" | "submit";

interface RunState {
  mode: Mode;
  phase: RunnerPhase;
  report: RunReport;
  tests: ProblemTest[];
  done: boolean;
}

export function CodingWorkspace({
  problem,
  initialStatus,
  savedCode,
  lastLanguage,
}: {
  problem: Problem;
  initialStatus: ProblemStatus;
  savedCode: Partial<Record<Language, string>>;
  lastLanguage: Language | null;
}) {
  const [language, setLanguage] = React.useState<Language>(lastLanguage ?? "js");
  const [code, setCode] = React.useState<Record<Language, string>>(() => ({
    js: savedCode.js ?? problem.starter.js,
    py: savedCode.py ?? problem.starter.py,
  }));
  const [status, setStatus] = React.useState<ProblemStatus>(initialStatus);
  const [run, setRun] = React.useState<RunState | null>(null);
  const [tab, setTab] = React.useState("cases");
  const [saveMessage, setSaveMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const runnerRef = React.useRef<CodeRunner | null>(null);

  // Restore unsent drafts from this browser after hydration.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount.
    setCode((current) => ({
      js: readDraft(problem.slug, "js") ?? current.js,
      py: readDraft(problem.slug, "py") ?? current.py,
    }));
  }, [problem.slug]);

  React.useEffect(() => {
    const runner = new CodeRunner();
    runnerRef.current = runner;
    return () => runner.dispose();
  }, []);

  React.useEffect(() => {
    runnerRef.current?.warmUp(language);
  }, [language]);

  const busy = run !== null && !run.done;

  function updateCode(value: string) {
    setCode((current) => ({ ...current, [language]: value }));
    writeDraft(problem.slug, language, value);
  }

  function reset() {
    if (!window.confirm("Replace your code with the starter code?")) return;
    setCode((current) => ({ ...current, [language]: problem.starter[language] }));
    clearDraft(problem.slug, language);
  }

  async function execute(mode: Mode) {
    const runner = runnerRef.current;
    if (!runner || busy) return;
    const tests: ProblemTest[] =
      mode === "run" ? problem.examples : [...problem.examples, ...problem.hiddenTests];
    const source = code[language];
    setTab("result");
    setSaveMessage(null);
    const report = await runner.run(
      {
        language,
        code: source,
        spec: problem.entry,
        compare: problem.compare,
        tests,
        stopOnFailure: mode === "submit",
      },
      (partial, phase) => setRun({ mode, phase, report: partial, tests, done: false }),
    );
    setRun({ mode, phase: "running", report, tests, done: true });

    if (mode === "submit" && report.verdict) {
      const result = await recordSubmissionAction({
        slug: problem.slug,
        language,
        code: source,
        verdict: report.verdict,
        passed: report.passed,
        total: report.total,
        maxTimeMs: report.maxTimeMs,
      });
      if (result.ok) {
        setStatus(result.data.solved ? "SOLVED" : "ATTEMPTED");
        if (result.data.firstSolve)
          setSaveMessage({ ok: true, text: "Solved! Added to your progress." });
      } else {
        setSaveMessage({ ok: false, text: `Your result was not saved: ${result.error}` });
      }
    }
  }

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ProblemPanel problem={problem} status={status} />

      <div className="grid min-h-0 gap-3 lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,16rem)]">
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="coding-language" className="text-xs">
              Language
            </Label>
            <NativeSelect
              id="coding-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              disabled={busy}
              className="w-36"
            >
              {LANGUAGES.map((item) => (
                <option key={item} value={item}>
                  {LANGUAGE_LABELS[item]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
            <RotateCcw /> Reset
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => void execute("run")} disabled={busy}>
              {busy && run?.mode === "run" ? <Loader2 className="animate-spin" /> : <Play />} Run
            </Button>
            <Button onClick={() => void execute("submit")} disabled={busy}>
              {busy && run?.mode === "submit" ? <Loader2 className="animate-spin" /> : <Send />}{" "}
              Submit
            </Button>
          </div>
        </div>

        <div className="h-[55vh] min-h-0 overflow-hidden rounded-lg border lg:h-auto">
          <CodeEditor
            key={language}
            value={code[language]}
            language={language}
            onChange={updateCode}
            onRun={() => void execute("run")}
            label={`${LANGUAGE_LABELS[language]} solution for ${problem.title}`}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="min-h-0 rounded-lg border">
          <TabsList className="m-2">
            <TabsTrigger value="cases">Examples</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>
          <TabsContent value="cases" className="min-h-0 overflow-auto px-3 pb-3">
            <ul className="grid gap-2">
              {problem.examples.map((example, index) => (
                <li key={index} className="rounded-md bg-muted/60 p-2 font-mono text-xs">
                  <p className="mb-1 font-sans text-xs text-muted-foreground">
                    Example {index + 1}
                  </p>
                  <pre className="whitespace-pre-wrap">
                    {formatArgs(problem.entry, example.args)}
                  </pre>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Run checks these examples. Submit also runs {problem.hiddenTests.length} hidden tests.
              Shortcut: Ctrl/⌘ + Enter runs.
            </p>
          </TabsContent>
          <TabsContent
            value="result"
            className="min-h-0 overflow-auto px-3 pb-3"
            aria-live="polite"
          >
            {saveMessage && (
              <p
                className={cn(
                  "mb-2 text-sm",
                  saveMessage.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
                )}
              >
                {saveMessage.text}
              </p>
            )}
            <ResultView problem={problem} run={run} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProblemPanel({ problem, status }: { problem: Problem; status: ProblemStatus }) {
  return (
    <article className="grid min-h-0 content-start gap-4 overflow-auto rounded-lg border p-4">
      <header className="grid gap-2">
        <div className="flex items-start gap-2">
          <StatusIcon status={status} className="mt-1.5" />
          <h1 className="text-xl font-semibold tracking-tight">{problem.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.topics.map((topic) => (
            <Link key={topic} href={`/practice/coding?topic=${topic}`}>
              <Badge variant="muted">{CODING_TOPIC_LABELS[topic]}</Badge>
            </Link>
          ))}
          {problem.leetcodeUrl && (
            <a
              href={problem.leetcodeUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Also on LeetCode <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      </header>

      <div className="text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]">
        <RichText source={problem.statement} />
      </div>

      {problem.examples.map((example, index) => (
        <section key={index} className="grid gap-1">
          <h2 className="text-sm font-semibold">Example {index + 1}</h2>
          <div className="grid gap-1 rounded-md bg-muted/60 p-3 font-mono text-xs">
            <p className="whitespace-pre-wrap">
              <span className="font-sans font-medium">Input: </span>
              {formatArgs(problem.entry, example.args)}
            </p>
            <p className="break-all">
              <span className="font-sans font-medium">Output: </span>
              {formatValue(example.expected)}
            </p>
            {example.explanation && (
              <p className="font-sans text-muted-foreground">{example.explanation}</p>
            )}
          </div>
        </section>
      ))}

      {problem.constraints.length > 0 && (
        <section className="grid gap-1">
          <h2 className="text-sm font-semibold">Constraints</h2>
          <ul className="grid list-disc gap-0.5 pl-5 text-sm text-muted-foreground">
            {problem.constraints.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
        </section>
      )}

      {problem.hints.length > 0 && (
        <section className="grid gap-1">
          <h2 className="text-sm font-semibold">Hints</h2>
          {problem.hints.map((hint, index) => (
            <details key={index} className="rounded-md border px-3 py-2 text-sm">
              <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                <Lightbulb className="size-3.5" aria-hidden /> Hint {index + 1}
              </summary>
              <p className="mt-1">{hint}</p>
            </details>
          ))}
        </section>
      )}
    </article>
  );
}

function ResultView({ problem, run }: { problem: Problem; run: RunState | null }) {
  if (!run) {
    return <p className="text-sm text-muted-foreground">Run your code to see results here.</p>;
  }
  const { report, tests, mode, phase, done } = run;

  if (!done) {
    const current = report.outcomes.findIndex((outcome) => outcome.status === "RUNNING");
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {phase === "starting"
          ? "Starting Python… the first run downloads it and takes a few seconds."
          : current >= 0
            ? `Running test ${current + 1} of ${tests.length}…`
            : "Loading your code…"}
      </p>
    );
  }

  const accepted = report.verdict === "ACCEPTED";
  const header = (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p
        className={cn(
          "flex items-center gap-1.5 text-base font-semibold",
          accepted ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
        )}
      >
        {accepted ? (
          <CircleCheckBig className="size-4" aria-hidden />
        ) : (
          <CircleAlert className="size-4" aria-hidden />
        )}
        {report.verdict ? VERDICT_LABELS[report.verdict] : ""}
      </p>
      {!report.compileError && (
        <p className="text-sm text-muted-foreground">
          {report.passed} / {report.total} tests passed
          {report.maxTimeMs !== null && ` · slowest ${formatMs(report.maxTimeMs)}`}
        </p>
      )}
    </div>
  );

  if (report.compileError) {
    return (
      <>
        {header}
        <Alert variant="destructive">
          <AlertTitle>Your code could not be loaded</AlertTitle>
          <AlertDescription>
            <pre className="font-mono text-xs whitespace-pre-wrap">{report.compileError}</pre>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  // Submissions show the first failing test; runs show every example.
  const visible = report.outcomes
    .map((outcome, index) => ({ outcome, index }))
    .filter(({ outcome }) =>
      mode === "run"
        ? outcome.status !== "SKIPPED"
        : !["PASSED", "SKIPPED"].includes(outcome.status),
    );

  return (
    <>
      {header}
      {mode === "submit" && accepted && (
        <p className="text-sm text-muted-foreground">
          All {report.total} tests passed, including {problem.hiddenTests.length} hidden ones.
        </p>
      )}
      <ul className="grid gap-2">
        {visible.map(({ outcome, index }) => (
          <TestRow
            key={index}
            title={
              index < problem.examples.length
                ? `Example ${index + 1}`
                : `Hidden test ${index + 1 - problem.examples.length}`
            }
            outcome={outcome}
            test={tests[index]}
            problem={problem}
          />
        ))}
      </ul>
    </>
  );
}

function formatMs(ms: number): string {
  return ms < 1 ? "<1 ms" : `${Math.round(ms)} ms`;
}

const OUTCOME_LABEL: Record<TestOutcome["status"], string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  PASSED: "Passed",
  FAILED: "Wrong answer",
  ERROR: "Runtime error",
  TIMEOUT: "Time limit exceeded",
  SKIPPED: "Not run",
};

function TestRow({
  title,
  outcome,
  test,
  problem,
}: {
  title: string;
  outcome: TestOutcome;
  test: ProblemTest | undefined;
  problem: Problem;
}) {
  const passed = outcome.status === "PASSED";
  return (
    <li className="grid gap-1 rounded-md border p-2 text-xs">
      <p className="flex items-center gap-2 font-medium">
        <span className={passed ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
          {OUTCOME_LABEL[outcome.status]}
        </span>
        <span className="text-muted-foreground">{title}</span>
        {outcome.timeMs !== null && (
          <span className="ml-auto text-muted-foreground">{formatMs(outcome.timeMs)}</span>
        )}
      </p>
      {test && (
        <dl className="grid gap-1 font-mono">
          <Row label="Input" value={formatArgs(problem.entry, test.args)} />
          {outcome.status !== "ERROR" && outcome.status !== "TIMEOUT" && (
            <Row label="Output" value={formatValue(outcome.output)} />
          )}
          <Row label="Expected" value={formatValue(test.expected)} />
          {outcome.error && <Row label="Error" value={outcome.error} danger />}
          {outcome.stdout && <Row label="Printed" value={outcome.stdout.trimEnd()} />}
        </dl>
      )}
    </li>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[5rem_1fr]">
      <dt className="font-sans text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "max-h-40 overflow-auto break-all whitespace-pre-wrap",
          danger && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
