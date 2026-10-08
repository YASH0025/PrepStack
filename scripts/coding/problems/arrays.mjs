/** Arrays, strings, hashing, two pointers, sliding window, binary search. */
const problems = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "EASY",
    topics: ["ARRAYS", "HASHING"],
    leetcode: "https://leetcode.com/problems/two-sum/",
    statement: `
You are given a list of integers \`nums\` and an integer \`target\`. Exactly one pair of
different positions holds two numbers that add up to \`target\`.

Return the two positions (indexes) of that pair. The order of the two indexes does not matter.
`,
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i], target ≤ 10⁹",
      "Exactly one valid pair exists.",
    ],
    hints: [
      "Checking every pair works but is O(n²). Can you find each number's partner in O(1)?",
      "While scanning, remember each value's index in a hash map and look up target - value.",
    ],
    entry: {
      kind: "function",
      name: { js: "twoSum", py: "two_sum" },
      params: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returns: "int[]",
    },
    compare: "unordered",
    samples: 3,
    explanations: { 0: "nums[0] + nums[1] = 3 + 4 = 7." },
    tests: [
      [[3, 4, 9, 1], 7],
      [[5, 1, 5], 10],
      [[-3, 8, 2, 11], 5],
      [[0, -1, 7, 1], 0],
      [[1000000000, -1000000000, 6], 0],
      [[2, 9], 11],
      [[4, 6, 1, 13, 8, 21, 3], 34],
    ],
    js: `
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    py: `
def two_sum(nums, target):
    seen = {}
    for i, value in enumerate(nums):
        if target - value in seen:
            return [seen[target - value], i]
        seen[value] = i
    return []
`,
  },
  {
    slug: "lru-cache",
    title: "LRU Cache",
    difficulty: "MEDIUM",
    topics: ["HASHING", "LINKED_LIST"],
    leetcode: "https://leetcode.com/problems/lru-cache/",
    statement: `
Build a cache with a fixed \`capacity\` that evicts the **least recently used** key when it is full.

Implement the class \`LRUCache\`:

- \`constructor(capacity)\` creates an empty cache.
- \`get(key)\` returns the value stored for \`key\`, or \`-1\` if it is not cached. Reading a key counts as using it.
- \`put(key, value)\` stores or updates \`key\`; this also counts as using it. If that makes the cache hold more than \`capacity\` keys, remove the key that was used longest ago.

Both operations should run in O(1) average time.

**Test format:** \`operations\` lists the calls in order (the first is the constructor) and
\`arguments\` holds each call's arguments. The expected output has one entry per call:
\`null\` for the constructor and for \`put\`.
`,
    constraints: ["1 ≤ capacity ≤ 3000", "0 ≤ key, value ≤ 10⁵", "At most 2 × 10⁵ calls."],
    hints: [
      'A hash map gives O(1) lookup; you also need O(1) "move to most recent" and "remove oldest".',
      "A doubly linked list ordered by recency does both. In JS and Python, an insertion-ordered Map / OrderedDict can stand in for it.",
    ],
    entry: {
      kind: "class",
      className: "LRUCache",
      constructorParams: [{ name: "capacity", type: "int" }],
      methods: [
        { name: "get", params: [{ name: "key", type: "int" }], returns: "int" },
        {
          name: "put",
          params: [
            { name: "key", type: "int" },
            { name: "value", type: "int" },
          ],
          returns: "void",
        },
      ],
    },
    samples: 1,
    explanations: {
      0: "get(4) makes key 4 the most recently used, so when put(9, 90) takes the cache past its capacity of 2, key 7 (used longest ago) is evicted and get(7) returns -1.",
    },
    tests: [
      [
        ["LRUCache", "put", "put", "get", "put", "get", "get", "get"],
        [[2], [4, 40], [7, 70], [4], [9, 90], [7], [4], [9]],
      ],
      [
        ["LRUCache", "put", "get", "put", "get", "get"],
        [[1], [5, 50], [5], [6, 60], [5], [6]],
      ],
      [
        ["LRUCache", "put", "put", "put", "get", "put", "get", "get"],
        [[2], [1, 1], [2, 2], [1, 10], [1], [3, 3], [2], [1]],
      ],
      [
        ["LRUCache", "get", "put", "get"],
        [[3], [7], [7, 70], [7]],
      ],
      [
        ["LRUCache", "put", "put", "put", "get", "get", "put", "get", "get", "get", "get"],
        [[3], [1, 1], [2, 2], [3, 3], [1], [2], [4, 4], [3], [1], [2], [4]],
      ],
      [
        ["LRUCache", "put", "put", "get", "put", "get", "get"],
        [[1], [3, 30], [3, 31], [3], [4, 40], [3], [4]],
      ],
    ],
    js: `
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  put(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);
  }
}`,
    py: `
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.items = OrderedDict()

    def get(self, key):
        if key not in self.items:
            return -1
        self.items.move_to_end(key)
        return self.items[key]

    def put(self, key, value):
        self.items[key] = value
        self.items.move_to_end(key)
        if len(self.items) > self.capacity:
            self.items.popitem(last=False)
`,
  },
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "EASY",
    topics: ["ARRAYS", "HASHING"],
    leetcode: "https://leetcode.com/problems/contains-duplicate/",
    statement: `
Given a list of integers \`nums\`, decide whether any value shows up **two or more times**.

Return \`true\` if some value repeats, and \`false\` if every value is distinct.
`,
    constraints: ["0 ≤ nums.length ≤ 10⁵", "-10⁹ ≤ nums[i] ≤ 10⁹"],
    hints: [
      "Sorting puts equal values next to each other, but costs O(n log n).",
      "Keep a set of values you have already seen; the first value that is already in the set is a repeat.",
    ],
    entry: {
      kind: "function",
      name: { js: "containsDuplicate", py: "contains_duplicate" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "bool",
    },
    samples: 2,
    explanations: { 0: "The value 5 appears at index 1 and again at index 3." },
    tests: [
      [[1, 5, 3, 5]],
      [[4, 2, 7]],
      [[]],
      [[9]],
      [[-2, -2]],
      [[0, 1, 2, 3, 4, 0]],
      [[1000000000, -1000000000]],
      [[7, 7, 7, 7]],
    ],
    js: `
function containsDuplicate(nums) {
  const seen = new Set();
  for (const value of nums) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}`,
    py: `
def contains_duplicate(nums):
    return len(set(nums)) != len(nums)
`,
  },
  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "EASY",
    topics: ["STRINGS", "HASHING"],
    leetcode: "https://leetcode.com/problems/valid-anagram/",
    statement: `
Two words are **anagrams** when one can be turned into the other by rearranging its letters,
using every letter exactly as many times as it appears.

Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, otherwise \`false\`.
`,
    constraints: [
      "0 ≤ s.length, t.length ≤ 5 × 10⁴",
      "s and t contain lowercase English letters only.",
    ],
    hints: [
      "If the lengths differ, the answer is immediately false.",
      "Count how often each letter appears in s, then subtract the counts for t. Every count should end at zero.",
    ],
    entry: {
      kind: "function",
      name: { js: "isAnagram", py: "is_anagram" },
      params: [
        { name: "s", type: "string" },
        { name: "t", type: "string" },
      ],
      returns: "bool",
    },
    samples: 2,
    explanations: { 0: "Both words use the letters e, i, l, n, s, t exactly once each." },
    tests: [
      ["listen", "silent"],
      ["night", "think"],
      ["rat", "tar"],
      ["hello", "helo"],
      ["", ""],
      ["a", "b"],
      ["aabb", "abab"],
      ["aab", "abb"],
    ],
    js: `
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
  for (const ch of t) {
    const left = counts.get(ch) || 0;
    if (left === 0) return false;
    counts.set(ch, left - 1);
  }
  return true;
}`,
    py: `
def is_anagram(s, t):
    return sorted(s) == sorted(t)
`,
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "MEDIUM",
    topics: ["STRINGS", "HASHING"],
    leetcode: "https://leetcode.com/problems/group-anagrams/",
    statement: `
You are given a list of lowercase strings \`words\`. Put words that are anagrams of each other
(same letters, same counts, any order) into the same group.

Return the list of groups. The groups may come in any order, and the words inside a group may
come in any order too.
`,
    constraints: [
      "1 ≤ words.length ≤ 10⁴",
      "0 ≤ words[i].length ≤ 100",
      "words[i] contains lowercase English letters only.",
    ],
    hints: [
      "Two words are anagrams exactly when their sorted letters are equal.",
      "Use a hash map from a canonical key (sorted letters, or a 26-letter count) to the list of words with that key.",
    ],
    entry: {
      kind: "function",
      name: { js: "groupAnagrams", py: "group_anagrams" },
      params: [{ name: "words", type: "string[]" }],
      returns: "string[][]",
    },
    compare: "unordered-nested",
    samples: 2,
    explanations: {
      0: '"stop", "pots" and "tops" share the letters o, p, s, t; "cat" and "act" share a, c, t; "dog" stands alone.',
    },
    tests: [
      [["stop", "pots", "tops", "cat", "act", "dog"]],
      [["x"]],
      [["", ""]],
      [["abc", "bca", "cab", "xyz"]],
      [["ab", "ba", "abc"]],
      [["aa", "a", "aa"]],
      [["night", "thing", "cheap", "peach", "ghost"]],
    ],
    js: `
function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}`,
    py: `
def group_anagrams(words):
    groups = {}
    for word in words:
        counts = [0] * 26
        for ch in word:
            counts[ord(ch) - ord("a")] += 1
        groups.setdefault(tuple(counts), []).append(word)
    return list(groups.values())
`,
  },
  {
    slug: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    difficulty: "MEDIUM",
    topics: ["HASHING", "HEAPS"],
    leetcode: "https://leetcode.com/problems/top-k-frequent-elements/",
    statement: `
Given a list of integers \`nums\` and an integer \`k\`, return the \`k\` values that occur
**most often** in \`nums\`.

The tests are built so the answer is unique (there is never a tie at the cut-off). You may
return the values in any order.
`,
    constraints: [
      "1 ≤ nums.length ≤ 10⁵",
      "-10⁴ ≤ nums[i] ≤ 10⁴",
      "1 ≤ k ≤ number of distinct values in nums",
      "The set of the k most frequent values is unique.",
    ],
    hints: [
      "First count how many times each value appears.",
      "Sorting the counts works in O(n log n). For O(n), put each value in a bucket indexed by its count and read the buckets from the highest count down.",
    ],
    entry: {
      kind: "function",
      name: { js: "topKFrequent", py: "top_k_frequent" },
      params: [
        { name: "nums", type: "int[]" },
        { name: "k", type: "int" },
      ],
      returns: "int[]",
    },
    compare: "unordered",
    samples: 2,
    explanations: { 0: "4 appears three times and 2 appears twice; 9 appears only once." },
    tests: [
      [[4, 4, 4, 2, 2, 9], 2],
      [[7], 1],
      [[1, 1, 2, 2, 2, 3, 3, 3, 3], 2],
      [[-1, -1, 5, 5, 5, 0], 1],
      [[1, 2, 3], 3],
      [[8, 8, 6, 6, 6, 5, 5, 5, 5, 1], 3],
      [[0, 0, 0, -3, -3, 10], 2],
      [[2, 3, 2, 4, 3, 2, 5, 3, 2], 2],
    ],
    js: `
function topKFrequent(nums, k) {
  const counts = new Map();
  for (const value of nums) counts.set(value, (counts.get(value) || 0) + 1);
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, count] of counts) buckets[count].push(value);
  const result = [];
  for (let count = nums.length; count > 0 && result.length < k; count--) {
    for (const value of buckets[count]) {
      if (result.length < k) result.push(value);
    }
  }
  return result;
}`,
    py: `
import heapq
from collections import Counter

def top_k_frequent(nums, k):
    counts = Counter(nums)
    return heapq.nlargest(k, counts.keys(), key=lambda value: counts[value])
`,
  },
  {
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    difficulty: "MEDIUM",
    topics: ["ARRAYS"],
    leetcode: "https://leetcode.com/problems/product-of-array-except-self/",
    statement: `
Given a list of integers \`nums\`, return a new list \`answer\` where \`answer[i]\` is the
product of every element of \`nums\` **except** \`nums[i]\`.

Try to do it in O(n) time **without using division** (division also breaks when a zero is present).
`,
    constraints: [
      "2 ≤ nums.length ≤ 10⁵",
      "-30 ≤ nums[i] ≤ 30",
      "Every product fits in a 32-bit integer.",
    ],
    hints: [
      "answer[i] = (product of everything to the left of i) × (product of everything to the right of i).",
      "Fill the result with left products in one pass, then sweep from the right keeping a running right product.",
    ],
    entry: {
      kind: "function",
      name: { js: "productExceptSelf", py: "product_except_self" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int[]",
    },
    samples: 2,
    explanations: {
      0: "For index 0 the product is 3 × 4 × 5 = 60; for index 1 it is 2 × 4 × 5 = 40, and so on.",
    },
    tests: [
      [[2, 3, 4, 5]],
      [[2, 0, 5]],
      [[-1, 3]],
      [[0, 0, 4]],
      [[5, 5, 5, 5]],
      [[-2, -3, 4, 1]],
      [[1, 1]],
      [[3, -1, 2, -2, 1]],
    ],
    js: `
function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n).fill(1);
  for (let i = 1; i < n; i++) answer[i] = answer[i - 1] * nums[i - 1];
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= right;
    right *= nums[i];
  }
  return answer;
}`,
    py: `
def product_except_self(nums):
    n = len(nums)
    left = [1] * n
    right = [1] * n
    for i in range(1, n):
        left[i] = left[i - 1] * nums[i - 1]
    for i in range(n - 2, -1, -1):
        right[i] = right[i + 1] * nums[i + 1]
    return [left[i] * right[i] for i in range(n)]
`,
  },
  {
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    difficulty: "MEDIUM",
    topics: ["ARRAYS", "HASHING"],
    leetcode: "https://leetcode.com/problems/longest-consecutive-sequence/",
    statement: `
Given an unsorted list of integers \`nums\`, find the length of the longest run of
**consecutive integers** (like 4, 5, 6, 7) whose values all appear somewhere in \`nums\`.
The values do not need to be next to each other in the list.

Aim for O(n) time.
`,
    constraints: ["0 ≤ nums.length ≤ 10⁵", "-10⁹ ≤ nums[i] ≤ 10⁹"],
    hints: [
      'Put every value into a set so you can ask "is x present?" in O(1).',
      "Only start counting from values x where x - 1 is missing; those are the starts of runs.",
    ],
    entry: {
      kind: "function",
      name: { js: "longestConsecutive", py: "longest_consecutive" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "The values 1, 2, 3, 4 are all present, giving a run of length 4. 49, 50 is only length 2.",
    },
    tests: [
      [[50, 3, 1, 2, 49, 4]],
      [[]],
      [[7]],
      [[1, 1, 2, 2, 3]],
      [[-2, -1, 0, 5, 6]],
      [[10, 30, 20]],
      [[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]],
      [[0, -1]],
    ],
    js: `
function longestConsecutive(nums) {
  const values = new Set(nums);
  let best = 0;
  for (const value of values) {
    if (values.has(value - 1)) continue;
    let length = 1;
    while (values.has(value + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}`,
    py: `
def longest_consecutive(nums):
    ordered = sorted(set(nums))
    best = 0
    run = 0
    for i, value in enumerate(ordered):
        if i > 0 and ordered[i - 1] == value - 1:
            run += 1
        else:
            run = 1
        best = max(best, run)
    return best
`,
  },
  {
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "EASY",
    topics: ["STRINGS", "TWO_POINTERS"],
    leetcode: "https://leetcode.com/problems/valid-palindrome/",
    statement: `
Given a string \`s\`, keep only its letters and digits and ignore letter case. Return \`true\`
if what remains reads the same forwards and backwards, otherwise \`false\`.

A string with no letters or digits counts as a palindrome.
`,
    constraints: ["0 ≤ s.length ≤ 2 × 10⁵", "s contains printable ASCII characters."],
    hints: [
      "Use one pointer at each end and walk them toward each other.",
      "Skip characters that are not letters or digits, and compare the rest in lowercase.",
    ],
    entry: {
      kind: "function",
      name: { js: "isPalindrome", py: "is_palindrome" },
      params: [{ name: "s", type: "string" }],
      returns: "bool",
    },
    samples: 2,
    explanations: {
      0: 'Keeping only letters in lowercase gives "wasitacaroracatisaw", which is the same reversed.',
    },
    tests: [
      ["Was it a car, or a cat I saw?"],
      ["Palindrome?"],
      [""],
      ["!!"],
      ["a1b2"],
      ["Step on no pets"],
      ["9Z"],
      ["No 'x' in Nixon"],
      ["1a2"],
    ],
    js: `
function isPalindrome(s) {
  const keep = (ch) => /[a-z0-9]/i.test(ch);
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (!keep(s[left])) left++;
    else if (!keep(s[right])) right--;
    else {
      if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
      left++;
      right--;
    }
  }
  return true;
}`,
    py: `
def is_palindrome(s):
    cleaned = [ch.lower() for ch in s if ch.isascii() and ch.isalnum()]
    return cleaned == cleaned[::-1]
`,
  },
  {
    slug: "two-sum-ii-input-array-is-sorted",
    title: "Two Sum II - Input Array Is Sorted",
    difficulty: "MEDIUM",
    topics: ["TWO_POINTERS"],
    leetcode: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
    statement: `
You are given \`numbers\`, a list of integers sorted in **non-decreasing** order, and an
integer \`target\`. Exactly one pair of different positions adds up to \`target\`.

Return the two positions as **1-based** indexes \`[i, j]\` with \`i < j\`. Use only O(1) extra space.
`,
    constraints: [
      "2 ≤ numbers.length ≤ 3 × 10⁴",
      "-1000 ≤ numbers[i], target ≤ 1000",
      "numbers is sorted in non-decreasing order.",
      "Exactly one valid pair exists.",
    ],
    hints: [
      "Start with one pointer at each end of the list.",
      "If the sum is too small, move the left pointer right; if it is too large, move the right pointer left.",
    ],
    entry: {
      kind: "function",
      name: { js: "twoSumSorted", py: "two_sum_sorted" },
      params: [
        { name: "numbers", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returns: "int[]",
    },
    samples: 2,
    explanations: {
      0: "numbers[0] + numbers[4] = 1 + 11 = 12, which are positions 1 and 5 when counting from 1.",
    },
    tests: [
      [[1, 3, 5, 8, 11], 12],
      [[-4, -1, 2, 6], 1],
      [[2, 2], 4],
      [[0, 0, 3, 4], 0],
      [[-10, -3, 0, 7, 20], 10],
      [[1, 2, 3, 4, 5, 6], 11],
      [[5, 25, 75], 100],
      [[-7, 3], -4],
    ],
    js: `
function twoSumSorted(numbers, target) {
  let left = 0;
  let right = numbers.length - 1;
  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) return [left + 1, right + 1];
    if (sum < target) left++;
    else right--;
  }
  return [];
}`,
    py: `
from bisect import bisect_left

def two_sum_sorted(numbers, target):
    for i, value in enumerate(numbers):
        need = target - value
        j = bisect_left(numbers, need, i + 1)
        if j < len(numbers) and numbers[j] == need:
            return [i + 1, j + 1]
    return []
`,
  },
  {
    slug: "3sum",
    title: "3Sum",
    difficulty: "MEDIUM",
    topics: ["TWO_POINTERS"],
    leetcode: "https://leetcode.com/problems/3sum/",
    statement: `
Given a list of integers \`nums\`, find every **distinct** triplet of values
\`[a, b, c]\` taken from three different positions such that \`a + b + c == 0\`.

Two triplets count as the same if they contain the same values. Return the triplets in any
order, with the values inside each triplet in any order. Return an empty list if there are none.
`,
    constraints: ["0 ≤ nums.length ≤ 3000", "-10⁵ ≤ nums[i] ≤ 10⁵"],
    hints: [
      "Sort the list first; duplicates become neighbours and are easy to skip.",
      "Fix the first value, then find pairs summing to its negative with two pointers on the rest.",
    ],
    entry: {
      kind: "function",
      name: { js: "threeSum", py: "three_sum" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int[][]",
    },
    compare: "unordered-nested",
    samples: 3,
    explanations: {
      0: "-2 + 0 + 2, -2 + 1 + 1 and -1 + 0 + 1 all equal 0. No other combination of values does.",
    },
    tests: [
      [[-2, 0, 1, 1, 2, -1]],
      [[1, 2, 3]],
      [[0, 0, 0, 0]],
      [[-3, 1, 2, -1, 0, 3, -2]],
      [[]],
      [[5, -5]],
      [[-1, -1, 2, 2, -4, 0, 4]],
      [[-6, 3, 3, 3, 2, 4]],
    ],
    js: `
function threeSum(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length - 2; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1]) continue;
    let left = i + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const sum = sorted[i] + sorted[left] + sorted[right];
      if (sum < 0) left++;
      else if (sum > 0) right--;
      else {
        result.push([sorted[i], sorted[left], sorted[right]]);
        left++;
        right--;
        while (left < right && sorted[left] === sorted[left - 1]) left++;
      }
    }
  }
  return result;
}`,
    py: `
def three_sum(nums):
    found = set()
    for i in range(len(nums)):
        seen = set()
        for j in range(i + 1, len(nums)):
            need = -nums[i] - nums[j]
            if need in seen:
                found.add(tuple(sorted((nums[i], nums[j], need))))
            seen.add(nums[j])
    return [list(triple) for triple in found]
`,
  },
  {
    slug: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "MEDIUM",
    topics: ["TWO_POINTERS"],
    leetcode: "https://leetcode.com/problems/container-with-most-water/",
    statement: `
\`heights[i]\` is the height of a vertical wall standing at position \`i\`. Choose two walls;
together with the ground they form a container that holds water up to the **shorter** wall.

The amount of water is \`(distance between the walls) × (height of the shorter wall)\`.
Return the largest amount any pair of walls can hold.
`,
    constraints: ["2 ≤ heights.length ≤ 10⁵", "0 ≤ heights[i] ≤ 10⁴"],
    hints: [
      "Start with the widest container: the first and last walls.",
      "Moving the taller wall inward can never help, because the width shrinks and the height is still capped by the shorter wall. Move the shorter one.",
    ],
    entry: {
      kind: "function",
      name: { js: "maxArea", py: "max_area" },
      params: [{ name: "heights", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Walls at positions 1 (height 7) and 6 (height 6) are 5 apart, holding 5 × 6 = 30.",
    },
    tests: [
      [[2, 7, 4, 1, 8, 3, 6]],
      [[3, 3]],
      [[1, 5, 1]],
      [[4, 1, 1, 1, 4]],
      [[0, 0, 0]],
      [[1, 2, 3, 4, 5, 6]],
      [[10, 1, 1, 1, 1, 1, 1, 1, 1, 10]],
      [[6, 2, 9, 3, 9, 1]],
    ],
    js: `
function maxArea(heights) {
  let left = 0;
  let right = heights.length - 1;
  let best = 0;
  while (left < right) {
    const water = (right - left) * Math.min(heights[left], heights[right]);
    best = Math.max(best, water);
    if (heights[left] < heights[right]) left++;
    else right--;
  }
  return best;
}`,
    py: `
def max_area(heights):
    i, j = 0, len(heights) - 1
    best = 0
    while i < j:
        h = min(heights[i], heights[j])
        best = max(best, h * (j - i))
        while i < j and heights[i] <= h:
            i += 1
        while i < j and heights[j] <= h:
            j -= 1
    return best
`,
  },
  {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "EASY",
    topics: ["SLIDING_WINDOW", "ARRAYS"],
    leetcode: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    statement: `
\`prices[i]\` is the price of a share on day \`i\`. You may buy one share on some day and sell
it on a **later** day.

Return the largest profit you can make. If no trade makes money, return \`0\`.
`,
    constraints: ["1 ≤ prices.length ≤ 10⁵", "0 ≤ prices[i] ≤ 10⁴"],
    hints: [
      "For each selling day, the best buying day is the cheapest day before it.",
      "Scan once, tracking the lowest price seen so far and the best profit so far.",
    ],
    entry: {
      kind: "function",
      name: { js: "maxProfit", py: "max_profit" },
      params: [{ name: "prices", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: { 0: "Buy on day 3 at price 1 and sell on day 4 at price 5 for a profit of 4." },
    tests: [
      [[8, 3, 6, 1, 5, 4]],
      [[9, 7, 4, 2]],
      [[5]],
      [[2, 2, 2]],
      [[1, 10]],
      [[3, 8, 1, 7]],
      [[6, 1, 3, 2, 9, 0, 4]],
    ],
    js: `
function maxProfit(prices) {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    lowest = Math.min(lowest, price);
    best = Math.max(best, price - lowest);
  }
  return best;
}`,
    py: `
def max_profit(prices):
    best = 0
    highest_after = 0
    for price in reversed(prices):
        highest_after = max(highest_after, price)
        best = max(best, highest_after - price)
    return best
`,
  },
  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "MEDIUM",
    topics: ["SLIDING_WINDOW", "STRINGS"],
    leetcode: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
    statement: `
Given a string \`s\`, return the length of the longest **contiguous** piece of \`s\` in which
no character appears more than once.
`,
    constraints: ["0 ≤ s.length ≤ 5 × 10⁴", "s contains letters, digits, symbols and spaces."],
    hints: [
      "Keep a window [left, right] that never contains a repeated character.",
      "Remember the last index of each character. When s[right] was seen inside the window, jump left past that index.",
    ],
    entry: {
      kind: "function",
      name: { js: "lengthOfLongestSubstring", py: "length_of_longest_substring" },
      params: [{ name: "s", type: "string" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: '"cbdea" has five different characters; every longer piece repeats a letter.',
    },
    tests: [
      ["abcbdea"],
      ["zzzz"],
      [""],
      ["q"],
      ["abba"],
      ["xyzxyzw"],
      ["a b c a"],
      ["mississippi"],
    ],
    js: `
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) left = lastSeen.get(ch) + 1;
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    py: `
def length_of_longest_substring(s):
    window = set()
    left = 0
    best = 0
    for ch in s:
        while ch in window:
            window.remove(s[left])
            left += 1
        window.add(ch)
        best = max(best, len(window))
    return best
`,
  },
  {
    slug: "longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    difficulty: "MEDIUM",
    topics: ["SLIDING_WINDOW"],
    leetcode: "https://leetcode.com/problems/longest-repeating-character-replacement/",
    statement: `
You are given a string \`s\` of uppercase letters and an integer \`k\`. You may change at most
\`k\` characters of \`s\` into any other uppercase letter.

Return the length of the longest contiguous piece you can make that consists of a **single
repeated letter**.
`,
    constraints: [
      "1 ≤ s.length ≤ 10⁵",
      "s contains uppercase English letters only.",
      "0 ≤ k ≤ s.length",
    ],
    hints: [
      "A window can be made uniform if (window length − count of its most common letter) ≤ k.",
      "Grow the window to the right; when it becomes invalid, slide the left edge forward by one.",
    ],
    entry: {
      kind: "function",
      name: { js: "characterReplacement", py: "character_replacement" },
      params: [
        { name: "s", type: "string" },
        { name: "k", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: 'Change the A at index 4 to B to get "BBBBB" (indexes 1–5), a run of length 5.',
    },
    tests: [
      ["ABBBABC", 1],
      ["AAAA", 2],
      ["ABCD", 0],
      ["A", 0],
      ["XYYXYYYX", 2],
      ["BAAAB", 2],
      ["ABCDE", 1],
      ["AABCABBB", 2],
    ],
    js: `
function characterReplacement(s, k) {
  const counts = new Map();
  let left = 0;
  let topCount = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const count = (counts.get(s[right]) || 0) + 1;
    counts.set(s[right], count);
    topCount = Math.max(topCount, count);
    while (right - left + 1 - topCount > k) {
      counts.set(s[left], counts.get(s[left]) - 1);
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    py: `
def character_replacement(s, k):
    best = 0
    for letter in set(s):
        left = 0
        changes = 0
        for right, ch in enumerate(s):
            if ch != letter:
                changes += 1
            while changes > k:
                if s[left] != letter:
                    changes -= 1
                left += 1
            best = max(best, right - left + 1)
    return best
`,
  },
  {
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    difficulty: "HARD",
    topics: ["SLIDING_WINDOW", "STRINGS"],
    leetcode: "https://leetcode.com/problems/minimum-window-substring/",
    statement: `
Given two strings \`s\` and \`t\`, find the **shortest** contiguous piece of \`s\` that contains
every character of \`t\`, counting repeats (if \`t\` has two \`a\`s, the piece needs at least two \`a\`s).
Characters are case-sensitive.

Return that piece, or the empty string \`""\` if no piece works. The tests are built so the
shortest piece is always unique.
`,
    constraints: [
      "1 ≤ s.length, t.length ≤ 10⁵",
      "s and t contain English letters.",
      "When an answer exists, exactly one shortest window exists.",
    ],
    hints: [
      "Count what t needs. Expand a window to the right until it covers all of t.",
      "Then shrink it from the left as long as it still covers t, recording the shortest valid window as you go.",
    ],
    entry: {
      kind: "function",
      name: { js: "minWindow", py: "min_window" },
      params: [
        { name: "s", type: "string" },
        { name: "t", type: "string" },
      ],
      returns: "string",
    },
    samples: 3,
    explanations: {
      0: 'The last two characters "pr" already contain both p and r; no shorter piece can hold two characters.',
    },
    tests: [
      ["pqrsqtpr", "pr"],
      ["thequickbrownfox", "oxf"],
      ["a", "b"],
      ["aa", "aa"],
      ["ab", "aab"],
      ["zzzyx", "yz"],
      ["Ab", "b"],
      ["kayakbab", "aab"],
      ["mxnyzmnqm", "mmn"],
    ],
    js: `
function minWindow(s, t) {
  const need = new Map();
  for (const ch of t) need.set(ch, (need.get(ch) || 0) + 1);
  let missing = t.length;
  let left = 0;
  let bestStart = 0;
  let bestLength = Infinity;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (need.has(ch)) {
      if (need.get(ch) > 0) missing--;
      need.set(ch, need.get(ch) - 1);
    }
    while (missing === 0) {
      if (right - left + 1 < bestLength) {
        bestLength = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      if (need.has(out)) {
        need.set(out, need.get(out) + 1);
        if (need.get(out) > 0) missing++;
      }
      left++;
    }
  }
  return bestLength === Infinity ? "" : s.slice(bestStart, bestStart + bestLength);
}`,
    py: `
from collections import Counter

def min_window(s, t):
    need = Counter(t)

    def covers(window):
        return all(window[ch] >= count for ch, count in need.items())

    best = ""
    window = Counter()
    left = 0
    for right, ch in enumerate(s):
        window[ch] += 1
        while left <= right and covers(window):
            if best == "" or right - left + 1 < len(best):
                best = s[left:right + 1]
            window[s[left]] -= 1
            left += 1
    return best
`,
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "EASY",
    topics: ["BINARY_SEARCH"],
    leetcode: "https://leetcode.com/problems/binary-search/",
    statement: `
You are given \`nums\`, a list of **distinct** integers sorted in increasing order, and an
integer \`target\`. Return the index of \`target\` in \`nums\`, or \`-1\` if it is not there.

Your solution should run in O(log n) time.
`,
    constraints: [
      "1 ≤ nums.length ≤ 10⁴",
      "-10⁴ ≤ nums[i], target ≤ 10⁴",
      "nums is sorted in increasing order with no duplicates.",
    ],
    hints: [
      "Compare target with the middle element; that tells you which half can still contain it.",
      "Keep a range [low, high] and stop when it becomes empty.",
    ],
    entry: {
      kind: "function",
      name: { js: "search", py: "search" },
      params: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: { 0: "8 is stored at index 3." },
    tests: [
      [[-3, 0, 4, 8, 15], 8],
      [[1, 3, 5], 2],
      [[7], 7],
      [[7], 1],
      [[2, 4, 6, 8, 10, 12], 2],
      [[2, 4, 6, 8, 10, 12], 12],
      [[-20, -10], -15],
      [[0, 5, 9, 13, 21, 40, 77], 40],
    ],
    js: `
function search(nums, target) {
  let low = 0;
  let high = nums.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
    py: `
from bisect import bisect_left

def search(nums, target):
    i = bisect_left(nums, target)
    if i < len(nums) and nums[i] == target:
        return i
    return -1
`,
  },
  {
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "MEDIUM",
    topics: ["BINARY_SEARCH"],
    leetcode: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
    statement: `
A list of **distinct** integers was sorted in increasing order and then possibly **rotated**:
some prefix was cut off and moved to the end (for example \`[1, 2, 4, 6, 7, 9]\` could become
\`[6, 7, 9, 1, 2, 4]\`).

Given the rotated list \`nums\` and an integer \`target\`, return the index of \`target\`, or
\`-1\` if it is not present. Aim for O(log n) time.
`,
    constraints: [
      "1 ≤ nums.length ≤ 5000",
      "-10⁴ ≤ nums[i], target ≤ 10⁴",
      "All values in nums are distinct.",
    ],
    hints: [
      "Split at the middle: at least one of the two halves is sorted normally.",
      "Check whether target lies inside the sorted half's range; if so search there, otherwise search the other half.",
    ],
    entry: {
      kind: "function",
      name: { js: "searchRotated", py: "search_rotated" },
      params: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: { 0: "2 sits at index 4 of the rotated list." },
    tests: [
      [[6, 7, 9, 1, 2, 4], 2],
      [[6, 7, 9, 1, 2, 4], 5],
      [[3], 3],
      [[5, 1], 1],
      [[1, 2, 3, 4], 4],
      [[30, 40, 50, 10, 20], 40],
      [[2, 3, 4, 5, 6, 1], 1],
      [[8, 9, 2, 3, 4], 9],
      [[12, 15, 18, 21, 3, 6, 9], 10],
    ],
    js: `
function searchRotated(nums, target) {
  let low = 0;
  let high = nums.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[low] <= nums[mid]) {
      if (nums[low] <= target && target < nums[mid]) high = mid - 1;
      else low = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[high]) low = mid + 1;
      else high = mid - 1;
    }
  }
  return -1;
}`,
    py: `
from bisect import bisect_left

def search_rotated(nums, target):
    # find the rotation point (index of the smallest value), then binary search one side
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    pivot = lo
    if pivot > 0 and nums[0] <= target:
        start, end = 0, pivot
    else:
        start, end = pivot, len(nums)
    i = bisect_left(nums, target, start, end)
    if i < end and nums[i] == target:
        return i
    return -1
`,
  },
  {
    slug: "find-minimum-in-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    difficulty: "MEDIUM",
    topics: ["BINARY_SEARCH"],
    leetcode: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
    statement: `
\`nums\` is a list of **distinct** integers that was sorted in increasing order and then
rotated some number of times (possibly zero), so a prefix was moved to the end.

Return the smallest value in \`nums\` in O(log n) time.
`,
    constraints: [
      "1 ≤ nums.length ≤ 5000",
      "-5000 ≤ nums[i] ≤ 5000",
      "All values in nums are distinct.",
    ],
    hints: [
      "Compare the middle element with the last element.",
      "If nums[mid] > nums[last], the minimum is to the right of mid; otherwise it is at mid or to its left.",
    ],
    entry: {
      kind: "function",
      name: { js: "findMin", py: "find_min" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "The original sorted list was [1, 2, 3, 5, 6, 7], rotated so that 5 comes first; its minimum is 1.",
    },
    tests: [
      [[5, 6, 7, 1, 2, 3]],
      [[2, 4, 6, 8]],
      [[9]],
      [[2, 1]],
      [[-3, -1, -10, -7]],
      [[11, 12, 13, 14, 10]],
      [[3, 4, 5, 6, 7, 0, 1]],
    ],
    js: `
function findMin(nums) {
  let low = 0;
  let high = nums.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (nums[mid] > nums[high]) low = mid + 1;
    else high = mid;
  }
  return nums[low];
}`,
    py: `
def find_min(nums):
    lo, hi = 0, len(nums) - 1
    if nums[lo] <= nums[hi]:
        return nums[lo]
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[lo]:
            lo = mid
        else:
            hi = mid
    return nums[hi]
`,
  },
  {
    slug: "koko-eating-bananas",
    title: "Reading Speed (Koko Eating Bananas)",
    difficulty: "MEDIUM",
    topics: ["BINARY_SEARCH"],
    leetcode: "https://leetcode.com/problems/koko-eating-bananas/",
    statement: `
A reader has a stack of books, where \`pages[i]\` is the number of pages in book \`i\`, and
\`hours\` hours before the books are due back at the library.

The reader picks a whole-number speed of \`k\` pages per hour. Each hour they work on a single
book: they read \`k\` pages of it, or finish it if fewer than \`k\` pages remain, and then rest
for the rest of that hour (they never start a second book in the same hour).

Return the **smallest** speed \`k\` that lets them finish every book within \`hours\` hours.
`,
    constraints: ["1 ≤ pages.length ≤ 10⁴", "pages.length ≤ hours ≤ 10⁹", "1 ≤ pages[i] ≤ 10⁹"],
    hints: [
      "At speed k, book i takes ceil(pages[i] / k) hours. Faster speeds never take longer.",
      "So the answer is monotonic: binary search k between 1 and the largest book.",
    ],
    entry: {
      kind: "function",
      name: { js: "minReadingSpeed", py: "min_reading_speed" },
      params: [
        { name: "pages", type: "int[]" },
        { name: "hours", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "At 5 pages per hour the books take 1 + 2 + 2 = 5 hours. At 4 pages per hour they would take 1 + 3 + 3 = 7 hours, which is too slow.",
    },
    tests: [
      [[4, 9, 10], 5],
      [[12, 5, 8], 3],
      [[1], 1],
      [[100], 10],
      [[7, 7, 7], 20],
      [[1000000000], 2],
      [[5, 10, 15], 30],
      [[9, 2, 14, 6], 6],
    ],
    js: `
function minReadingSpeed(pages, hours) {
  let low = 1;
  let high = Math.max(...pages);
  while (low < high) {
    const speed = Math.floor((low + high) / 2);
    let needed = 0;
    for (const count of pages) needed += Math.ceil(count / speed);
    if (needed <= hours) high = speed;
    else low = speed + 1;
  }
  return low;
}`,
    py: `
def min_reading_speed(pages, hours):
    def hours_needed(speed):
        return sum((count + speed - 1) // speed for count in pages)

    lo, hi = 0, max(pages)  # lo is always too slow (or zero), hi always fast enough
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if hours_needed(mid) <= hours:
            hi = mid
        else:
            lo = mid
    return hi
`,
  },
  {
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "HARD",
    topics: ["BINARY_SEARCH"],
    leetcode: "https://leetcode.com/problems/median-of-two-sorted-arrays/",
    statement: `
You are given two lists \`first\` and \`second\`, each sorted in non-decreasing order. Imagine
merging them into one sorted list and return its **median**: the middle value, or the average
of the two middle values when the combined length is even.

The challenge is to do it in O(log(m + n)) time without actually merging.
`,
    constraints: [
      "0 ≤ first.length, second.length ≤ 1000",
      "1 ≤ first.length + second.length",
      "-10⁶ ≤ first[i], second[i] ≤ 10⁶",
    ],
    hints: [
      "Cut both lists so that the left parts together hold half the elements.",
      "A cut is correct when every value on the left is ≤ every value on the right; binary search the cut position in the shorter list.",
    ],
    entry: {
      kind: "function",
      name: { js: "findMedianSortedArrays", py: "find_median_sorted_arrays" },
      params: [
        { name: "first", type: "int[]" },
        { name: "second", type: "int[]" },
      ],
      returns: "float",
    },
    compare: "float",
    samples: 2,
    explanations: { 0: "Merged, the values are [1, 2, 4, 7, 9]; the middle one is 4." },
    tests: [
      [
        [1, 4],
        [2, 7, 9],
      ],
      [
        [2, 6],
        [3, 8],
      ],
      [[], [5]],
      [[-3, -1], []],
      [
        [1, 1, 1],
        [1, 1],
      ],
      [
        [10, 20, 30],
        [1, 2],
      ],
      [[0], [0]],
      [
        [1, 3, 5, 7],
        [2, 4, 6, 8, 9],
      ],
      [
        [-5, 3, 6, 12, 15],
        [-12, -10, -6, -3, 4, 10],
      ],
    ],
    js: `
function findMedianSortedArrays(first, second) {
  if (first.length > second.length) return findMedianSortedArrays(second, first);
  const m = first.length;
  const n = second.length;
  const half = Math.floor((m + n + 1) / 2);
  let low = 0;
  let high = m;
  while (low <= high) {
    const i = Math.floor((low + high) / 2);
    const j = half - i;
    const leftA = i > 0 ? first[i - 1] : -Infinity;
    const rightA = i < m ? first[i] : Infinity;
    const leftB = j > 0 ? second[j - 1] : -Infinity;
    const rightB = j < n ? second[j] : Infinity;
    if (leftA <= rightB && leftB <= rightA) {
      if ((m + n) % 2 === 1) return Math.max(leftA, leftB);
      return (Math.max(leftA, leftB) + Math.min(rightA, rightB)) / 2;
    }
    if (leftA > rightB) high = i - 1;
    else low = i + 1;
  }
  return 0;
}`,
    py: `
def find_median_sorted_arrays(first, second):
    merged = []
    i = j = 0
    while i < len(first) or j < len(second):
        if j >= len(second) or (i < len(first) and first[i] <= second[j]):
            merged.append(first[i])
            i += 1
        else:
            merged.append(second[j])
            j += 1
    total = len(merged)
    if total % 2 == 1:
        return float(merged[total // 2])
    return (merged[total // 2 - 1] + merged[total // 2]) / 2.0
`,
  },
];

export default problems;
