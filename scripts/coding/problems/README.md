# Coding problems: authoring format

Each file exports `default [...]` problems. `npm run coding:generate -- --check` validates
them, computes expected outputs from the JavaScript reference, checks that the Python
reference agrees on every test (in real Pyodide), and writes
`src/modules/coding/content/problems.json`.

## Rules

- **Original wording only.** Never copy a statement, example or test from LeetCode or any
  other site. Classic problem ideas and common names ("Two Sum") are fine. Write your own
  statement, your own examples and your own tests.
- `leetcode` may link LeetCode's version: `https://leetcode.com/problems/<slug>/` (exact
  slug, trailing slash), or `null` when unsure the slug exists.
- At least 6 tests: the first `samples` (default 2) are shown as examples; the rest are hidden.
  Cover edge cases (empty, single element, duplicates, negatives, all equal, large values).
- Keep inputs small enough for a browser (lists up to ~1000 items; recursion depth ≤ 1000).
- The problem must have a single correct output per test, or use a `compare` mode that
  accepts all correct answers. Never "return any valid answer" unless a compare mode covers it.
- No in-place mutation problems: always _return_ the answer.

## Fields

| Field          | Notes                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| `slug`         | kebab-case, unique                                                                      |
| `title`        | short name                                                                              |
| `difficulty`   | `EASY` \| `MEDIUM` \| `HARD`                                                            |
| `topics`       | from `TOPICS` in index.mjs; the first one decides the roadmap skill                     |
| `leetcode`     | URL or `null`                                                                           |
| `statement`    | Markdown (backticks for code, `**bold**`, lists). Mention parameter names in backticks. |
| `constraints`  | short strings                                                                           |
| `hints`        | 1–3 progressive hints, no full solution                                                 |
| `entry`        | function or class spec (below)                                                          |
| `compare`      | `exact` (default) \| `unordered` \| `unordered-nested` \| `float`                       |
| `samples`      | how many leading tests are shown as examples                                            |
| `explanations` | optional `{ 0: "why example 1 gives this output" }`                                     |
| `tests`        | function: array of argument arrays; class: `[operations, arguments]` pairs              |
| `js`           | JavaScript reference solution (defines the function/class by `name.js` / `className`)   |
| `py`           | Python reference solution (defines `name.py` / `className`), written independently      |

Value types: `int`, `float`, `bool`, `string`, `int[]`, `float[]`, `bool[]`, `string[]`,
`int[][]`, `string[][]` (grids of single characters use `string[][]`), `ListNode` (tests
use a JSON array, e.g. `[1,2,3]`), `TreeNode` (level order with nulls, e.g.
`[3,9,20,null,null,15,7]`), and `void` (returns only).

Function entry:

```js
entry: {
  kind: "function",
  name: { js: "twoSum", py: "two_sum" },  // camelCase in JS, snake_case in Python
  params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }],
  returns: "int[]",
}
```

Class entry (design problems; method names are the same in both languages):

```js
entry: {
  kind: "class",
  className: "MinStack",
  constructorParams: [],
  methods: [{ name: "push", params: [{ name: "val", type: "int" }], returns: "void" }, ...],
}
```

Compare modes: `unordered` (top-level list in any order, e.g. two indexes), `unordered-nested`
(list of lists, both levels in any order, e.g. subsets, permutations, group anagrams),
`float` (numbers within 1e-5).

See `arrays.mjs` for a function problem (`two-sum`) and a class problem (`lru-cache`).
