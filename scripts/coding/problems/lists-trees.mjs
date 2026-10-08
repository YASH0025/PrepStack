/** Linked lists, trees and tries. */

/* ---------------------------------------------------------------- test data helpers */

/** Inclusive integer range [from, to]. */
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Level order (with nulls, trailing nulls removed) of a tree of `{ val, left, right }`. */
function levelOrder(root) {
  const out = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) {
      out.push(null);
      continue;
    }
    out.push(node.val);
    queue.push(node.left, node.right);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

/** Height-balanced BST over sorted `values`, in level order. */
function balancedBst(values) {
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const mid = (lo + hi) >> 1;
    return { val: values[mid], left: build(lo, mid - 1), right: build(mid + 1, hi) };
  };
  return levelOrder(build(0, values.length - 1));
}

/** A tree where every node only has a left child: 1 → 2 → … → n. */
function leftChain(n) {
  const out = [1];
  for (let v = 2; v <= n; v++) out.push(v, null);
  out.pop(); // drop the trailing null so the level order is canonical
  return out;
}

/** Deterministic pseudo-random integers in [lo, hi]. */
function seeded(seed, count, lo, hi) {
  let x = seed;
  const out = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(lo + (x % (hi - lo + 1)));
  }
  return out;
}

const sortedRun = (seed, count, lo, hi) => seeded(seed, count, lo, hi).sort((a, b) => a - b);

/* -------------------------------------------------------------------------- problems */

const problems = [
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "EASY",
    topics: ["LINKED_LIST"],
    leetcode: "https://leetcode.com/problems/reverse-linked-list/",
    statement: `
You are given \`head\`, the first node of a singly linked list. Flip the direction of the
list so the last node comes first, and return the new head.

In the examples, a linked list is written as an array of its values from head to tail;
an empty list is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes ≤ 500", "-1000 ≤ Node.val ≤ 1000"],
    hints: [
      "Walk the list once, keeping track of the node you came from.",
      "For each node, remember its `next`, point it back at the previous node, then step forward.",
    ],
    entry: {
      kind: "function",
      name: { js: "reverseList", py: "reverse_list" },
      params: [{ name: "head", type: "ListNode" }],
      returns: "ListNode",
    },
    samples: 3,
    explanations: { 0: "Reading the list 2 → 4 → 6 → 8 backwards gives 8 → 6 → 4 → 2." },
    tests: [
      [[2, 4, 6, 8]],
      [[11, -3]],
      [[]],
      [[42]],
      [[-1, 0, -1]],
      [[5, 5, 5, 1]],
      [range(1, 300)],
      [seeded(7, 120, -1000, 1000)],
    ],
    js: `
function reverseList(head) {
  let prev = null;
  let current = head;
  while (current) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }
  return prev;
}`,
    py: `
def reverse_list(head):
    if head is None or head.next is None:
        return head
    new_head = None
    while head:
        head.next, new_head, head = new_head, head, head.next
    return new_head
`,
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    difficulty: "EASY",
    topics: ["LINKED_LIST"],
    leetcode: "https://leetcode.com/problems/merge-two-sorted-lists/",
    statement: `
You are given two linked lists, \`list1\` and \`list2\`, each already sorted in non-decreasing
order. Combine them into a single sorted linked list and return its head.

In the examples, each linked list is written as an array of its values from head to tail;
an empty list is \`[]\`.
`,
    constraints: [
      "0 ≤ number of nodes in each list ≤ 200",
      "-1000 ≤ Node.val ≤ 1000",
      "Both lists are sorted in non-decreasing order.",
    ],
    hints: [
      "Compare the two front nodes; the smaller one belongs next in the result.",
      "A dummy node in front of the result saves you from special-casing the first node.",
    ],
    entry: {
      kind: "function",
      name: { js: "mergeTwoLists", py: "merge_two_lists" },
      params: [
        { name: "list1", type: "ListNode" },
        { name: "list2", type: "ListNode" },
      ],
      returns: "ListNode",
    },
    samples: 2,
    explanations: {
      0: "Taking the smaller front value each time gives 1, 2, 3, 4, 6, 7.",
    },
    tests: [
      [
        [1, 4, 6],
        [2, 3, 7],
      ],
      [[], [0, 5]],
      [[], []],
      [[2], [1]],
      [
        [1, 1, 2],
        [1, 2, 2],
      ],
      [
        [-5, -3, 0],
        [-4, 10, 20, 30],
      ],
      [[8, 9, 10], []],
      [range(0, 99).map((i) => i * 2), range(0, 99).map((i) => i * 2 + 1)],
    ],
    js: `
function mergeTwoLists(list1, list2) {
  const dummy = new ListNode();
  let tail = dummy;
  let a = list1;
  let b = list2;
  while (a && b) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}`,
    py: `
def merge_two_lists(list1, list2):
    if list1 is None:
        return list2
    if list2 is None:
        return list1
    if list2.val < list1.val:
        list1, list2 = list2, list1
    head = list1
    while list1.next and list2:
        if list2.val < list1.next.val:
            list1.next, list2 = list2, list1.next
        list1 = list1.next
    if list1.next is None:
        list1.next = list2
    return head
`,
  },
  {
    slug: "remove-nth-node-from-end-of-list",
    title: "Remove Nth Node From End of List",
    difficulty: "MEDIUM",
    topics: ["LINKED_LIST", "TWO_POINTERS"],
    leetcode: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/",
    statement: `
You are given \`head\`, the first node of a linked list, and an integer \`n\`. Delete the node
that is \`n\` positions from the **end** of the list (\`n = 1\` means the last node) and return
the head of the resulting list.

In the examples, a linked list is written as an array of its values from head to tail.
`,
    constraints: ["1 ≤ number of nodes ≤ 500", "0 ≤ Node.val ≤ 1000", "1 ≤ n ≤ number of nodes"],
    hints: [
      "Counting the length first and then walking again works. Can you do it in one pass?",
      "Move a lead pointer `n` steps ahead, then advance two pointers together until the lead reaches the end.",
    ],
    entry: {
      kind: "function",
      name: { js: "removeNthFromEnd", py: "remove_nth_from_end" },
      params: [
        { name: "head", type: "ListNode" },
        { name: "n", type: "int" },
      ],
      returns: "ListNode",
    },
    samples: 3,
    explanations: { 0: "Counting from the end, 50 is 1st and 40 is 2nd, so 40 is removed." },
    tests: [
      [[10, 20, 30, 40, 50], 2],
      [[9], 1],
      [[1, 2], 2],
      [[4, 8], 1],
      [[3, 1, 4, 1, 5, 9], 6],
      [[3, 1, 4, 1, 5, 9], 1],
      [[7, 7, 7, 7], 3],
      [range(1, 400), 137],
    ],
    js: `
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let lead = dummy;
  let trail = dummy;
  for (let i = 0; i < n; i++) lead = lead.next;
  while (lead.next) {
    lead = lead.next;
    trail = trail.next;
  }
  trail.next = trail.next.next;
  return dummy.next;
}`,
    py: `
def remove_nth_from_end(head, n):
    length = 0
    node = head
    while node:
        length += 1
        node = node.next
    target = length - n
    if target == 0:
        return head.next
    node = head
    for _ in range(target - 1):
        node = node.next
    node.next = node.next.next
    return head
`,
  },
  {
    slug: "add-two-numbers",
    title: "Add Two Numbers",
    difficulty: "MEDIUM",
    topics: ["LINKED_LIST"],
    leetcode: "https://leetcode.com/problems/add-two-numbers/",
    statement: `
Two non-negative whole numbers are stored as linked lists \`l1\` and \`l2\`, one decimal digit
per node, with the **ones digit first**: the number 503 is stored as \`3 → 0 → 5\`, written
\`[3, 0, 5]\`. Neither number has leading zeros, except the number 0 itself.

Return their sum as a linked list in the same reversed-digit format.

In the examples, a linked list is written as an array of its values from head to tail.
`,
    constraints: [
      "1 ≤ number of nodes in each list ≤ 100",
      "0 ≤ Node.val ≤ 9",
      "No leading zeros, except for the number 0.",
    ],
    hints: [
      "The numbers can be far too long for a regular integer; add them digit by digit like on paper.",
      "Carry 1 into the next position when a digit sum reaches 10, and don't forget a final carry.",
    ],
    entry: {
      kind: "function",
      name: { js: "addTwoNumbers", py: "add_two_numbers" },
      params: [
        { name: "l1", type: "ListNode" },
        { name: "l2", type: "ListNode" },
      ],
      returns: "ListNode",
    },
    samples: 3,
    explanations: { 0: "The lists hold 361 and 85; 361 + 85 = 446, stored as [6, 4, 4]." },
    tests: [
      [
        [1, 6, 3],
        [5, 8],
      ],
      [[0], [0]],
      [[9, 9, 9], [1]],
      [[5], [5]],
      [[1, 8], [0]],
      [
        [7, 0, 8],
        [6, 9, 3, 2],
      ],
      [
        [9, 9, 9, 9, 9],
        [9, 9, 9, 9, 9, 9, 9, 9],
      ],
      [seeded(3, 99, 0, 9).concat([4]), seeded(11, 60, 0, 9).concat([8])],
    ],
    js: `
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode();
  let tail = dummy;
  let carry = 0;
  while (l1 || l2 || carry) {
    const sum = (l1 ? l1.val : 0) + (l2 ? l2.val : 0) + carry;
    carry = Math.floor(sum / 10);
    tail.next = new ListNode(sum % 10);
    tail = tail.next;
    l1 = l1 && l1.next;
    l2 = l2 && l2.next;
  }
  return dummy.next;
}`,
    py: `
def add_two_numbers(l1, l2):
    digits = []
    carry = 0
    a, b = l1, l2
    while a is not None or b is not None:
        total = carry
        if a is not None:
            total += a.val
            a = a.next
        if b is not None:
            total += b.val
            b = b.next
        carry, digit = divmod(total, 10)
        digits.append(digit)
    if carry:
        digits.append(carry)
    head = None
    for digit in reversed(digits):
        head = ListNode(digit, head)
    return head
`,
  },
  {
    slug: "merge-k-sorted-lists",
    title: "Merge k Sorted Lists",
    difficulty: "HARD",
    topics: ["LINKED_LIST", "HEAPS"],
    leetcode: "https://leetcode.com/problems/merge-k-sorted-lists/",
    statement: `
You are given \`lists\`, a collection of \`k\` sorted sequences. Each one is given as an
**array** of integers in non-decreasing order (some may be empty, and \`lists\` itself may be
empty). Merge all of them into one sorted **linked list** and return its head.

In the examples, the returned linked list is written as an array of its values from head
to tail; an empty list is \`[]\`.
`,
    constraints: [
      "0 ≤ k ≤ 50",
      "0 ≤ lists[i].length ≤ 100",
      "Total number of values ≤ 500",
      "-10⁴ ≤ lists[i][j] ≤ 10⁴",
      "Each lists[i] is sorted in non-decreasing order.",
    ],
    hints: [
      "Merging the lists one after another works but repeats a lot of work when k is large.",
      "Keep the current front of every list in a min-heap: pop the smallest, then push the next value from the same list.",
      "Alternatively, merge lists in pairs, halving their number each round.",
    ],
    entry: {
      kind: "function",
      name: { js: "mergeKLists", py: "merge_k_lists" },
      params: [{ name: "lists", type: "int[][]" }],
      returns: "ListNode",
    },
    samples: 2,
    explanations: {
      0: "All seven values in sorted order: 1, 2, 3, 4, 5, 9, 10.",
    },
    tests: [
      [[[1, 5, 9], [2, 3, 10], [4]]],
      [[]],
      [[[], []]],
      [[[1]]],
      [
        [
          [-3, 0, 0],
          [-3, -1],
          [0, 2],
        ],
      ],
      [[[1, 2, 3], [], [4, 5]]],
      [[[7, 7], [7], [7, 7, 7]]],
      [range(0, 19).map((i) => sortedRun(100 + i, 20, -10000, 10000))],
      [range(0, 49).map((i) => sortedRun(500 + i, i % 7, -50, 50))],
    ],
    js: `
function mergeKLists(lists) {
  // Min-heap of [value, listIndex, position].
  const heap = [];
  const less = (a, b) => a[0] < b[0];
  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!less(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < heap.length && less(heap[l], heap[smallest])) smallest = l;
        if (r < heap.length && less(heap[r], heap[smallest])) smallest = r;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  };

  lists.forEach((list, i) => {
    if (list.length > 0) push([list[0], i, 0]);
  });
  const dummy = new ListNode();
  let tail = dummy;
  while (heap.length > 0) {
    const [value, i, pos] = pop();
    tail.next = new ListNode(value);
    tail = tail.next;
    if (pos + 1 < lists[i].length) push([lists[i][pos + 1], i, pos + 1]);
  }
  return dummy.next;
}`,
    py: `
def merge_k_lists(lists):
    def merge(a, b):
        out = []
        i = j = 0
        while i < len(a) and j < len(b):
            if a[i] <= b[j]:
                out.append(a[i])
                i += 1
            else:
                out.append(b[j])
                j += 1
        out.extend(a[i:])
        out.extend(b[j:])
        return out

    pending = [list(x) for x in lists]
    if not pending:
        return None
    while len(pending) > 1:
        merged = []
        for k in range(0, len(pending), 2):
            if k + 1 < len(pending):
                merged.append(merge(pending[k], pending[k + 1]))
            else:
                merged.append(pending[k])
        pending = merged

    head = None
    for value in reversed(pending[0]):
        head = ListNode(value, head)
    return head
`,
  },
  {
    slug: "invert-binary-tree",
    title: "Invert Binary Tree",
    difficulty: "EASY",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/invert-binary-tree/",
    statement: `
You are given \`root\`, the root of a binary tree. Produce its **mirror image**: at every node,
the left and right subtrees trade places. Return the root of the mirrored tree.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child; an empty tree is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes ≤ 200", "-100 ≤ Node.val ≤ 100"],
    hints: [
      "Mirroring a tree means mirroring both subtrees and then swapping them.",
      "That recursion is three lines; a queue-based level walk works too.",
    ],
    entry: {
      kind: "function",
      name: { js: "invertTree", py: "invert_tree" },
      params: [{ name: "root", type: "TreeNode" }],
      returns: "TreeNode",
    },
    samples: 3,
    explanations: {
      0: "Each level is read in reverse: [3, 8] becomes [8, 3] and [1, 4, 7, 9] becomes [9, 7, 4, 1].",
    },
    tests: [
      [[5, 3, 8, 1, 4, 7, 9]],
      [[2, 1]],
      [[]],
      [[1]],
      [[1, 2, null, 3, null, 4]],
      [[1, null, 2, null, 3]],
      [[0, -5, 5, null, -2, 2, null, -3]],
      [range(1, 63)],
      [seeded(21, 150, -100, 100)],
    ],
    js: `
function invertTree(root) {
  if (!root) return null;
  const left = invertTree(root.left);
  const right = invertTree(root.right);
  root.left = right;
  root.right = left;
  return root;
}`,
    py: `
from collections import deque

def invert_tree(root):
    queue = deque([root] if root else [])
    while queue:
        node = queue.popleft()
        node.left, node.right = node.right, node.left
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    return root
`,
  },
  {
    slug: "maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    difficulty: "EASY",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/maximum-depth-of-binary-tree/",
    statement: `
Given \`root\`, the root of a binary tree, return its **depth**: the number of nodes on the
longest path from the root down to any leaf. An empty tree has depth \`0\`.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child; an empty tree is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes ≤ 200", "-1000 ≤ Node.val ≤ 1000"],
    hints: [
      "The depth of a tree is 1 plus the larger depth of its two subtrees.",
      "Without recursion, count how many levels a breadth-first walk visits.",
    ],
    entry: {
      kind: "function",
      name: { js: "maxDepth", py: "max_depth" },
      params: [{ name: "root", type: "TreeNode" }],
      returns: "int",
    },
    samples: 3,
    explanations: { 0: "The longest root-to-leaf paths, such as 5 → 8 → 7, contain 3 nodes." },
    tests: [
      [[5, 3, 8, null, null, 7, 9]],
      [[4, null, 9]],
      [[]],
      [[1]],
      [[1, 2, null, 3, null, 4, null, 5]],
      [[1, 2, 3, 4, null, null, 5, null, 6]],
      [range(1, 100)],
      [leftChain(150)],
    ],
    js: `
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
    py: `
def max_depth(root):
    depth = 0
    level = [root] if root else []
    while level:
        depth += 1
        level = [child for node in level for child in (node.left, node.right) if child]
    return depth
`,
  },
  {
    slug: "same-tree",
    title: "Same Tree",
    difficulty: "EASY",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/same-tree/",
    statement: `
You are given the roots of two binary trees, \`p\` and \`q\`. Return \`true\` if they are
identical — the same shape, with equal values in matching positions — and \`false\` otherwise.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child; an empty tree is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes in each tree ≤ 200", "-10⁴ ≤ Node.val ≤ 10⁴"],
    hints: [
      "Two trees match when their roots match and both pairs of subtrees match.",
      "Handle the cases where one or both nodes are missing first.",
    ],
    entry: {
      kind: "function",
      name: { js: "isSameTree", py: "is_same_tree" },
      params: [
        { name: "p", type: "TreeNode" },
        { name: "q", type: "TreeNode" },
      ],
      returns: "bool",
    },
    samples: 2,
    explanations: { 0: "Both trees have 7 at the root, 2 on the left and 9 on the right." },
    tests: [
      [
        [7, 2, 9],
        [7, 2, 9],
      ],
      [
        [3, 8],
        [3, null, 8],
      ],
      [[], []],
      [[], [0]],
      [
        [4, 2, 6],
        [4, 2, 7],
      ],
      [
        [1, 1],
        [1, null, 1],
      ],
      [[5], [5]],
      [range(1, 120), range(1, 120)],
      [range(1, 120), range(1, 119).concat([999])],
    ],
    js: `
function isSameTree(p, q) {
  if (!p || !q) return p === q;
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`,
    py: `
def is_same_tree(p, q):
    stack = [(p, q)]
    while stack:
        a, b = stack.pop()
        if a is None and b is None:
            continue
        if a is None or b is None or a.val != b.val:
            return False
        stack.append((a.left, b.left))
        stack.append((a.right, b.right))
    return True
`,
  },
  {
    slug: "binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    difficulty: "MEDIUM",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
    statement: `
Given \`root\`, the root of a binary tree, return its values grouped **by level**: one array
per level, from the root level downward, with each level's values listed left to right.
An empty tree gives \`[]\`.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child; an empty tree is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes ≤ 200", "-1000 ≤ Node.val ≤ 1000"],
    hints: [
      "A queue visits nodes in exactly the order you need.",
      "Before processing a level, note how many nodes are in the queue — that is the level's size.",
    ],
    entry: {
      kind: "function",
      name: { js: "levelOrder", py: "level_order" },
      params: [{ name: "root", type: "TreeNode" }],
      returns: "int[][]",
    },
    samples: 2,
    explanations: { 0: "Level 0 is [8], level 1 is [4, 12], and level 2 is [2, 6, 14]." },
    tests: [
      [[8, 4, 12, 2, 6, null, 14]],
      [[1]],
      [[]],
      [[1, 2, null, 3, null, 4]],
      [[0, -1, 1, null, -2, 2]],
      [[5, 5, 5, 5, null, null, 5]],
      [range(1, 31)],
      [seeded(44, 180, -1000, 1000)],
    ],
    js: `
function levelOrder(root) {
  const result = [];
  let queue = root ? [root] : [];
  while (queue.length > 0) {
    result.push(queue.map((node) => node.val));
    const next = [];
    for (const node of queue) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    queue = next;
  }
  return result;
}`,
    py: `
def level_order(root):
    levels = []

    def visit(node, depth):
        if node is None:
            return
        if depth == len(levels):
            levels.append([])
        levels[depth].append(node.val)
        visit(node.left, depth + 1)
        visit(node.right, depth + 1)

    visit(root, 0)
    return levels
`,
  },
  {
    slug: "validate-binary-search-tree",
    title: "Validate Binary Search Tree",
    difficulty: "MEDIUM",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/validate-binary-search-tree/",
    statement: `
Given \`root\`, the root of a binary tree, return \`true\` if it is a valid **binary search
tree** and \`false\` otherwise.

In a valid BST, for every node:

- every value in its left subtree is **strictly less** than the node's value, and
- every value in its right subtree is **strictly greater** than the node's value.

So a tree that contains the same value twice is **not** a valid BST. An empty tree counts as valid.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child; an empty tree is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes ≤ 200", "-2³¹ ≤ Node.val ≤ 2³¹ - 1"],
    hints: [
      "Checking only each node against its direct children is not enough — a deep descendant can break the rule.",
      "Pass down the open interval (low, high) each subtree's values must fall in.",
      "Or: an in-order walk of a valid BST produces strictly increasing values.",
    ],
    entry: {
      kind: "function",
      name: { js: "isValidBST", py: "is_valid_bst" },
      params: [{ name: "root", type: "TreeNode" }],
      returns: "bool",
    },
    samples: 2,
    explanations: {
      0: "Every left subtree holds smaller values and every right subtree holds larger values.",
    },
    tests: [
      [[5, 3, 8, 1, 4, 7, 9]],
      [[5, 3, 8, 1, 6]],
      [[1]],
      [[]],
      [[2, 2, 3]],
      [[-2147483648, null, 2147483647]],
      [[10, 5, 15, null, null, 6, 20]],
      [balancedBst(range(0, 126))],
      [balancedBst(range(0, 126).map((v) => (v === 90 ? 95 : v)))],
    ],
    js: `
function isValidBST(root) {
  const check = (node, low, high) => {
    if (!node) return true;
    if (node.val <= low || node.val >= high) return false;
    return check(node.left, low, node.val) && check(node.right, node.val, high);
  };
  return check(root, -Infinity, Infinity);
}`,
    py: `
def is_valid_bst(root):
    stack = []
    previous = None
    node = root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        if previous is not None and node.val <= previous:
            return False
        previous = node.val
        node = node.right
    return True
`,
  },
  {
    slug: "kth-smallest-element-in-a-bst",
    title: "Kth Smallest Element in a BST",
    difficulty: "MEDIUM",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/",
    statement: `
You are given \`root\`, the root of a binary search tree with distinct values, and an integer
\`k\`. Return the \`k\`-th smallest value in the tree, counting from \`1\` (so \`k = 1\` asks
for the minimum).

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child.
`,
    constraints: [
      "1 ≤ k ≤ number of nodes ≤ 200",
      "0 ≤ Node.val ≤ 10⁴",
      "The tree is a valid BST.",
    ],
    hints: [
      "Which traversal of a BST visits values in sorted order?",
      "Run an in-order traversal and stop as soon as you have visited k nodes.",
    ],
    entry: {
      kind: "function",
      name: { js: "kthSmallest", py: "kth_smallest" },
      params: [
        { name: "root", type: "TreeNode" },
        { name: "k", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: { 0: "In sorted order the values are 1, 3, 4, 5, 7, 8, 9; the 3rd is 4." },
    tests: [
      [[5, 3, 8, 1, 4, 7, 9], 3],
      [[2, 1, 3], 1],
      [[1], 1],
      [[3, 1, null, null, 2], 3],
      [[4, 2, 6, 1, 3, 5, 7], 7],
      [[10, null, 20, null, 30, null, 40], 2],
      [balancedBst(range(0, 149)), 100],
      [balancedBst(range(1, 180).map((v) => v * 7)), 1],
    ],
    js: `
function kthSmallest(root, k) {
  const stack = [];
  let node = root;
  while (node || stack.length > 0) {
    while (node) {
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    k -= 1;
    if (k === 0) return node.val;
    node = node.right;
  }
  return -1;
}`,
    py: `
def kth_smallest(root, k):
    values = []

    def walk(node):
        if node is None or len(values) >= k:
            return
        walk(node.left)
        if len(values) < k:
            values.append(node.val)
        walk(node.right)

    walk(root)
    return values[k - 1]
`,
  },
  {
    slug: "binary-tree-right-side-view",
    title: "Binary Tree Right Side View",
    difficulty: "MEDIUM",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/binary-tree-right-side-view/",
    statement: `
Picture standing to the right of the binary tree rooted at \`root\` and looking at it. On each
level you can only see the **rightmost** node. Return the values you can see, from the top
level to the bottom. An empty tree gives \`[]\`.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child; an empty tree is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes ≤ 200", "-1000 ≤ Node.val ≤ 1000"],
    hints: [
      "The visible node on each level is the last one a level-by-level walk reaches.",
      "With depth-first search, visit right children first and record the first node seen at each new depth.",
    ],
    entry: {
      kind: "function",
      name: { js: "rightSideView", py: "right_side_view" },
      params: [{ name: "root", type: "TreeNode" }],
      returns: "int[]",
    },
    samples: 2,
    explanations: {
      0: "The levels are [7], [3, 9], [1, 4] and [2]; the last node of each is 7, 9, 4, 2.",
    },
    tests: [
      [[7, 3, 9, 1, null, null, 4, null, 2]],
      [[1, 2]],
      [[]],
      [[5]],
      [[1, 2, 3, 4]],
      [[-1, -2, -3, null, -4, -5]],
      [range(1, 15)],
      [leftChain(120)],
    ],
    js: `
function rightSideView(root) {
  const view = [];
  let level = root ? [root] : [];
  while (level.length > 0) {
    view.push(level[level.length - 1].val);
    const next = [];
    for (const node of level) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    level = next;
  }
  return view;
}`,
    py: `
def right_side_view(root):
    seen = []
    stack = [(root, 0)] if root else []
    while stack:
        node, depth = stack.pop()
        if depth == len(seen):
            seen.append(node.val)
        if node.left:
            stack.append((node.left, depth + 1))
        if node.right:
            stack.append((node.right, depth + 1))
    return seen
`,
  },
  {
    slug: "diameter-of-binary-tree",
    title: "Diameter of Binary Tree",
    difficulty: "EASY",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/diameter-of-binary-tree/",
    statement: `
Given \`root\`, the root of a binary tree, return its **diameter**: the number of **edges** on
the longest path between any two nodes. The path does not have to pass through the root.
A tree with zero or one node has diameter \`0\`.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child; an empty tree is \`[]\`.
`,
    constraints: ["0 ≤ number of nodes ≤ 200", "-1000 ≤ Node.val ≤ 1000"],
    hints: [
      "Every path has a highest node. Through that node, its length is left height + right height.",
      "Compute heights bottom-up and update a running best at every node.",
    ],
    entry: {
      kind: "function",
      name: { js: "diameterOfBinaryTree", py: "diameter_of_binary_tree" },
      params: [{ name: "root", type: "TreeNode" }],
      returns: "int",
    },
    samples: 2,
    explanations: { 0: "The path 1 → 2 → 6 → 9 → 11 has 4 edges, and no path is longer." },
    tests: [
      [[6, 2, 9, 1, 4, null, 11]],
      [[5, 3]],
      [[1]],
      [[]],
      [[1, 2, null, 3, 4, 5, null, null, 6, 7, null, null, 8]],
      [[1, 2, 3, null, null, 4, 5, 6, null, null, 7, 8, null, null, 9]],
      [range(1, 127)],
      [leftChain(150)],
    ],
    js: `
function diameterOfBinaryTree(root) {
  let best = 0;
  const height = (node) => {
    if (!node) return 0;
    const left = height(node.left);
    const right = height(node.right);
    best = Math.max(best, left + right);
    return 1 + Math.max(left, right);
  };
  height(root);
  return best;
}`,
    py: `
def diameter_of_binary_tree(root):
    if root is None:
        return 0
    order = []
    stack = [root]
    while stack:
        node = stack.pop()
        order.append(node)
        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)
    depth = {None: 0}
    best = 0
    for node in reversed(order):
        left = depth[node.left]
        right = depth[node.right]
        best = max(best, left + right)
        depth[node] = 1 + max(left, right)
    return best
`,
  },
  {
    slug: "binary-tree-maximum-path-sum",
    title: "Binary Tree Maximum Path Sum",
    difficulty: "HARD",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/binary-tree-maximum-path-sum/",
    statement: `
A **path** in a binary tree is a sequence of nodes where each pair of neighbours is joined by
an edge, and no node appears twice. A path has at least one node and may start and end
anywhere — it does not need to include the root. Its **sum** is the total of its values.

Given \`root\`, the root of a non-empty binary tree, return the largest sum of any path.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child.
`,
    constraints: ["1 ≤ number of nodes ≤ 200", "-1000 ≤ Node.val ≤ 1000"],
    hints: [
      "Each path bends at one highest node, combining a downward branch on the left and one on the right.",
      "For each node compute the best downward branch that starts there; drop a child's branch if it is negative.",
      'Track the best "left branch + node + right branch" seen anywhere.',
    ],
    entry: {
      kind: "function",
      name: { js: "maxPathSum", py: "max_path_sum" },
      params: [{ name: "root", type: "TreeNode" }],
      returns: "int",
    },
    samples: 3,
    explanations: { 0: "The path 2 → -1 → 4 → 6 sums to 11; including -8 would only lower it." },
    tests: [
      [[4, -1, 6, 2, null, null, -8]],
      [[-5]],
      [[-3, -1, -2]],
      [[1, -2, 3]],
      [[5, -10, 4, null, null, 8, -1]],
      [[-10, 20, -30, 15, 25]],
      [[2, -1, -1, 3, 3, 3, 3]],
      [seeded(77, 200, -1000, 1000)],
      [range(1, 150).map((v) => (v % 3 === 0 ? -v : v))],
    ],
    js: `
function maxPathSum(root) {
  let best = -Infinity;
  const gain = (node) => {
    if (!node) return 0;
    const left = Math.max(0, gain(node.left));
    const right = Math.max(0, gain(node.right));
    best = Math.max(best, node.val + left + right);
    return node.val + Math.max(left, right);
  };
  gain(root);
  return best;
}`,
    py: `
def max_path_sum(root):
    order = []
    stack = [root]
    while stack:
        node = stack.pop()
        order.append(node)
        for child in (node.left, node.right):
            if child is not None:
                stack.append(child)
    down = {}
    best = root.val
    for node in reversed(order):
        left = max(down.get(node.left, 0), 0) if node.left else 0
        right = max(down.get(node.right, 0), 0) if node.right else 0
        best = max(best, node.val + left + right)
        down[node] = node.val + max(left, right)
    return best
`,
  },
  {
    slug: "lowest-common-ancestor-of-a-binary-search-tree",
    title: "Lowest Common Ancestor of a Binary Search Tree",
    difficulty: "MEDIUM",
    topics: ["TREES"],
    leetcode: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/",
    statement: `
You are given \`root\`, the root of a binary search tree with distinct values, and two values
\`p\` and \`q\` that both appear in the tree (they may be equal).

The **lowest common ancestor** of two nodes is the deepest node that has both of them in its
subtree — where a node counts as being in its own subtree.

Return the **value** of the lowest common ancestor of the nodes holding \`p\` and \`q\`.

Trees in the examples are written in level order (top to bottom, left to right), with
\`null\` marking a missing child.
`,
    constraints: [
      "1 ≤ number of nodes ≤ 200",
      "-10⁴ ≤ Node.val ≤ 10⁴",
      "All values are distinct and the tree is a valid BST.",
      "p and q are both values in the tree.",
    ],
    hints: [
      "Use the ordering: if both values are smaller than the current node, the answer is in the left subtree.",
      "The first node where p and q fall on different sides (or one equals the node) is the answer.",
    ],
    entry: {
      kind: "function",
      name: { js: "lowestCommonAncestor", py: "lowest_common_ancestor" },
      params: [
        { name: "root", type: "TreeNode" },
        { name: "p", type: "int" },
        { name: "q", type: "int" },
      ],
      returns: "int",
    },
    samples: 3,
    explanations: { 0: "1 and 4 are both in the subtree of 3, which is the deepest such node." },
    tests: [
      [[6, 3, 9, 1, 4, 8, 11], 1, 4],
      [[6, 3, 9, 1, 4, 8, 11], 4, 8],
      [[6, 3, 9, 1, 4, 8, 11], 3, 4],
      [[8, 3], 8, 3],
      [[5], 5, 5],
      [[10, null, 20, null, 30, 25], 25, 30],
      [[0, -50, 50, -75, -25, 25, 75], -75, -25],
      [balancedBst(range(0, 199)), 150, 160],
      [balancedBst(range(0, 199)), 3, 196],
    ],
    js: `
function lowestCommonAncestor(root, p, q) {
  let node = root;
  while (node) {
    if (p < node.val && q < node.val) node = node.left;
    else if (p > node.val && q > node.val) node = node.right;
    else return node.val;
  }
  return -1;
}`,
    py: `
def lowest_common_ancestor(root, p, q):
    low, high = min(p, q), max(p, q)

    def find(node):
        if high < node.val:
            return find(node.left)
        if low > node.val:
            return find(node.right)
        return node.val

    return find(root)
`,
  },
  {
    slug: "implement-trie-prefix-tree",
    title: "Implement Trie (Prefix Tree)",
    difficulty: "MEDIUM",
    topics: ["TRIES"],
    leetcode: "https://leetcode.com/problems/implement-trie-prefix-tree/",
    statement: `
A **trie** (prefix tree) stores strings so that lookups by whole word and by prefix are fast.
Implement the class \`Trie\`:

- \`constructor()\` creates an empty trie.
- \`insert(word)\` adds \`word\` to the trie.
- \`search(word)\` returns \`true\` if \`word\` was inserted before (as a whole word), else \`false\`.
- \`startsWith(prefix)\` returns \`true\` if some inserted word begins with \`prefix\`, else \`false\`.

**Test format:** \`operations\` lists the calls in order (the first is the constructor) and
\`arguments\` holds each call's arguments. The expected output has one entry per call:
\`null\` for the constructor and for \`insert\`.
`,
    constraints: [
      "1 ≤ word.length, prefix.length ≤ 2000",
      "Words and prefixes contain only lowercase English letters.",
      "At most 3 × 10⁴ calls in total.",
    ],
    hints: [
      "Each node holds a map from letter to child node, plus a flag saying whether a word ends there.",
      "search and startsWith walk the same path; they differ only in whether the end flag must be set.",
    ],
    entry: {
      kind: "class",
      className: "Trie",
      constructorParams: [],
      methods: [
        { name: "insert", params: [{ name: "word", type: "string" }], returns: "void" },
        { name: "search", params: [{ name: "word", type: "string" }], returns: "bool" },
        { name: "startsWith", params: [{ name: "prefix", type: "string" }], returns: "bool" },
      ],
    },
    samples: 1,
    explanations: {
      0: '"car" is only a prefix of "cart" until it is inserted itself; "cab" was never inserted and no word starts with "cab".',
    },
    tests: [
      [
        ["Trie", "insert", "search", "startsWith", "insert", "search", "search", "startsWith"],
        [[], ["cart"], ["car"], ["car"], ["car"], ["car"], ["cab"], ["cab"]],
      ],
      [
        ["Trie", "search", "startsWith"],
        [[], ["a"], ["a"]],
      ],
      [
        ["Trie", "insert", "search", "startsWith", "search"],
        [[], ["z"], ["z"], ["z"], ["zz"]],
      ],
      [
        ["Trie", "insert", "insert", "search", "search", "startsWith", "startsWith"],
        [[], ["note"], ["notebook"], ["note"], ["notes"], ["noteb"], ["notec"]],
      ],
      [
        ["Trie", "insert", "insert", "search", "startsWith", "search"],
        [[], ["apple"], ["apple"], ["apple"], ["apple"], ["app"]],
      ],
      [
        ["Trie", "insert", "insert", "insert", "startsWith", "startsWith", "search", "search"],
        [[], ["dog"], ["dot"], ["do"], ["d"], ["e"], ["do"], ["d"]],
      ],
      [
        ["Trie", "insert", "startsWith", "search", "startsWith"],
        [
          [],
          ["abcdefghij".repeat(20)],
          ["abcdefghij".repeat(19)],
          ["abcdefghij".repeat(19)],
          ["abcdefghij".repeat(21)],
        ],
      ],
    ],
    js: `
class Trie {
  constructor() {
    this.root = { children: new Map(), end: false };
  }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), end: false });
      node = node.children.get(ch);
    }
    node.end = true;
  }
  find(text) {
    let node = this.root;
    for (const ch of text) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }
  search(word) {
    const node = this.find(word);
    return node !== null && node.end;
  }
  startsWith(prefix) {
    return this.find(prefix) !== null;
  }
}`,
    py: `
class Trie:
    _END = "$"

    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node[Trie._END] = True

    def _walk(self, text):
        node = self.root
        for ch in text:
            if ch not in node:
                return None
            node = node[ch]
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and Trie._END in node

    def startsWith(self, prefix):
        return self._walk(prefix) is not None
`,
  },
  {
    slug: "design-add-and-search-words-data-structure",
    title: "Design Add and Search Words Data Structure",
    difficulty: "MEDIUM",
    topics: ["TRIES"],
    leetcode: "https://leetcode.com/problems/design-add-and-search-words-data-structure/",
    statement: `
Build a word store that supports simple wildcard searches. Implement the class
\`WordDictionary\`:

- \`constructor()\` creates an empty dictionary.
- \`addWord(word)\` stores \`word\`.
- \`search(word)\` returns \`true\` if some stored word matches \`word\` exactly, letter for
  letter and with the same length, where each \`.\` in \`word\` matches **any single letter**.
  Otherwise it returns \`false\`.

**Test format:** \`operations\` lists the calls in order (the first is the constructor) and
\`arguments\` holds each call's arguments. The expected output has one entry per call:
\`null\` for the constructor and for \`addWord\`.
`,
    constraints: [
      "1 ≤ word.length ≤ 25",
      "Stored words contain only lowercase English letters.",
      "Search patterns contain lowercase letters and at most 3 dots.",
      "At most 10⁴ calls in total.",
    ],
    hints: [
      "Store the words in a trie.",
      "A letter follows one edge; a dot has to try every child — depth-first search handles the branching.",
    ],
    entry: {
      kind: "class",
      className: "WordDictionary",
      constructorParams: [],
      methods: [
        { name: "addWord", params: [{ name: "word", type: "string" }], returns: "void" },
        { name: "search", params: [{ name: "word", type: "string" }], returns: "bool" },
      ],
    },
    samples: 1,
    explanations: {
      0: '"m.p" matches "map" and "mop"; "..." matches any stored 3-letter word; "m." is too short to match anything.',
    },
    tests: [
      [
        [
          "WordDictionary",
          "addWord",
          "addWord",
          "addWord",
          "search",
          "search",
          "search",
          "search",
          "search",
        ],
        [[], ["map"], ["mop"], ["mint"], ["m.p"], ["m..t"], ["..."], ["m."], ["mat"]],
      ],
      [
        ["WordDictionary", "search", "search"],
        [[], ["a"], ["."]],
      ],
      [
        ["WordDictionary", "addWord", "search", "search", "search"],
        [[], ["q"], ["."], ["q"], [".."]],
      ],
      [
        ["WordDictionary", "addWord", "addWord", "search", "search", "search", "search"],
        [[], ["bead"], ["bed"], ["be.d"], ["b.d"], ["be."], ["bead."]],
      ],
      [
        ["WordDictionary", "addWord", "addWord", "addWord", "search", "search", "search"],
        [[], ["xyz"], ["xya"], ["xbz"], ["x.z"], [".y."], ["..b"]],
      ],
      [
        ["WordDictionary", "addWord", "search", "addWord", "search", "search"],
        [[], ["stone"], ["st..es"], ["stones"], ["st..es"], ["s...e"]],
      ],
      [
        ["WordDictionary", "addWord", "addWord", "search", "search", "search"],
        [
          [],
          ["abcdefghijklmnopqrstuvwxy"],
          ["abcdefghijklmnopqrstuvwxz"],
          ["abcdefghijklmnopqrstuvwx."],
          ["a.cdefghijklmnopqrstu.wx."],
          ["abcdefghijklmnopqrstuvw.a"],
        ],
      ],
    ],
    js: `
class WordDictionary {
  constructor() {
    this.root = { children: {}, end: false };
  }
  addWord(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = { children: {}, end: false };
      node = node.children[ch];
    }
    node.end = true;
  }
  search(word) {
    const match = (node, i) => {
      if (i === word.length) return node.end;
      const ch = word[i];
      if (ch === ".") {
        return Object.values(node.children).some((child) => match(child, i + 1));
      }
      const child = node.children[ch];
      return child ? match(child, i + 1) : false;
    };
    return match(this.root, 0);
  }
}`,
    py: `
class WordDictionary:
    def __init__(self):
        self.children = {}
        self.terminal = False

    def addWord(self, word):
        node = self
        for ch in word:
            if ch not in node.children:
                node.children[ch] = WordDictionary()
            node = node.children[ch]
        node.terminal = True

    def search(self, word):
        frontier = [self]
        for ch in word:
            if ch == ".":
                frontier = [child for node in frontier for child in node.children.values()]
            else:
                frontier = [node.children[ch] for node in frontier if ch in node.children]
            if not frontier:
                return False
        return any(node.terminal for node in frontier)
`,
  },
];

export default problems;
