/*
 * Pure test harness shared by the browser JS worker, the Python worker (for
 * comparison), the problem generator (scripts/coding/generate.mjs) and unit
 * tests. Keep this file dependency-free and limited to erasable TypeScript
 * syntax: Node runs it directly with type stripping.
 */

export type ValueType =
  | "int"
  | "float"
  | "bool"
  | "string"
  | "int[]"
  | "float[]"
  | "bool[]"
  | "string[]"
  | "int[][]"
  | "string[][]"
  | "ListNode"
  | "TreeNode"
  | "void";

/**
 * How an output is compared with the expected value:
 * - exact: deep equality
 * - unordered: the top-level list may be in any order
 * - unordered-nested: both the list and each inner list may be in any order
 * - float: numbers within 1e-5
 */
export type CompareMode = "exact" | "unordered" | "unordered-nested" | "float";

export interface Param {
  name: string;
  type: ValueType;
}

export interface FunctionSpec {
  kind: "function";
  name: { js: string; py: string };
  params: Param[];
  returns: ValueType;
}

/**
 * A design problem ("implement an LRU cache"). A test's args are
 * `[operations, arguments]` with `operations[0]` being the class name; the
 * expected value has one entry per operation (null for the constructor and
 * for methods that return nothing).
 */
export interface ClassSpec {
  kind: "class";
  className: string;
  constructorParams: Param[];
  methods: { name: string; params: Param[]; returns: ValueType }[];
}

export type EntrySpec = FunctionSpec | ClassSpec;

export interface TestInput {
  args: unknown[];
}

/** What a runner reports for one test, before comparison. */
export interface RawTestResult {
  output?: unknown;
  stdout: string;
  timeMs: number;
  /** Runtime error message (the test did not finish). */
  error?: string;
}

/* ------------------------------------------------------------------ data structures */

export class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

export class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

/** Longest list or tree a function may return before we assume a cycle. */
const MAX_NODES = 100_000;

export function toList(values: unknown): ListNode | null {
  if (!Array.isArray(values)) return null;
  const head = new ListNode();
  let tail = head;
  for (const value of values) {
    tail.next = new ListNode(value as number);
    tail = tail.next;
  }
  return head.next;
}

export function fromList(node: unknown): number[] {
  const out: number[] = [];
  let current = node as ListNode | null | undefined;
  while (current) {
    if (out.length >= MAX_NODES) throw new Error("The returned list has a cycle or is too long");
    out.push(current.val);
    current = current.next;
  }
  return out;
}

/** Builds a tree from level order with nulls for missing children: [1,null,2,3]. */
export function toTree(values: unknown): TreeNode | null {
  if (!Array.isArray(values) || values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0] as number);
  const queue: TreeNode[] = [root];
  let i = 1;
  while (queue.length > 0 && i < values.length) {
    const node = queue.shift() as TreeNode;
    const left = values[i++];
    if (left !== null && left !== undefined) {
      node.left = new TreeNode(left as number);
      queue.push(node.left);
    }
    if (i >= values.length) break;
    const right = values[i++];
    if (right !== null && right !== undefined) {
      node.right = new TreeNode(right as number);
      queue.push(node.right);
    }
  }
  return root;
}

/** Level order with nulls, trailing nulls removed (the input format). */
export function fromTree(root: unknown): (number | null)[] {
  const out: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [(root as TreeNode | null | undefined) ?? null];
  let seen = 0;
  while (queue.length > 0) {
    const node = queue.shift() ?? null;
    if (node === null) {
      out.push(null);
      continue;
    }
    if (++seen > MAX_NODES) throw new Error("The returned tree has a cycle or is too large");
    out.push(node.val);
    queue.push(node.left ?? null, node.right ?? null);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

/* ------------------------------------------------------------------ conversions */

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/** Converts a JSON test value into what the user's code receives. */
export function toRuntime(value: unknown, type: ValueType): unknown {
  if (type === "ListNode") return toList(value);
  if (type === "TreeNode") return toTree(value);
  return clone(value);
}

/** Converts what the user's code returned into a JSON value. */
export function fromRuntime(value: unknown, type: ValueType): unknown {
  if (type === "void") return null;
  if (type === "ListNode") return fromList(value);
  if (type === "TreeNode") return fromTree(value);
  if (value === undefined) return null;
  // Typed arrays, Sets and other non-JSON values become plain JSON (or fail).
  const json = JSON.stringify(value, (_key, inner: unknown) => {
    if (inner instanceof Set) throw new Error("Return a list, not a Set");
    if (inner instanceof Map) throw new Error("Return a list or object, not a Map");
    if (ArrayBuffer.isView(inner)) return Array.from(inner as unknown as ArrayLike<number>);
    if (typeof inner === "number" && !Number.isFinite(inner)) return String(inner);
    return inner;
  });
  return json === undefined ? null : (JSON.parse(json) as unknown);
}

/* ------------------------------------------------------------------ comparison */

function canonical(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

function sortList(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return [...value].sort((a, b) => {
    const left = canonical(a);
    const right = canonical(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function floatEqual(actual: unknown, expected: unknown): boolean {
  if (typeof expected === "number") {
    return typeof actual === "number" && Math.abs(actual - expected) <= 1e-5;
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => floatEqual(actual[index], item))
    );
  }
  return canonical(actual) === canonical(expected);
}

export function outputsMatch(actual: unknown, expected: unknown, mode: CompareMode): boolean {
  switch (mode) {
    case "float":
      return floatEqual(actual, expected);
    case "unordered":
      return canonical(sortList(actual)) === canonical(sortList(expected));
    case "unordered-nested": {
      const inner = (value: unknown) =>
        Array.isArray(value) ? value.map((item) => sortList(item)) : value;
      return canonical(sortList(inner(actual))) === canonical(sortList(inner(expected)));
    }
    default:
      return canonical(actual) === canonical(expected);
  }
}

/* ------------------------------------------------------------------ display */

/** One-line display of a JSON value, e.g. `[2,7,11,15]` or `"abc"`. */
export function formatValue(value: unknown): string {
  return canonical(value);
}

/** `nums = [2,7,11,15], target = 9` */
export function formatArgs(spec: EntrySpec, args: unknown[]): string {
  if (spec.kind === "class") {
    return `operations = ${formatValue(args[0])}\narguments = ${formatValue(args[1])}`;
  }
  return spec.params.map((param, i) => `${param.name} = ${formatValue(args[i])}`).join(", ");
}

/* ------------------------------------------------------------------ JavaScript */

export interface JsProgram {
  run(args: unknown[]): unknown;
}

/**
 * Compiles user JavaScript and returns a callable for one test. Throws a
 * SyntaxError (or a friendly Error) when the code cannot be loaded.
 */
export function compileJs(code: string, spec: EntrySpec): JsProgram {
  const name = spec.kind === "function" ? spec.name.js : spec.className;
  // Running the user's own code is the feature; in the browser it runs inside a Web Worker.
  const factory = new Function(
    "ListNode",
    "TreeNode",
    `"use strict";\n${code}\n;return typeof ${name} === "undefined" ? undefined : ${name};`,
  ) as (list: typeof ListNode, tree: typeof TreeNode) => unknown;
  const entry = factory(ListNode, TreeNode);
  if (typeof entry !== "function") {
    throw new Error(
      spec.kind === "function" ? `Define a function named ${name}` : `Define a class named ${name}`,
    );
  }

  if (spec.kind === "function") {
    const fn = entry as (...args: unknown[]) => unknown;
    return {
      run(args) {
        const input = spec.params.map((param, i) => toRuntime(args[i], param.type));
        return fromRuntime(fn(...input), spec.returns);
      },
    };
  }

  const Cls = entry as new (...args: unknown[]) => Record<string, unknown>;
  return {
    run(args) {
      const [operations, values] = args as [string[], unknown[][]];
      const output: unknown[] = [];
      let instance: Record<string, unknown> | null = null;
      operations.forEach((operation, index) => {
        const raw = values[index] ?? [];
        if (index === 0) {
          const input = spec.constructorParams.map((param, i) => toRuntime(raw[i], param.type));
          instance = new Cls(...input);
          output.push(null);
          return;
        }
        const method = spec.methods.find((candidate) => candidate.name === operation);
        const target = instance?.[operation];
        if (!method || typeof target !== "function") {
          throw new Error(`Method ${operation} is not defined`);
        }
        const input = method.params.map((param, i) => toRuntime(raw[i], param.type));
        const result = (target as (...a: unknown[]) => unknown).apply(instance, input);
        output.push(fromRuntime(result, method.returns));
      });
      return output;
    },
  };
}

/** Error text without the harness's own frames. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/**
 * Runs every test synchronously (used by the generator and unit tests; the
 * browser worker runs one test at a time so it can report progress and be
 * stopped on a timeout).
 */
export function runJsTests(code: string, spec: EntrySpec, tests: TestInput[]): RawTestResult[] {
  const program = compileJs(code, spec);
  return tests.map((test) => {
    const started = performance.now();
    try {
      const output = program.run(test.args);
      return { output, stdout: "", timeMs: performance.now() - started };
    } catch (error) {
      return { stdout: "", timeMs: performance.now() - started, error: errorMessage(error) };
    }
  });
}
