/** Stacks, intervals, greedy and heaps. */
const problems = [
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "EASY",
    topics: ["STACK"],
    leetcode: "https://leetcode.com/problems/valid-parentheses/",
    statement: `
You are given a string \`s\` made only of the bracket characters \`(\`, \`)\`, \`[\`, \`]\`, \`{\` and \`}\`.

Return \`true\` if the brackets are **balanced**, meaning:

- every opening bracket is closed by a bracket of the same kind,
- brackets are closed in the reverse order they were opened (no crossing like \`([)]\`),
- no closing bracket appears without a matching opener before it.

An empty string counts as balanced.
`,
    constraints: ["0 ≤ s.length ≤ 10⁴", "s contains only ()[]{}"],
    hints: [
      'The most recently opened bracket must be the first one to close. Which data structure gives you "most recent first"?',
      "Push openers onto a stack; on a closer, the top of the stack must be its partner. At the end the stack must be empty.",
    ],
    entry: {
      kind: "function",
      name: { js: "isValid", py: "is_valid" },
      params: [{ name: "s", type: "string" }],
      returns: "bool",
    },
    samples: 3,
    explanations: {
      0: "Each opener is closed by its partner in reverse order: [ ] closes inside { }, which closes inside ( ).",
    },
    tests: [
      ["({[]})[]"],
      ["{]"],
      ["(()"],
      [""],
      ["[(])"],
      [")("],
      ["{}{}{}[[[]]]((()))"],
      ["((((((((((()))))))))))"],
      ["["],
      ["([{}])}"],
    ],
    js: `
function isValid(s) {
  const partner = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if (ch in partner) {
      if (stack.pop() !== partner[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}`,
    py: `
def is_valid(s):
    closers = {")": "(", "]": "[", "}": "{"}
    opened = []
    for ch in s:
        if ch in "([{":
            opened.append(ch)
        elif not opened or opened[-1] != closers[ch]:
            return False
        else:
            opened.pop()
    return len(opened) == 0
`,
  },
  {
    slug: "min-stack",
    title: "Min Stack",
    difficulty: "MEDIUM",
    topics: ["STACK"],
    leetcode: "https://leetcode.com/problems/min-stack/",
    statement: `
Design a stack that can also report its smallest element instantly.

Implement the class \`MinStack\`:

- \`constructor()\` creates an empty stack.
- \`push(val)\` places \`val\` on top of the stack.
- \`pop()\` removes the top element (it returns nothing).
- \`top()\` returns the top element without removing it.
- \`getMin()\` returns the smallest element currently in the stack.

Every operation should run in O(1) time. \`pop\`, \`top\` and \`getMin\` are only called when the stack is not empty.

**Test format:** \`operations\` lists the calls in order (the first is the constructor) and
\`arguments\` holds each call's arguments. The expected output has one entry per call:
\`null\` for the constructor, \`push\` and \`pop\`.
`,
    constraints: [
      "-2³¹ ≤ val ≤ 2³¹ - 1",
      "pop, top and getMin are only called on a non-empty stack.",
      "At most 3 × 10⁴ calls.",
    ],
    hints: [
      "Scanning for the minimum is O(n). What if every stack entry remembered the minimum at the moment it was pushed?",
      "Keep a second stack (or store pairs) holding the running minimum; popping restores the previous minimum automatically.",
    ],
    entry: {
      kind: "class",
      className: "MinStack",
      constructorParams: [],
      methods: [
        { name: "push", params: [{ name: "val", type: "int" }], returns: "void" },
        { name: "pop", params: [], returns: "void" },
        { name: "top", params: [], returns: "int" },
        { name: "getMin", params: [], returns: "int" },
      ],
    },
    samples: 2,
    explanations: {
      0: "After pushing 4, 7 and 2 the minimum is 2. Popping 2 leaves 7 on top and the minimum goes back to 4.",
    },
    tests: [
      [
        ["MinStack", "push", "push", "push", "getMin", "pop", "top", "getMin"],
        [[], [4], [7], [2], [], [], [], []],
      ],
      [
        ["MinStack", "push", "top", "getMin"],
        [[], [-9], [], []],
      ],
      [
        ["MinStack", "push", "push", "push", "getMin", "pop", "getMin", "pop", "getMin"],
        [[], [3], [3], [3], [], [], [], [], []],
      ],
      [
        [
          "MinStack",
          "push",
          "push",
          "push",
          "push",
          "getMin",
          "pop",
          "getMin",
          "pop",
          "getMin",
          "top",
        ],
        [[], [5], [1], [8], [1], [], [], [], [], [], []],
      ],
      [
        ["MinStack", "push", "push", "push", "getMin", "pop", "getMin", "pop", "getMin"],
        [[], [10], [6], [2], [], [], [], [], []],
      ],
      [
        ["MinStack", "push", "push", "getMin", "top", "pop", "getMin", "top"],
        [[], [-2147483648], [2147483647], [], [], [], [], []],
      ],
      [
        ["MinStack", "push", "pop", "push", "push", "getMin", "top"],
        [[], [0], [], [12], [-4], [], []],
      ],
      [
        ["MinStack", "push", "push", "push", "push", "getMin", "pop", "pop", "getMin", "top"],
        [[], [2], [9], [-3], [4], [], [], [], [], []],
      ],
    ],
    js: `
class MinStack {
  constructor() {
    this.values = [];
    this.mins = [];
  }
  push(val) {
    this.values.push(val);
    const current = this.mins.length ? this.mins[this.mins.length - 1] : val;
    this.mins.push(Math.min(current, val));
  }
  pop() {
    this.values.pop();
    this.mins.pop();
  }
  top() {
    return this.values[this.values.length - 1];
  }
  getMin() {
    return this.mins[this.mins.length - 1];
  }
}`,
    py: `
class MinStack:
    def __init__(self):
        self.entries = []

    def push(self, val):
        smallest = val if not self.entries else min(val, self.entries[-1][1])
        self.entries.append((val, smallest))

    def pop(self):
        self.entries.pop()

    def top(self):
        return self.entries[-1][0]

    def getMin(self):
        return self.entries[-1][1]
`,
  },
  {
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    difficulty: "MEDIUM",
    topics: ["STACK"],
    leetcode: "https://leetcode.com/problems/daily-temperatures/",
    statement: `
\`temperatures[i]\` is the temperature recorded on day \`i\`.

Return a list \`answer\` of the same length where \`answer[i]\` is how many days you have to wait after day \`i\`
until a **strictly warmer** day. If no warmer day ever comes, \`answer[i]\` is \`0\`.
`,
    constraints: ["1 ≤ temperatures.length ≤ 10⁵", "-50 ≤ temperatures[i] ≤ 60"],
    hints: [
      'Comparing each day with every later day is O(n²). Which days are still "waiting" for a warmer one?',
      "Keep a stack of indexes whose temperatures are decreasing. A new warmer day resolves every colder index on top of the stack.",
    ],
    entry: {
      kind: "function",
      name: { js: "dailyTemperatures", py: "daily_temperatures" },
      params: [{ name: "temperatures", type: "int[]" }],
      returns: "int[]",
    },
    samples: 2,
    explanations: {
      0: "Day 0 (12°) warms up on day 1 (15°): wait 1. Day 1 (15°) waits until day 4 (18°): 3 days. Days 4 and 5 never see a warmer day: 0.",
    },
    tests: [
      [[12, 15, 9, 14, 18, 11]],
      [[30, 25, 20, 10]],
      [[5]],
      [[7, 7, 7, 7]],
      [[1, 2, 3, 4, 5]],
      [[-5, -10, -3, -20, 0]],
      [[20, 18, 22, 18, 20, 25, 25, 19]],
      [[60, -50, 60, -50, 59]],
    ],
    js: `
function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0);
  const stack = [];
  temperatures.forEach((t, i) => {
    while (stack.length && temperatures[stack[stack.length - 1]] < t) {
      const j = stack.pop();
      answer[j] = i - j;
    }
    stack.push(i);
  });
  return answer;
}`,
    py: `
def daily_temperatures(temperatures):
    n = len(temperatures)
    result = [0] * n
    warmer = []
    for i in range(n - 1, -1, -1):
        while warmer and temperatures[warmer[-1]] <= temperatures[i]:
            warmer.pop()
        if warmer:
            result[i] = warmer[-1] - i
        warmer.append(i)
    return result
`,
  },
  {
    slug: "evaluate-reverse-polish-notation",
    title: "Evaluate Reverse Polish Notation",
    difficulty: "MEDIUM",
    topics: ["STACK"],
    leetcode: "https://leetcode.com/problems/evaluate-reverse-polish-notation/",
    statement: `
In **reverse Polish notation** an operator comes after its two operands, so \`3 4 +\` means \`3 + 4\`
and \`2 3 4 * +\` means \`2 + 3 * 4\`. No parentheses are needed.

You are given the expression as a list of strings \`tokens\`. Each token is either an integer or one of
\`+\`, \`-\`, \`*\`, \`/\`. Return the integer value of the expression.

- Division between two integers **truncates toward zero** (so \`7 / -2\` is \`-3\`).
- The expression is always valid and never divides by zero.
- Every intermediate result fits in a 32-bit signed integer.
`,
    constraints: [
      "1 ≤ tokens.length ≤ 10⁴",
      "Each token is an operator or an integer in [-200, 200].",
      "The expression is valid.",
    ],
    hints: [
      "Read tokens left to right. When you meet an operator, which two values does it apply to?",
      "Push numbers on a stack; an operator pops the right operand first, then the left, and pushes the result.",
    ],
    entry: {
      kind: "function",
      name: { js: "evalRPN", py: "eval_rpn" },
      params: [{ name: "tokens", type: "string[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "5 1 2 + 4 * + 3 - means 5 + ((1 + 2) * 4) - 3 = 14.",
    },
    tests: [
      [["5", "1", "2", "+", "4", "*", "+", "3", "-"]],
      [["7", "-2", "/"]],
      [["42"]],
      [["-7", "2", "/"]],
      [["3", "8", "-"]],
      [["1", "3", "/", "6", "+"]],
      [["15", "7", "1", "1", "+", "-", "/", "3", "*", "2", "1", "1", "+", "+", "-"]],
      [["200", "200", "*", "-3", "*", "7", "/"]],
      [["-4", "-6", "*", "0", "+"]],
    ],
    js: `
function evalRPN(tokens) {
  const stack = [];
  const ops = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => Math.trunc(a / b),
  };
  for (const token of tokens) {
    if (token in ops) {
      const b = stack.pop();
      const a = stack.pop();
      stack.push(ops[token](a, b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack[0];
}`,
    py: `
def eval_rpn(tokens):
    values = []
    for token in tokens:
        if token in ("+", "-", "*", "/"):
            right = values.pop()
            left = values.pop()
            if token == "+":
                values.append(left + right)
            elif token == "-":
                values.append(left - right)
            elif token == "*":
                values.append(left * right)
            else:
                quotient = abs(left) // abs(right)
                values.append(quotient if (left < 0) == (right < 0) else -quotient)
        else:
            values.append(int(token))
    return values[-1]
`,
  },
  {
    slug: "largest-rectangle-in-histogram",
    title: "Largest Rectangle in Histogram",
    difficulty: "HARD",
    topics: ["STACK"],
    leetcode: "https://leetcode.com/problems/largest-rectangle-in-histogram/",
    statement: `
A histogram has bars of width \`1\` standing side by side; \`heights[i]\` is the height of bar \`i\`.

Return the area of the largest axis-aligned rectangle that fits entirely inside the histogram.
The rectangle may span several adjacent bars, but its height cannot exceed the shortest bar it covers.
`,
    constraints: ["1 ≤ heights.length ≤ 10⁵", "0 ≤ heights[i] ≤ 10⁴"],
    hints: [
      "For each bar, imagine it is the shortest bar of the rectangle. How far can the rectangle stretch left and right?",
      "It stretches until the nearest shorter bar on each side. A stack of increasing heights finds those boundaries in one pass.",
      "When a shorter bar arrives, pop taller bars and compute their areas; a sentinel height of 0 at the end flushes the stack.",
    ],
    entry: {
      kind: "function",
      name: { js: "largestRectangleArea", py: "largest_rectangle_area" },
      params: [{ name: "heights", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Bars 1 to 3 have heights 4, 5 and 4, so a rectangle of height 4 and width 3 fits: area 12.",
    },
    tests: [
      [[1, 4, 5, 4, 1]],
      [[6, 1, 6]],
      [[7]],
      [[0, 0, 0]],
      [[3, 3, 3, 3]],
      [[1, 2, 3, 4, 5, 6]],
      [[6, 5, 4, 3, 2, 1]],
      [[2, 0, 9, 8, 0, 3, 3, 3]],
      [[10000, 10000, 1, 10000]],
      [[4, 2, 0, 3, 2, 5, 1, 6, 2]],
    ],
    js: `
function largestRectangleArea(heights) {
  const stack = [];
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i];
    while (stack.length && heights[stack[stack.length - 1]] >= h) {
      const height = heights[stack.pop()];
      const left = stack.length ? stack[stack.length - 1] : -1;
      best = Math.max(best, height * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}`,
    py: `
def largest_rectangle_area(heights):
    n = len(heights)
    left = [0] * n
    right = [n] * n
    rising = []
    for i in range(n):
        while rising and heights[rising[-1]] >= heights[i]:
            right[rising.pop()] = i
        left[i] = rising[-1] + 1 if rising else 0
        rising.append(i)
    return max(heights[i] * (right[i] - left[i]) for i in range(n))
`,
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "MEDIUM",
    topics: ["INTERVALS"],
    leetcode: "https://leetcode.com/problems/merge-intervals/",
    statement: `
You are given a list \`intervals\` where each \`intervals[i] = [start, end]\` is a closed range with \`start ≤ end\`.
The list is in no particular order.

Merge every group of overlapping intervals into a single interval and return the result **sorted by start**.
Two intervals that merely touch (one ends exactly where the other begins, like \`[1, 3]\` and \`[3, 5]\`) also count as overlapping.
`,
    constraints: ["1 ≤ intervals.length ≤ 10⁴", "0 ≤ start ≤ end ≤ 10⁴"],
    hints: [
      "Once intervals are sorted by start, any interval can only overlap the group directly before it.",
      "Sort, then walk through: either extend the last merged interval's end, or start a new one.",
    ],
    entry: {
      kind: "function",
      name: { js: "merge", py: "merge" },
      params: [{ name: "intervals", type: "int[][]" }],
      returns: "int[][]",
    },
    samples: 2,
    explanations: {
      0: "[2, 6] and [4, 7] overlap and become [2, 7]; [9, 10] and [10, 12] touch and become [9, 12].",
    },
    tests: [
      [
        [
          [9, 10],
          [2, 6],
          [4, 7],
          [10, 12],
        ],
      ],
      [
        [
          [1, 2],
          [5, 6],
        ],
      ],
      [[[3, 8]]],
      [
        [
          [1, 10],
          [2, 3],
          [4, 5],
          [6, 7],
        ],
      ],
      [
        [
          [5, 5],
          [5, 5],
          [5, 5],
        ],
      ],
      [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      [
        [
          [8, 9],
          [6, 7],
          [4, 5],
          [2, 3],
          [0, 1],
        ],
      ],
      [
        [
          [1, 4],
          [0, 4],
          [3, 9],
          [12, 15],
          [11, 11],
        ],
      ],
      [
        [
          [0, 10000],
          [9999, 10000],
        ],
      ],
    ],
    js: `
function merge(intervals) {
  const sorted = intervals.map((iv) => [...iv]).sort((a, b) => a[0] - b[0]);
  const result = [];
  for (const [start, end] of sorted) {
    const last = result[result.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      result.push([start, end]);
    }
  }
  return result;
}`,
    py: `
def merge(intervals):
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            if end > merged[-1][1]:
                merged[-1][1] = end
        else:
            merged.append([start, end])
    return merged
`,
  },
  {
    slug: "insert-interval",
    title: "Insert Interval",
    difficulty: "MEDIUM",
    topics: ["INTERVALS"],
    leetcode: "https://leetcode.com/problems/insert-interval/",
    statement: `
\`intervals\` is a list of closed ranges \`[start, end]\` that are **sorted by start** and do not overlap or touch each other.
You are also given one more range, \`newInterval\`.

Add \`newInterval\` to the list, merging it with any intervals it overlaps or touches (sharing an endpoint counts),
and return the new list, still sorted by start and with no overlaps.
`,
    constraints: [
      "0 ≤ intervals.length ≤ 10⁴",
      "0 ≤ start ≤ end ≤ 10⁵",
      "intervals is sorted by start and no two intervals overlap or touch.",
    ],
    hints: [
      "The intervals split into three groups: entirely before newInterval, overlapping it, and entirely after it.",
      "Copy the first group, fold the middle group into one interval by taking min start and max end, then copy the rest.",
    ],
    entry: {
      kind: "function",
      name: { js: "insert", py: "insert" },
      params: [
        { name: "intervals", type: "int[][]" },
        { name: "newInterval", type: "int[]" },
      ],
      returns: "int[][]",
    },
    samples: 3,
    explanations: {
      0: "[5, 9] overlaps [4, 6] and [8, 10], so all three combine into [4, 10].",
    },
    tests: [
      [
        [
          [1, 2],
          [4, 6],
          [8, 10],
          [13, 14],
        ],
        [5, 9],
      ],
      [
        [
          [3, 5],
          [9, 12],
        ],
        [6, 7],
      ],
      [[], [2, 4]],
      [[[5, 8]], [0, 1]],
      [[[5, 8]], [10, 11]],
      [
        [
          [1, 3],
          [6, 8],
        ],
        [3, 6],
      ],
      [
        [
          [2, 3],
          [5, 6],
          [8, 9],
        ],
        [0, 20],
      ],
      [[[1, 5]], [2, 3]],
      [
        [
          [0, 0],
          [4, 4],
          [9, 9],
        ],
        [4, 4],
      ],
    ],
    js: `
function insert(intervals, newInterval) {
  const result = [];
  let [start, end] = newInterval;
  let i = 0;
  while (i < intervals.length && intervals[i][1] < start) result.push([...intervals[i++]]);
  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0]);
    end = Math.max(end, intervals[i][1]);
    i++;
  }
  result.push([start, end]);
  while (i < intervals.length) result.push([...intervals[i++]]);
  return result;
}`,
    py: `
def insert(intervals, new_interval):
    lo, hi = new_interval
    before, after = [], []
    for start, end in intervals:
        if end < lo:
            before.append([start, end])
        elif start > hi:
            after.append([start, end])
        else:
            lo = min(lo, start)
            hi = max(hi, end)
    return before + [[lo, hi]] + after
`,
  },
  {
    slug: "non-overlapping-intervals",
    title: "Non-overlapping Intervals",
    difficulty: "MEDIUM",
    topics: ["INTERVALS", "GREEDY"],
    leetcode: "https://leetcode.com/problems/non-overlapping-intervals/",
    statement: `
You are given a list \`intervals\` of ranges \`[start, end]\` with \`start < end\`.

Return the **smallest number of intervals you must delete** so that none of the remaining intervals overlap.
Intervals that only touch at an endpoint, such as \`[2, 4]\` and \`[4, 7]\`, do **not** overlap.
`,
    constraints: ["1 ≤ intervals.length ≤ 10⁵", "-5 × 10⁴ ≤ start < end ≤ 5 × 10⁴"],
    hints: [
      "Flip the question: what is the largest number of intervals you can keep?",
      "Greedily keep the interval that ends earliest, because it leaves the most room for the rest. Sort by end.",
    ],
    entry: {
      kind: "function",
      name: { js: "eraseOverlapIntervals", py: "erase_overlap_intervals" },
      params: [{ name: "intervals", type: "int[][]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Deleting [1, 8] leaves [0, 3], [3, 5] and [6, 9], which only touch or are apart.",
    },
    tests: [
      [
        [
          [0, 3],
          [1, 8],
          [3, 5],
          [6, 9],
        ],
      ],
      [
        [
          [2, 4],
          [4, 7],
          [7, 9],
        ],
      ],
      [[[5, 6]]],
      [
        [
          [1, 2],
          [1, 2],
          [1, 2],
          [1, 2],
        ],
      ],
      [
        [
          [0, 100],
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      ],
      [
        [
          [-10, -5],
          [-7, 0],
          [-1, 3],
          [2, 6],
        ],
      ],
      [
        [
          [1, 4],
          [2, 5],
          [3, 6],
          [4, 7],
          [5, 8],
        ],
      ],
      [
        [
          [-50000, 50000],
          [-50000, 0],
          [0, 50000],
        ],
      ],
    ],
    js: `
function eraseOverlapIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  let removed = 0;
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) {
      lastEnd = end;
    } else {
      removed++;
    }
  }
  return removed;
}`,
    py: `
def erase_overlap_intervals(intervals):
    ordered = sorted(intervals, key=lambda iv: iv[0])
    removed = 0
    current_end = ordered[0][1]
    for start, end in ordered[1:]:
        if start < current_end:
            removed += 1
            current_end = min(current_end, end)
        else:
            current_end = end
    return removed
`,
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "MEDIUM",
    topics: ["GREEDY", "ARRAYS"],
    leetcode: "https://leetcode.com/problems/maximum-subarray/",
    statement: `
Given a list of integers \`nums\`, find the contiguous, non-empty slice with the largest sum and return that sum.
`,
    constraints: ["1 ≤ nums.length ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    hints: [
      "If the best slice ending at the previous index has a negative sum, is it worth extending?",
      "Track the best sum of a slice ending here (either extend or restart at the current element) and the best seen overall.",
    ],
    entry: {
      kind: "function",
      name: { js: "maxSubArray", py: "max_sub_array" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "The slice [5, -1, 4] sums to 8, and no other slice does better.",
    },
    tests: [
      [[-3, 5, -1, 4, -7, 2]],
      [[-8, -2, -5]],
      [[9]],
      [[-4]],
      [[1, 2, 3, 4]],
      [[0, 0, 0]],
      [[4, -5, 4, -5, 4]],
      [[10000, -1, 10000, -10000, -10000, 10000]],
      [[-1, 3, -2, 3, -2, 3, -10, 6]],
    ],
    js: `
function maxSubArray(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}`,
    py: `
def max_sub_array(nums):
    best = float("-inf")
    prefix = 0
    lowest_prefix = 0
    for value in nums:
        prefix += value
        best = max(best, prefix - lowest_prefix)
        lowest_prefix = min(lowest_prefix, prefix)
    return best
`,
  },
  {
    slug: "jump-game",
    title: "Jump Game",
    difficulty: "MEDIUM",
    topics: ["GREEDY"],
    leetcode: "https://leetcode.com/problems/jump-game/",
    statement: `
You start on the first square of a row of squares. \`nums[i]\` is the **longest** jump you may make from square \`i\`:
from there you can move forward by any number of squares from \`0\` up to \`nums[i]\`.

Return \`true\` if you can reach the last square, otherwise \`false\`.
`,
    constraints: ["1 ≤ nums.length ≤ 10⁴", "0 ≤ nums[i] ≤ 10⁵"],
    hints: [
      "You never need to know the exact path, only the farthest square reachable so far.",
      "Scan left to right keeping the farthest reach; if you ever stand on a square beyond it, you are stuck.",
    ],
    entry: {
      kind: "function",
      name: { js: "canJump", py: "can_jump" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "bool",
    },
    samples: 2,
    explanations: {
      0: "Jump 1 square to index 1, then 3 squares to index 4, the last square.",
    },
    tests: [
      [[1, 3, 0, 0, 2]],
      [[2, 1, 0, 4]],
      [[0]],
      [[0, 1]],
      [[5, 0, 0, 0, 0, 0]],
      [[1, 1, 1, 1, 1]],
      [[3, 2, 1, 0, 0, 7]],
      [[2, 0, 2, 0, 1, 0]],
      [[100000, 0, 0]],
    ],
    js: `
function canJump(nums) {
  let reach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;
    reach = Math.max(reach, i + nums[i]);
  }
  return true;
}`,
    py: `
def can_jump(nums):
    goal = len(nums) - 1
    for i in range(len(nums) - 2, -1, -1):
        if i + nums[i] >= goal:
            goal = i
    return goal == 0
`,
  },
  {
    slug: "gas-station",
    title: "Gas Station",
    difficulty: "MEDIUM",
    topics: ["GREEDY"],
    leetcode: "https://leetcode.com/problems/gas-station/",
    statement: `
Stations \`0\` to \`n - 1\` sit on a circular road. At station \`i\` you can fill up \`gas[i]\` units of fuel, and driving
from station \`i\` to the next station (\`i + 1\`, or \`0\` after the last one) burns \`cost[i]\` units.

Your car has an unlimited tank and starts empty. Return the index of the station where you can start and drive
one full lap clockwise without the fuel ever going below zero, or \`-1\` if no such station exists.
When a valid start exists, it is guaranteed to be **unique**.
`,
    constraints: [
      "1 ≤ n ≤ 10⁵",
      "gas.length == cost.length == n",
      "0 ≤ gas[i], cost[i] ≤ 10⁴",
      "If an answer exists it is unique.",
    ],
    hints: [
      "If total gas is less than total cost, no start works. Otherwise, some start does.",
      "Drive from a candidate start; if the tank goes negative at station j, no station between the start and j can work either, so try j + 1.",
    ],
    entry: {
      kind: "function",
      name: { js: "canCompleteCircuit", py: "can_complete_circuit" },
      params: [
        { name: "gas", type: "int[]" },
        { name: "cost", type: "int[]" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Starting at station 2: tank 6 - 1 = 5, then 5 + 1 - 3 = 3, then 3 + 2 - 4 = 1, then 1 + 3 - 4 = 0, arriving back at station 2 with an empty (but never negative) tank.",
    },
    tests: [
      [
        [2, 3, 6, 1],
        [4, 4, 1, 3],
      ],
      [
        [1, 2, 1],
        [2, 2, 2],
      ],
      [[5], [3]],
      [[2], [4]],
      [
        [0, 0, 9, 0],
        [2, 3, 1, 3],
      ],
      [
        [4, 1, 1, 1, 4],
        [1, 2, 2, 3, 3],
      ],
      [
        [3, 3, 3],
        [2, 5, 3],
      ],
      [
        [1, 1, 1, 10],
        [3, 3, 3, 2],
      ],
    ],
    js: `
function canCompleteCircuit(gas, cost) {
  let total = 0;
  let tank = 0;
  let start = 0;
  for (let i = 0; i < gas.length; i++) {
    const diff = gas[i] - cost[i];
    total += diff;
    tank += diff;
    if (tank < 0) {
      start = i + 1;
      tank = 0;
    }
  }
  return total < 0 ? -1 : start;
}`,
    py: `
def can_complete_circuit(gas, cost):
    n = len(gas)
    running = 0
    lowest = 0
    lowest_at = 0
    for i in range(n):
        running += gas[i] - cost[i]
        if running < lowest:
            lowest = running
            lowest_at = i + 1
    if running < 0:
        return -1
    return lowest_at % n
`,
  },
  {
    slug: "kth-largest-element-in-an-array",
    title: "Kth Largest Element in an Array",
    difficulty: "MEDIUM",
    topics: ["HEAPS"],
    leetcode: "https://leetcode.com/problems/kth-largest-element-in-an-array/",
    statement: `
Given a list of integers \`nums\` and an integer \`k\`, return the \`k\`-th largest value in the list.

This is the \`k\`-th value when the list is sorted from largest to smallest, so duplicates count separately:
in \`[4, 4, 1]\` the 2nd largest is \`4\`.

Sorting works, but try to do better than O(n log n).
`,
    constraints: ["1 ≤ k ≤ nums.length ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    hints: [
      "You only care about the k biggest values seen so far. Which of them is the answer at the end?",
      "Keep a min-heap of size k: push each value and pop the smallest whenever the heap grows past k. Its top is the answer.",
    ],
    entry: {
      kind: "function",
      name: { js: "findKthLargest", py: "find_kth_largest" },
      params: [
        { name: "nums", type: "int[]" },
        { name: "k", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Sorted from largest: 11, 8, 6, 3, 2. The 3rd value is 6.",
    },
    tests: [
      [[6, 2, 11, 3, 8], 3],
      [[5, 9, 9, 1, 9, 4], 2],
      [[7], 1],
      [[-1, -6, -3], 3],
      [[0, 0, 0, 0], 4],
      [[10, 20, 30, 40, 50], 1],
      [[2, 8, -10000, 10000, 5, 5, 3], 4],
      [[3, 1, 2, 3, 1, 2, 3, 1, 2], 7],
    ],
    js: `
function findKthLargest(nums, k) {
  // Min-heap holding the k largest values seen so far.
  const heap = [];
  const swap = (i, j) => ([heap[i], heap[j]] = [heap[j], heap[i]]);
  const push = (value) => {
    heap.push(value);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent] <= heap[i]) break;
      swap(i, parent);
      i = parent;
    }
  };
  const popMin = () => {
    const last = heap.pop();
    if (heap.length === 0) return;
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let smallest = i;
      if (l < heap.length && heap[l] < heap[smallest]) smallest = l;
      if (r < heap.length && heap[r] < heap[smallest]) smallest = r;
      if (smallest === i) break;
      swap(i, smallest);
      i = smallest;
    }
  };
  for (const value of nums) {
    push(value);
    if (heap.length > k) popMin();
  }
  return heap[0];
}`,
    py: `
import heapq

def find_kth_largest(nums, k):
    return heapq.nlargest(k, nums)[-1]
`,
  },
  {
    slug: "last-stone-weight",
    title: "Last Stone Weight",
    difficulty: "EASY",
    topics: ["HEAPS"],
    leetcode: "https://leetcode.com/problems/last-stone-weight/",
    statement: `
You have a pile of stones; \`stones[i]\` is the weight of stone \`i\`.

Repeat the following while at least two stones remain: take the **two heaviest** stones, with weights \`x ≤ y\`, and smash them together.

- If \`x == y\`, both stones are destroyed.
- Otherwise the lighter one is destroyed and the heavier one now weighs \`y - x\`.

Return the weight of the stone left at the end, or \`0\` if no stones are left.
`,
    constraints: ["1 ≤ stones.length ≤ 30", "1 ≤ stones[i] ≤ 1000"],
    hints: [
      "You repeatedly need the current two largest values, and you add new values back in.",
      "A max-heap gives the largest in O(log n). (In Python, push negated weights into heapq.)",
    ],
    entry: {
      kind: "function",
      name: { js: "lastStoneWeight", py: "last_stone_weight" },
      params: [{ name: "stones", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Smash 9 and 6 → 3, leaving [3, 3, 4]. Smash 4 and 3 → 1, leaving [3, 1]. Smash 3 and 1 → 2.",
    },
    tests: [
      [[3, 9, 4, 6]],
      [[5, 5]],
      [[8]],
      [[2, 2, 2]],
      [[1, 1, 1, 1]],
      [[1000, 1]],
      [[10, 4, 2, 10]],
      [[7, 3, 8, 1, 5, 6, 2]],
    ],
    js: `
function lastStoneWeight(stones) {
  const pile = [...stones];
  while (pile.length > 1) {
    pile.sort((a, b) => a - b);
    const y = pile.pop();
    const x = pile.pop();
    if (y !== x) pile.push(y - x);
  }
  return pile.length ? pile[0] : 0;
}`,
    py: `
import heapq

def last_stone_weight(stones):
    heap = [-w for w in stones]
    heapq.heapify(heap)
    while len(heap) > 1:
        heaviest = -heapq.heappop(heap)
        second = -heapq.heappop(heap)
        if heaviest != second:
            heapq.heappush(heap, second - heaviest)
    return -heap[0] if heap else 0
`,
  },
  {
    slug: "task-scheduler",
    title: "Task Scheduler",
    difficulty: "MEDIUM",
    topics: ["HEAPS", "GREEDY"],
    leetcode: "https://leetcode.com/problems/task-scheduler/",
    statement: `
A single CPU must run a list of jobs \`tasks\`, where each job is labelled by an uppercase letter. Every job takes
exactly one time unit, and jobs may run in any order.

There is a cooldown: after running a job with some label, the CPU must wait at least \`n\` time units before running
another job with the **same** label. During a time unit the CPU either runs one job or sits idle.

Return the minimum number of time units needed to finish every job.
`,
    constraints: [
      "1 ≤ tasks.length ≤ 10⁴",
      "tasks[i] is an uppercase English letter",
      "0 ≤ n ≤ 100",
    ],
    hints: [
      "The most frequent label dictates the shape of the schedule: its copies must be at least n + 1 apart.",
      "Simulate with a max-heap of remaining counts, filling each window of n + 1 slots with the most frequent labels; or count the frames directly.",
    ],
    entry: {
      kind: "function",
      name: { js: "leastInterval", py: "least_interval" },
      params: [
        { name: "tasks", type: "string[]" },
        { name: "n", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "One optimal order is X Y Z X Y idle X. Consecutive X jobs need at least 2 other time units between them, so the three X jobs alone span 7 units.",
    },
    tests: [
      [["X", "X", "X", "Y", "Y", "Z"], 2],
      [["P", "Q", "P", "Q"], 0],
      [["A"], 5],
      [["A", "A", "A", "A"], 3],
      [["A", "B", "C", "D", "E", "F"], 2],
      [["A", "A", "B", "B", "C", "C", "D", "D"], 1],
      [["K", "K", "K", "M", "M", "M", "N"], 2],
      [["R", "R", "R", "S", "T", "U", "V", "W", "X"], 1],
      [["B", "B", "B", "B", "A", "A", "C"], 3],
    ],
    js: `
function leastInterval(tasks, n) {
  const counts = new Map();
  for (const t of tasks) counts.set(t, (counts.get(t) || 0) + 1);
  const values = [...counts.values()];
  const top = Math.max(...values);
  const withTop = values.filter((c) => c === top).length;
  return Math.max(tasks.length, (top - 1) * (n + 1) + withTop);
}`,
    py: `
import heapq
from collections import Counter

def least_interval(tasks, n):
    heap = [-c for c in Counter(tasks).values()]
    heapq.heapify(heap)
    time = 0
    while heap:
        leftover = []
        slots = 0
        while slots <= n and heap:
            remaining = -heapq.heappop(heap) - 1
            if remaining:
                leftover.append(remaining)
            slots += 1
        for remaining in leftover:
            heapq.heappush(heap, -remaining)
        time += slots if not heap else n + 1
    return time
`,
  },
  {
    slug: "k-closest-points-to-origin",
    title: "K Closest Points to Origin",
    difficulty: "MEDIUM",
    topics: ["HEAPS"],
    leetcode: "https://leetcode.com/problems/k-closest-points-to-origin/",
    statement: `
\`points[i] = [x, y]\` is a point on a 2D plane. Return the \`k\` points that are closest to the origin \`(0, 0)\`,
measured by ordinary straight-line (Euclidean) distance.

The points may be returned in any order. The tests guarantee the answer is unique: there is never a tie in distance
between the \`k\`-th closest point and the next one.
`,
    constraints: [
      "1 ≤ k ≤ points.length ≤ 10⁴",
      "-10⁴ ≤ x, y ≤ 10⁴",
      "The set of k closest points is unique.",
    ],
    hints: [
      "Comparing x² + y² gives the same order as the real distance, without square roots.",
      "Sorting is O(n log n). A max-heap of size k (evicting the farthest point) brings it to O(n log k).",
    ],
    entry: {
      kind: "function",
      name: { js: "kClosest", py: "k_closest" },
      params: [
        { name: "points", type: "int[][]" },
        { name: "k", type: "int" },
      ],
      returns: "int[][]",
    },
    compare: "unordered",
    samples: 2,
    explanations: {
      0: "Squared distances are 25, 2, 9 and 41, so the two closest points are [-1, 1] (2) and [0, 3] (9).",
    },
    tests: [
      [
        [
          [3, 4],
          [-1, 1],
          [0, 3],
          [5, -4],
        ],
        2,
      ],
      [
        [
          [2, 2],
          [-6, 1],
        ],
        1,
      ],
      [[[7, -7]], 1],
      [
        [
          [1, 0],
          [0, -2],
          [3, 0],
        ],
        3,
      ],
      [
        [
          [0, 0],
          [10, 10],
          [-1, -1],
          [4, 0],
        ],
        3,
      ],
      [
        [
          [1, 1],
          [1, 1],
          [5, 5],
        ],
        2,
      ],
      [
        [
          [-10000, 10000],
          [10000, 9999],
          [0, 1],
        ],
        2,
      ],
      [
        [
          [2, -3],
          [-4, 1],
          [1, 5],
          [0, -2],
          [-3, -3],
          [6, 0],
        ],
        4,
      ],
    ],
    js: `
function kClosest(points, k) {
  const dist = ([x, y]) => x * x + y * y;
  return [...points]
    .sort((a, b) => dist(a) - dist(b))
    .slice(0, k)
    .map((p) => [...p]);
}`,
    py: `
import heapq

def k_closest(points, k):
    farthest = []
    for x, y in points:
        heapq.heappush(farthest, (-(x * x + y * y), x, y))
        if len(farthest) > k:
            heapq.heappop(farthest)
    return [[x, y] for _, x, y in farthest]
`,
  },
];

export default problems;
