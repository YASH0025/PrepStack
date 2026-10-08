/** Graphs, backtracking and dynamic programming. */
const problems = [
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "MEDIUM",
    topics: ["GRAPHS"],
    leetcode: "https://leetcode.com/problems/number-of-islands/",
    statement: `
You are given a map \`grid\` where each cell is either \`"1"\` (land) or \`"0"\` (water).

An **island** is a group of land cells joined to each other horizontally or vertically
(diagonal neighbours do not count). Everything outside the grid is water.

Return how many separate islands the map contains.
`,
    constraints: ["1 ≤ rows, cols ≤ 30", 'grid[r][c] is "0" or "1"'],
    hints: [
      "Scan every cell. When you find land you have not visited yet, you have found a new island.",
      "From that cell, flood-fill (DFS or BFS) every connected land cell so it is not counted again.",
    ],
    entry: {
      kind: "function",
      name: { js: "numIslands", py: "num_islands" },
      params: [{ name: "grid", type: "string[][]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "The 2 × 2 block at the top is one island, the two stacked cells on the right edge are a second, and the single cells at the bottom left and bottom middle are a third and a fourth.",
    },
    tests: [
      [
        [
          ["0", "1", "1", "0", "0"],
          ["0", "1", "1", "0", "1"],
          ["0", "0", "0", "0", "1"],
          ["1", "0", "1", "0", "0"],
        ],
      ],
      [
        [
          ["1", "0", "1"],
          ["0", "1", "0"],
          ["1", "0", "1"],
        ],
      ],
      [[["0"]]],
      [[["1"]]],
      [
        [
          ["0", "0", "0"],
          ["0", "0", "0"],
        ],
      ],
      [
        [
          ["1", "1", "1", "1"],
          ["1", "0", "0", "1"],
          ["1", "0", "1", "1"],
          ["1", "1", "1", "0"],
        ],
      ],
      [
        [
          ["1", "0", "1", "0", "1", "0", "1"],
          ["1", "0", "1", "0", "1", "0", "1"],
          ["1", "1", "1", "0", "1", "1", "1"],
        ],
      ],
      [
        Array.from({ length: 30 }, (_, r) =>
          Array.from({ length: 30 }, (_, c) => ((r + c) % 3 === 0 ? "1" : "0")),
        ),
      ],
      [Array.from({ length: 30 }, () => Array.from({ length: 30 }, () => "1"))],
    ],
    js: `
function numIslands(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const seen = grid.map((row) => row.map(() => false));
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1" || seen[r][c]) continue;
      count++;
      const stack = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [y, x] = stack.pop();
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
          if (grid[ny][nx] !== "1" || seen[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push([ny, nx]);
        }
      }
    }
  }
  return count;
}`,
    py: `
from collections import deque

def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    visited = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in visited:
                islands += 1
                visited.add((r, c))
                queue = deque([(r, c)])
                while queue:
                    y, x = queue.popleft()
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == "1" and (ny, nx) not in visited:
                            visited.add((ny, nx))
                            queue.append((ny, nx))
    return islands
`,
  },
  {
    slug: "max-area-of-island",
    title: "Max Area of Island",
    difficulty: "MEDIUM",
    topics: ["GRAPHS"],
    leetcode: "https://leetcode.com/problems/max-area-of-island/",
    statement: `
You are given a map \`grid\` of integers where \`1\` is land and \`0\` is water. Land cells that
touch horizontally or vertically belong to the same island, and the **area** of an island is
the number of land cells in it.

Return the area of the largest island, or \`0\` if there is no land at all.
`,
    constraints: ["1 ≤ rows, cols ≤ 30", "grid[r][c] is 0 or 1"],
    hints: [
      "This is island counting with one change: measure each island while you flood-fill it.",
      "Have your DFS/BFS return (or accumulate) the number of cells it visited, and keep the maximum.",
    ],
    entry: {
      kind: "function",
      name: { js: "maxAreaOfIsland", py: "max_area_of_island" },
      params: [{ name: "grid", type: "int[][]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "The island in the top-left has 3 cells, the one on the right has 5 cells (an L shape), and the lone cell at the bottom has 1. The largest is 5.",
    },
    tests: [
      [
        [
          [1, 1, 0, 0, 1],
          [1, 0, 0, 0, 1],
          [0, 0, 0, 1, 1],
          [0, 1, 0, 1, 0],
        ],
      ],
      [
        [
          [0, 0],
          [0, 0],
        ],
      ],
      [[[1]]],
      [
        [
          [1, 0, 1, 0],
          [0, 1, 0, 1],
        ],
      ],
      [
        [
          [1, 1, 1],
          [1, 1, 1],
          [1, 1, 1],
        ],
      ],
      [
        [
          [1, 1, 0, 1, 1, 1],
          [0, 1, 0, 1, 0, 0],
          [0, 1, 1, 1, 0, 1],
          [0, 0, 0, 0, 0, 1],
        ],
      ],
      [[[0, 1, 1, 1, 0, 1, 1]]],
      [
        Array.from({ length: 30 }, (_, r) =>
          Array.from({ length: 30 }, (_, c) => (c === 15 || r === 7 ? 1 : 0)),
        ),
      ],
    ],
    js: `
function maxAreaOfIsland(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const seen = grid.map((row) => row.map(() => false));
  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1 || seen[r][c]) continue;
      let area = 0;
      const stack = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [y, x] = stack.pop();
        area++;
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
          if (grid[ny][nx] !== 1 || seen[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push([ny, nx]);
        }
      }
      best = Math.max(best, area);
    }
  }
  return best;
}`,
    py: `
def max_area_of_island(grid):
    rows, cols = len(grid), len(grid[0])
    seen = [[False] * cols for _ in range(rows)]

    def area_from(r, c):
        size = 0
        todo = [(r, c)]
        seen[r][c] = True
        while todo:
            y, x = todo.pop()
            size += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == 1 and not seen[ny][nx]:
                    seen[ny][nx] = True
                    todo.append((ny, nx))
        return size

    best = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1 and not seen[r][c]:
                best = max(best, area_from(r, c))
    return best
`,
  },
  {
    slug: "rotting-oranges",
    title: "Rotting Oranges",
    difficulty: "MEDIUM",
    topics: ["GRAPHS"],
    leetcode: "https://leetcode.com/problems/rotting-oranges/",
    statement: `
A crate is described by \`grid\`, where each cell holds:

- \`0\`: an empty spot,
- \`1\`: a fresh orange,
- \`2\`: a rotten orange.

Every minute, each rotten orange spoils the fresh oranges directly above, below, left and
right of it. Return the number of minutes until no fresh orange is left. If some fresh orange
can never be reached, return \`-1\`. If there are no fresh oranges to begin with, the answer is \`0\`.
`,
    constraints: ["1 ≤ rows, cols ≤ 30", "grid[r][c] is 0, 1 or 2"],
    hints: [
      "All rotten oranges spread at the same time, so start a breadth-first search from all of them at once.",
      "Process the queue one level (minute) at a time and count the fresh oranges you convert. Anything left fresh at the end is unreachable.",
    ],
    entry: {
      kind: "function",
      name: { js: "orangesRotting", py: "oranges_rotting" },
      params: [{ name: "grid", type: "int[][]" }],
      returns: "int",
    },
    samples: 3,
    explanations: {
      0: "Minute 1 spoils (0,1) and (1,0); minute 2 spoils (1,1) and (2,0); minute 3 spoils (2,1); minute 4 spoils (2,2). No fresh oranges remain after 4 minutes.",
    },
    tests: [
      [
        [
          [2, 1, 0],
          [1, 1, 0],
          [1, 1, 1],
        ],
      ],
      [
        [
          [2, 0, 1],
          [0, 0, 1],
        ],
      ],
      [[[0, 2, 0]]],
      [[[1]]],
      [[[0]]],
      [[[2, 1, 1, 1, 1, 1, 2]]],
      [
        [
          [1, 1, 1],
          [1, 2, 1],
          [1, 1, 1],
        ],
      ],
      [
        [
          [2, 1, 1, 0],
          [0, 0, 1, 0],
          [1, 1, 1, 0],
          [1, 0, 0, 2],
        ],
      ],
      [
        Array.from({ length: 30 }, (_, r) =>
          Array.from({ length: 30 }, (_, c) => (r === 0 && c === 0 ? 2 : 1)),
        ),
      ],
    ],
    js: `
function orangesRotting(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const state = grid.map((row) => row.slice());
  let fresh = 0;
  let frontier = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (state[r][c] === 1) fresh++;
      else if (state[r][c] === 2) frontier.push([r, c]);
    }
  }
  let minutes = 0;
  while (fresh > 0 && frontier.length) {
    const next = [];
    for (const [y, x] of frontier) {
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < 0 || nx < 0 || ny >= rows || nx >= cols || state[ny][nx] !== 1) continue;
        state[ny][nx] = 2;
        fresh--;
        next.push([ny, nx]);
      }
    }
    frontier = next;
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}`,
    py: `
from collections import deque

def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    time_at = {}
    queue = deque()
    fresh = set()
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                time_at[(r, c)] = 0
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh.add((r, c))
    latest = 0
    while queue:
        y, x = queue.popleft()
        for cell in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if cell in fresh and cell not in time_at:
                time_at[cell] = time_at[(y, x)] + 1
                latest = max(latest, time_at[cell])
                queue.append(cell)
    if any(cell not in time_at for cell in fresh):
        return -1
    return latest
`,
  },
  {
    slug: "course-schedule",
    title: "Course Schedule",
    difficulty: "MEDIUM",
    topics: ["GRAPHS"],
    leetcode: "https://leetcode.com/problems/course-schedule/",
    statement: `
A program has \`numCourses\` courses, numbered \`0\` to \`numCourses - 1\`. Each entry
\`[a, b]\` in \`prerequisites\` means course \`b\` must be finished before course \`a\` can be taken.

Return \`true\` if there is some order in which every course can be completed, and \`false\`
if the requirements make that impossible.
`,
    constraints: [
      "1 ≤ numCourses ≤ 1000",
      "0 ≤ prerequisites.length ≤ 2000",
      "0 ≤ a, b < numCourses",
      "No pair appears twice.",
    ],
    hints: [
      "Model courses as nodes and prerequisites as directed edges. When is it impossible to finish?",
      "It is impossible exactly when the graph has a cycle. Detect it with Kahn's algorithm (repeatedly take courses with no remaining prerequisites) or with a three-colour DFS.",
    ],
    entry: {
      kind: "function",
      name: { js: "canFinish", py: "can_finish" },
      params: [
        { name: "numCourses", type: "int" },
        { name: "prerequisites", type: "int[][]" },
      ],
      returns: "bool",
    },
    samples: 2,
    explanations: {
      0: "Take course 0, then 1, then 2, then 3. Every prerequisite is satisfied along the way.",
    },
    tests: [
      [
        4,
        [
          [1, 0],
          [2, 1],
          [3, 2],
        ],
      ],
      [
        3,
        [
          [0, 1],
          [1, 2],
          [2, 0],
        ],
      ],
      [1, []],
      [2, [[0, 0]]],
      [5, []],
      [
        3,
        [
          [2, 1],
          [1, 2],
        ],
      ],
      [
        6,
        [
          [1, 0],
          [2, 0],
          [3, 1],
          [3, 2],
          [4, 3],
          [5, 4],
        ],
      ],
      [
        6,
        [
          [1, 0],
          [2, 1],
          [3, 2],
          [1, 3],
          [5, 4],
        ],
      ],
      [1000, Array.from({ length: 999 }, (_, i) => [i + 1, i])],
      [1000, Array.from({ length: 1000 }, (_, i) => [(i + 1) % 1000, i])],
    ],
    js: `
function canFinish(numCourses, prerequisites) {
  const next = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [course, before] of prerequisites) {
    next[before].push(course);
    indegree[course]++;
  }
  const ready = [];
  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) ready.push(i);
  let taken = 0;
  while (ready.length) {
    const course = ready.pop();
    taken++;
    for (const after of next[course]) {
      if (--indegree[after] === 0) ready.push(after);
    }
  }
  return taken === numCourses;
}`,
    py: `
def can_finish(num_courses, prerequisites):
    needs = [[] for _ in range(num_courses)]
    for course, before in prerequisites:
        needs[course].append(before)
    WHITE, GREY, BLACK = 0, 1, 2
    colour = [WHITE] * num_courses
    for start in range(num_courses):
        if colour[start] != WHITE:
            continue
        colour[start] = GREY
        stack = [(start, iter(needs[start]))]
        while stack:
            node, children = stack[-1]
            advanced = False
            for child in children:
                if colour[child] == GREY:
                    return False
                if colour[child] == WHITE:
                    colour[child] = GREY
                    stack.append((child, iter(needs[child])))
                    advanced = True
                    break
            if not advanced:
                colour[node] = BLACK
                stack.pop()
    return True
`,
  },
  {
    slug: "course-schedule-ii",
    title: "Course Schedule II",
    difficulty: "MEDIUM",
    topics: ["GRAPHS"],
    leetcode: "https://leetcode.com/problems/course-schedule-ii/",
    statement: `
There are \`numCourses\` courses numbered \`0\` to \`numCourses - 1\`. Each pair \`[a, b]\` in
\`prerequisites\` says course \`b\` has to be completed before course \`a\`.

Return an order in which all courses can be taken. If the prerequisites contain a cycle so
that no order works, return an empty list \`[]\`.

In every test here, the prerequisites allow **at most one** valid order, so your answer must
match it exactly.
`,
    constraints: [
      "1 ≤ numCourses ≤ 1000",
      "0 ≤ prerequisites.length ≤ 2000",
      "0 ≤ a, b < numCourses",
      "No pair appears twice; at most one valid order exists.",
    ],
    hints: [
      "Topological sort: a course can be taken once all of its prerequisites have been taken.",
      "Kahn's algorithm: keep a queue of courses whose remaining prerequisite count is zero and append them to the answer as you pop them. If the answer ends up shorter than numCourses, there is a cycle.",
    ],
    entry: {
      kind: "function",
      name: { js: "findOrder", py: "find_order" },
      params: [
        { name: "numCourses", type: "int" },
        { name: "prerequisites", type: "int[][]" },
      ],
      returns: "int[]",
    },
    samples: 3,
    explanations: {
      0: "Course 2 has no prerequisites, course 0 needs 2, and course 1 needs both 0 and 2, so the only valid order is 2, 0, 1.",
    },
    tests: [
      [
        3,
        [
          [0, 2],
          [1, 0],
          [1, 2],
        ],
      ],
      [
        2,
        [
          [0, 1],
          [1, 0],
        ],
      ],
      [1, []],
      [2, [[0, 1]]],
      [
        5,
        [
          [4, 3],
          [3, 2],
          [2, 1],
          [1, 0],
          [4, 0],
          [3, 1],
        ],
      ],
      [
        4,
        [
          [1, 0],
          [2, 1],
          [3, 2],
          [1, 3],
        ],
      ],
      [
        6,
        [
          [0, 5],
          [3, 0],
          [1, 3],
          [4, 1],
          [2, 4],
          [2, 5],
          [4, 0],
        ],
      ],
      [
        3,
        [
          [1, 1],
          [2, 1],
        ],
      ],
      [500, Array.from({ length: 499 }, (_, i) => [499 - i - 1, 499 - i])],
    ],
    js: `
function findOrder(numCourses, prerequisites) {
  const next = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [course, before] of prerequisites) {
    next[before].push(course);
    indegree[course]++;
  }
  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) queue.push(i);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const course = queue[head];
    order.push(course);
    for (const after of next[course]) {
      if (--indegree[after] === 0) queue.push(after);
    }
  }
  return order.length === numCourses ? order : [];
}`,
    py: `
def find_order(num_courses, prerequisites):
    needs = [set() for _ in range(num_courses)]
    for course, before in prerequisites:
        needs[course].add(before)
    state = [0] * num_courses  # 0 = new, 1 = in progress, 2 = done
    order = []
    for start in range(num_courses):
        if state[start]:
            continue
        stack = [(start, False)]
        while stack:
            node, finished = stack.pop()
            if finished:
                state[node] = 2
                order.append(node)
                continue
            if state[node] == 2:
                continue
            if state[node] == 1:
                return []
            state[node] = 1
            stack.append((node, True))
            for before in needs[node]:
                if state[before] == 1:
                    return []
                if state[before] == 0:
                    stack.append((before, False))
    return order
`,
  },
  {
    slug: "number-of-connected-components-in-an-undirected-graph",
    title: "Number of Connected Components in an Undirected Graph",
    difficulty: "MEDIUM",
    topics: ["GRAPHS"],
    leetcode: null,
    statement: `
A network has \`n\` nodes labelled \`0\` to \`n - 1\`. Each pair \`[u, v]\` in \`edges\` is an
undirected link between nodes \`u\` and \`v\`.

Two nodes are in the same **component** if you can travel from one to the other along links.
Return the number of components in the network. A node with no links forms a component on its own.
`,
    constraints: [
      "1 ≤ n ≤ 1000",
      "0 ≤ edges.length ≤ 2000",
      "0 ≤ u, v < n, u ≠ v",
      "No duplicate edges.",
    ],
    hints: [
      "Start with n separate groups; every edge may merge two of them.",
      "Union-find: each successful union of two different roots reduces the component count by one. A BFS/DFS from every unvisited node works too.",
    ],
    entry: {
      kind: "function",
      name: { js: "countComponents", py: "count_components" },
      params: [
        { name: "n", type: "int" },
        { name: "edges", type: "int[][]" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Nodes 0, 1 and 2 are linked together, nodes 3 and 4 are linked together, and node 5 stands alone: 3 components.",
    },
    tests: [
      [
        6,
        [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
      ],
      [
        4,
        [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ],
      ],
      [1, []],
      [5, []],
      [2, [[1, 0]]],
      [
        7,
        [
          [0, 6],
          [6, 3],
          [2, 5],
          [1, 4],
          [4, 2],
        ],
      ],
      [
        8,
        [
          [0, 1],
          [2, 3],
          [4, 5],
          [6, 7],
          [1, 3],
          [5, 7],
        ],
      ],
      [1000, Array.from({ length: 500 }, (_, i) => [i, i + 500])],
      [1000, Array.from({ length: 999 }, (_, i) => [i, i + 1])],
    ],
    js: `
function countComponents(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let components = n;
  for (const [u, v] of edges) {
    const a = find(u);
    const b = find(v);
    if (a !== b) {
      parent[a] = b;
      components--;
    }
  }
  return components;
}`,
    py: `
def count_components(n, edges):
    neighbours = [[] for _ in range(n)]
    for u, v in edges:
        neighbours[u].append(v)
        neighbours[v].append(u)
    visited = [False] * n
    count = 0
    for node in range(n):
        if visited[node]:
            continue
        count += 1
        visited[node] = True
        stack = [node]
        while stack:
            cur = stack.pop()
            for nxt in neighbours[cur]:
                if not visited[nxt]:
                    visited[nxt] = True
                    stack.append(nxt)
    return count
`,
  },
  {
    slug: "word-search",
    title: "Word Search",
    difficulty: "MEDIUM",
    topics: ["BACKTRACKING", "GRAPHS"],
    leetcode: "https://leetcode.com/problems/word-search/",
    statement: `
You are given a letter grid \`board\` and a string \`word\`.

Return \`true\` if \`word\` can be spelled by a path through the grid that starts at any cell
and moves one step up, down, left or right for each next letter. A path may not use the same
cell twice. Otherwise return \`false\`.
`,
    constraints: [
      "1 ≤ rows, cols ≤ 6",
      "1 ≤ word.length ≤ 15",
      "board and word contain only English letters (case matters).",
    ],
    hints: [
      "Try every cell as the starting point and extend the path letter by letter with DFS.",
      "Mark a cell as used while it is on the current path and unmark it when you backtrack.",
    ],
    entry: {
      kind: "function",
      name: { js: "exist", py: "exist" },
      params: [
        { name: "board", type: "string[][]" },
        { name: "word", type: "string" },
      ],
      returns: "bool",
    },
    samples: 3,
    explanations: {
      0: "Start at the T in the top-left, go right to R, down to E and right to E: T → R → E → E.",
    },
    tests: [
      [
        [
          ["T", "R", "A", "P"],
          ["O", "E", "E", "S"],
          ["N", "M", "L", "K"],
        ],
        "TREE",
      ],
      [
        [
          ["T", "R", "A", "P"],
          ["O", "E", "E", "S"],
          ["N", "M", "L", "K"],
        ],
        "TRAPT",
      ],
      [
        [
          ["T", "R", "A", "P"],
          ["O", "E", "E", "S"],
          ["N", "M", "L", "K"],
        ],
        "SEEK",
      ],
      [[["z"]], "z"],
      [[["z"]], "zz"],
      [
        [
          ["a", "b"],
          ["d", "c"],
        ],
        "abcda",
      ],
      [
        [
          ["a", "b"],
          ["d", "c"],
        ],
        "dabc",
      ],
      [
        [
          ["A", "A", "A"],
          ["A", "A", "A"],
          ["A", "A", "A"],
        ],
        "AAAAAAAAAB",
      ],
      [
        [
          ["C", "a", "t"],
          ["x", "c", "A"],
        ],
        "Cat",
      ],
      [
        [
          ["C", "a", "t"],
          ["x", "c", "A"],
        ],
        "cat",
      ],
    ],
    js: `
function exist(board, word) {
  const rows = board.length;
  const cols = board[0].length;
  const used = board.map((row) => row.map(() => false));
  const search = (r, c, i) => {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    if (used[r][c] || board[r][c] !== word[i]) return false;
    used[r][c] = true;
    const found =
      search(r + 1, c, i + 1) || search(r - 1, c, i + 1) || search(r, c + 1, i + 1) || search(r, c - 1, i + 1);
    used[r][c] = false;
    return found;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (search(r, c, 0)) return true;
    }
  }
  return false;
}`,
    py: `
def exist(board, word):
    rows, cols = len(board), len(board[0])
    path = set()

    def walk(r, c, k):
        if board[r][c] != word[k]:
            return False
        if k == len(word) - 1:
            return True
        path.add((r, c))
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in path:
                if walk(nr, nc, k + 1):
                    path.discard((r, c))
                    return True
        path.discard((r, c))
        return False

    return any(walk(r, c, 0) for r in range(rows) for c in range(cols))
`,
  },
  {
    slug: "subsets",
    title: "Subsets",
    difficulty: "MEDIUM",
    topics: ["BACKTRACKING"],
    leetcode: "https://leetcode.com/problems/subsets/",
    statement: `
Given a list \`nums\` of **distinct** integers, return every possible subset of it (its power
set), including the empty subset and \`nums\` itself.

You may return the subsets in any order, and the numbers inside each subset in any order.
`,
    constraints: ["0 ≤ nums.length ≤ 10", "-10 ≤ nums[i] ≤ 10", "All values are distinct."],
    hints: [
      "Each element is either in a subset or not, so there are 2ⁿ subsets.",
      "Backtrack over the indexes: at each index, branch once without the element and once with it.",
    ],
    entry: {
      kind: "function",
      name: { js: "subsets", py: "subsets" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int[][]",
    },
    compare: "unordered-nested",
    samples: 2,
    explanations: {
      0: "With 3 numbers there are 2³ = 8 subsets: the empty one, three singletons, three pairs and the full list.",
    },
    tests: [
      [[4, 7, 9]],
      [[-2]],
      [[]],
      [[0, 1]],
      [[5, -5, 0, 3]],
      [[1, 2, 3, 4, 5]],
      [[10, -10, 9, -9, 8, -8, 7, -7, 6, -6]],
    ],
    js: `
function subsets(nums) {
  const result = [];
  const current = [];
  const build = (start) => {
    result.push(current.slice());
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      build(i + 1);
      current.pop();
    }
  };
  build(0);
  return result;
}`,
    py: `
def subsets(nums):
    result = [[]]
    for value in nums:
        result += [existing + [value] for existing in result]
    return result
`,
  },
  {
    slug: "permutations",
    title: "Permutations",
    difficulty: "MEDIUM",
    topics: ["BACKTRACKING"],
    leetcode: "https://leetcode.com/problems/permutations/",
    statement: `
Given a list \`nums\` of **distinct** integers, return every way to arrange all of them in a row
(every permutation).

The permutations may be listed in any order, but each permutation is itself an ordered list.
`,
    constraints: ["1 ≤ nums.length ≤ 6", "-10 ≤ nums[i] ≤ 10", "All values are distinct."],
    hints: [
      "Build the arrangement one position at a time, choosing any number not used yet.",
      "Track used numbers with a boolean array (or swap elements into place) and undo the choice after recursing.",
    ],
    entry: {
      kind: "function",
      name: { js: "permute", py: "permute" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int[][]",
    },
    compare: "unordered",
    samples: 2,
    explanations: {
      0: "Three distinct numbers can be ordered in 3! = 6 ways.",
    },
    tests: [
      [[5, 6, 7]],
      [[8]],
      [[0, -1]],
      [[3, 1, 2, 0]],
      [[-10, 10, 0, 5, -5]],
      [[1, 2, 3, 4, 5, 6]],
    ],
    js: `
function permute(nums) {
  const result = [];
  const current = [];
  const used = new Array(nums.length).fill(false);
  const build = () => {
    if (current.length === nums.length) {
      result.push(current.slice());
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(nums[i]);
      build();
      current.pop();
      used[i] = false;
    }
  };
  build();
  return result;
}`,
    py: `
def permute(nums):
    if len(nums) <= 1:
        return [list(nums)]
    result = []
    for i, first in enumerate(nums):
        rest = nums[:i] + nums[i + 1:]
        for tail in permute(rest):
            result.append([first] + tail)
    return result
`,
  },
  {
    slug: "combination-sum",
    title: "Combination Sum",
    difficulty: "MEDIUM",
    topics: ["BACKTRACKING"],
    leetcode: "https://leetcode.com/problems/combination-sum/",
    statement: `
You have an unlimited supply of each value in \`candidates\` (all distinct and positive). Find
every combination of these values whose sum is exactly \`target\`. A value may be used any number
of times in a combination.

Two combinations are the same if they use each value the same number of times, so list each
combination only once. Return them in any order; the numbers inside a combination may be in any
order too. If no combination works, return an empty list.
`,
    constraints: [
      "1 ≤ candidates.length ≤ 20",
      "1 ≤ candidates[i] ≤ 40, all distinct",
      "1 ≤ target ≤ 30",
    ],
    hints: [
      "To avoid listing the same combination twice, only allow choosing candidates at or after the index of the last one you picked.",
      "Recurse with the remaining amount; stop a branch as soon as the remaining amount goes negative (sorting first lets you break early).",
    ],
    entry: {
      kind: "function",
      name: { js: "combinationSum", py: "combination_sum" },
      params: [
        { name: "candidates", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returns: "int[][]",
    },
    compare: "unordered-nested",
    samples: 3,
    explanations: {
      0: "12 can be made as 6 + 6, as 2 + 5 + 5, as 2 + 2 + 2 + 6 and as 2 + 2 + 2 + 2 + 2 + 2. No other mix of 2, 5 and 6 reaches 12.",
    },
    tests: [
      [[5, 2, 6], 12],
      [[4], 6],
      [[7, 1], 7],
      [[1], 1],
      [[9, 10], 3],
      [[3, 4, 6], 12],
      [[6, 2, 11, 5], 15],
      [[1, 2], 6],
      [[8, 12, 20, 40], 30],
    ],
    js: `
function combinationSum(candidates, target) {
  const sorted = candidates.slice().sort((a, b) => a - b);
  const result = [];
  const current = [];
  const build = (start, remaining) => {
    if (remaining === 0) {
      result.push(current.slice());
      return;
    }
    for (let i = start; i < sorted.length && sorted[i] <= remaining; i++) {
      current.push(sorted[i]);
      build(i, remaining - sorted[i]);
      current.pop();
    }
  };
  build(0, target);
  return result;
}`,
    py: `
def combination_sum(candidates, target):
    # ways[t] holds every combination (non-decreasing in candidate order) summing to t
    ways = [[] for _ in range(target + 1)]
    ways[0] = [[]]
    for value in candidates:
        for total in range(value, target + 1):
            for combo in ways[total - value]:
                ways[total].append(combo + [value])
    return ways[target]
`,
  },
  {
    slug: "generate-parentheses",
    title: "Generate Parentheses",
    difficulty: "MEDIUM",
    topics: ["BACKTRACKING"],
    leetcode: "https://leetcode.com/problems/generate-parentheses/",
    statement: `
Given an integer \`n\`, return every string made of \`n\` opening brackets \`(\` and \`n\` closing
brackets \`)\` that is **balanced**: reading left to right, the number of \`)\` never exceeds the
number of \`(\` seen so far, and the totals are equal at the end.

The strings may be returned in any order.
`,
    constraints: ["1 ≤ n ≤ 7"],
    hints: [
      "Build the string one character at a time instead of generating every arrangement and filtering.",
      'You may add "(" while fewer than n have been used, and ")" only while it would not exceed the number of "(" so far.',
    ],
    entry: {
      kind: "function",
      name: { js: "generateParenthesis", py: "generate_parenthesis" },
      params: [{ name: "n", type: "int" }],
      returns: "string[]",
    },
    compare: "unordered",
    samples: 2,
    explanations: {
      0: 'With two pairs, the only balanced strings are "(())" (nested) and "()()" (side by side).',
    },
    tests: [[2], [1], [3], [4], [5], [6], [7]],
    js: `
function generateParenthesis(n) {
  const result = [];
  const build = (text, open, close) => {
    if (text.length === 2 * n) {
      result.push(text);
      return;
    }
    if (open < n) build(text + "(", open + 1, close);
    if (close < open) build(text + ")", open, close + 1);
  };
  build("", 0, 0);
  return result;
}`,
    py: `
from functools import lru_cache

def generate_parenthesis(n):
    @lru_cache(maxsize=None)
    def balanced(k):
        if k == 0:
            return ("",)
        out = []
        for inside in range(k):
            for a in balanced(inside):
                for b in balanced(k - 1 - inside):
                    out.append("(" + a + ")" + b)
        return tuple(out)

    return list(balanced(n))
`,
  },
  {
    slug: "n-queens",
    title: "N-Queens",
    difficulty: "HARD",
    topics: ["BACKTRACKING"],
    leetcode: "https://leetcode.com/problems/n-queens/",
    statement: `
Place \`n\` chess queens on an \`n × n\` board so that no two queens attack each other: no two
share a row, a column or a diagonal.

Return every such placement. Describe each placement as a list of \`n\` strings, one per row from
top to bottom, where \`"Q"\` marks a queen and \`"."\` an empty square. The placements may be
returned in any order. If there is no placement, return an empty list.
`,
    constraints: ["1 ≤ n ≤ 7"],
    hints: [
      "Every row holds exactly one queen, so decide the column for row 0, then row 1, and so on.",
      'Keep sets of used columns, used "row - col" diagonals and used "row + col" anti-diagonals so each check is O(1).',
    ],
    entry: {
      kind: "function",
      name: { js: "solveNQueens", py: "solve_n_queens" },
      params: [{ name: "n", type: "int" }],
      returns: "string[][]",
    },
    compare: "unordered",
    samples: 2,
    explanations: {
      0: "On a 4 × 4 board there are exactly two safe placements, and they are mirror images of each other.",
    },
    tests: [[4], [1], [2], [3], [5], [6], [7]],
    js: `
function solveNQueens(n) {
  const result = [];
  const cols = new Set();
  const diag = new Set();
  const anti = new Set();
  const placed = [];
  const place = (row) => {
    if (row === n) {
      result.push(placed.map((c) => ".".repeat(c) + "Q" + ".".repeat(n - c - 1)));
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diag.has(row - c) || anti.has(row + c)) continue;
      cols.add(c);
      diag.add(row - c);
      anti.add(row + c);
      placed.push(c);
      place(row + 1);
      placed.pop();
      cols.delete(c);
      diag.delete(row - c);
      anti.delete(row + c);
    }
  };
  place(0);
  return result;
}`,
    py: `
from itertools import permutations

def solve_n_queens(n):
    solutions = []
    for columns in permutations(range(n)):
        if len({r + c for r, c in enumerate(columns)}) != n:
            continue
        if len({r - c for r, c in enumerate(columns)}) != n:
            continue
        board = []
        for c in columns:
            row = ["."] * n
            row[c] = "Q"
            board.append("".join(row))
        solutions.append(board)
    return solutions
`,
  },
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "EASY",
    topics: ["DYNAMIC_PROGRAMMING"],
    leetcode: "https://leetcode.com/problems/climbing-stairs/",
    statement: `
A staircase has \`n\` steps. With each move you climb either **1** or **2** steps.

Return the number of different sequences of moves that take you from the bottom to exactly the top.
`,
    constraints: ["1 ≤ n ≤ 45"],
    hints: [
      "Your last move was either a 1-step or a 2-step. How many ways reach the step before that?",
      "ways(n) = ways(n - 1) + ways(n - 2). You only need the previous two values.",
    ],
    entry: {
      kind: "function",
      name: { js: "climbStairs", py: "climb_stairs" },
      params: [{ name: "n", type: "int" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "For 4 steps the move sequences are 1+1+1+1, 1+1+2, 1+2+1, 2+1+1 and 2+2: five in total.",
    },
    tests: [[4], [1], [2], [3], [10], [25], [45]],
    js: `
function climbStairs(n) {
  let prev = 1;
  let curr = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}`,
    py: `
def climb_stairs(n):
    ways = [0] * (n + 1)
    ways[0] = 1
    for step in range(1, n + 1):
        ways[step] = ways[step - 1] + (ways[step - 2] if step >= 2 else 0)
    return ways[n]
`,
  },
  {
    slug: "house-robber",
    title: "House Robber",
    difficulty: "MEDIUM",
    topics: ["DYNAMIC_PROGRAMMING"],
    leetcode: "https://leetcode.com/problems/house-robber/",
    statement: `
Houses stand in a row, and \`nums[i]\` is the amount of money in house \`i\`. You may take the money
from any set of houses, as long as you never take from **two neighbouring houses**.

Return the largest total you can collect.
`,
    constraints: ["1 ≤ nums.length ≤ 1000", "0 ≤ nums[i] ≤ 1000"],
    hints: [
      "For each house you either skip it or take it (and then you must have skipped the one before).",
      "best(i) = max(best(i - 1), best(i - 2) + nums[i]). Two running variables are enough.",
    ],
    entry: {
      kind: "function",
      name: { js: "rob", py: "rob" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "Take houses 0, 2 and 4 for 5 + 9 + 4 = 18. No other non-adjacent choice beats it.",
    },
    tests: [
      [[5, 1, 9, 3, 4]],
      [[2, 10, 3]],
      [[7]],
      [[0, 0, 0]],
      [[4, 4]],
      [[1, 8, 1, 1, 8, 1]],
      [[6, 0, 0, 6, 0, 0, 6]],
      [[3, 2, 2, 3, 9, 1, 1, 9]],
      [Array.from({ length: 1000 }, (_, i) => (i * 37) % 1001)],
    ],
    js: `
function rob(nums) {
  let skip = 0;
  let take = 0;
  for (const value of nums) {
    const newTake = skip + value;
    skip = Math.max(skip, take);
    take = newTake;
  }
  return Math.max(skip, take);
}`,
    py: `
def rob(nums):
    best = [0] * (len(nums) + 1)
    best[1] = nums[0]
    for i in range(2, len(nums) + 1):
        best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])
    return best[len(nums)]
`,
  },
  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "MEDIUM",
    topics: ["DYNAMIC_PROGRAMMING"],
    leetcode: "https://leetcode.com/problems/coin-change/",
    statement: `
You have unlimited coins of each denomination in \`coins\`. Return the **fewest** coins needed to
make exactly \`amount\`. If it cannot be done, return \`-1\`. Making an \`amount\` of \`0\` takes \`0\` coins.
`,
    constraints: ["1 ≤ coins.length ≤ 12", "1 ≤ coins[i] ≤ 10⁴", "0 ≤ amount ≤ 10⁴"],
    hints: [
      "Greedy (largest coin first) fails for some coin sets. Think about smaller amounts first.",
      "fewest[a] = 1 + min(fewest[a - c]) over coins c ≤ a. Fill this table from 0 up to amount.",
    ],
    entry: {
      kind: "function",
      name: { js: "coinChange", py: "coin_change" },
      params: [
        { name: "coins", type: "int[]" },
        { name: "amount", type: "int" },
      ],
      returns: "int",
    },
    samples: 3,
    explanations: {
      0: "18 = 9 + 9 uses two coins. Picking the largest coin first (10) would leave 8 = 4 + 4, three coins in all.",
    },
    tests: [
      [[4, 9, 10], 18],
      [[6], 13],
      [[3, 7], 0],
      [[1], 9],
      [[2, 5], 3],
      [[1, 5, 12, 19], 16],
      [[7, 3, 11], 25],
      [[83, 211, 397, 512], 9001],
      [[5000, 3, 9999], 10000],
    ],
    js: `
function coinChange(coins, amount) {
  const fewest = new Array(amount + 1).fill(Infinity);
  fewest[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && fewest[a - coin] + 1 < fewest[a]) fewest[a] = fewest[a - coin] + 1;
    }
  }
  return fewest[amount] === Infinity ? -1 : fewest[amount];
}`,
    py: `
from collections import deque

def coin_change(coins, amount):
    if amount == 0:
        return 0
    seen = {0}
    queue = deque([(0, 0)])
    while queue:
        total, used = queue.popleft()
        for coin in coins:
            nxt = total + coin
            if nxt == amount:
                return used + 1
            if nxt < amount and nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, used + 1))
    return -1
`,
  },
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    difficulty: "MEDIUM",
    topics: ["DYNAMIC_PROGRAMMING", "BINARY_SEARCH"],
    leetcode: "https://leetcode.com/problems/longest-increasing-subsequence/",
    statement: `
A **subsequence** of \`nums\` keeps some of its elements (possibly all) in their original order,
dropping the rest. Return the length of the longest subsequence whose values are **strictly
increasing**.
`,
    constraints: ["1 ≤ nums.length ≤ 1000", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    hints: [
      "Let best[i] be the length of the longest increasing subsequence ending at index i. It extends some earlier best[j] with nums[j] < nums[i].",
      "For O(n log n): keep tails[k] = the smallest possible last value of an increasing subsequence of length k + 1, and binary-search where each number goes.",
    ],
    entry: {
      kind: "function",
      name: { js: "lengthOfLIS", py: "length_of_lis" },
      params: [{ name: "nums", type: "int[]" }],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "One longest choice is 1, 4, 6, 8 (length 4). No strictly increasing subsequence of length 5 exists.",
    },
    tests: [
      [[5, 1, 4, 2, 6, 3, 8]],
      [[9, 7, 5, 3]],
      [[42]],
      [[3, 3, 3, 3]],
      [[1, 2, 3, 4, 5, 6]],
      [[-5, 10, -4, 11, -3, 12, -2]],
      [[2, 9, 3, 8, 4, 7, 5, 6]],
      [Array.from({ length: 1000 }, (_, i) => ((i * 7919) % 2003) - 1000)],
    ],
    js: `
function lengthOfLIS(nums) {
  const tails = [];
  for (const value of nums) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < value) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = value;
  }
  return tails.length;
}`,
    py: `
def length_of_lis(nums):
    best = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i] and best[j] + 1 > best[i]:
                best[i] = best[j] + 1
    return max(best)
`,
  },
  {
    slug: "word-break",
    title: "Word Break",
    difficulty: "MEDIUM",
    topics: ["DYNAMIC_PROGRAMMING"],
    leetcode: "https://leetcode.com/problems/word-break/",
    statement: `
Given a string \`s\` and a list of words \`wordDict\`, return \`true\` if \`s\` can be cut into
pieces where every piece is a word from \`wordDict\`. Words may be reused as many times as you like.
Otherwise return \`false\`.
`,
    constraints: [
      "1 ≤ s.length ≤ 300",
      "1 ≤ wordDict.length ≤ 1000",
      "1 ≤ wordDict[i].length ≤ 20",
      "Only lowercase English letters; dictionary words are unique.",
    ],
    hints: [
      "Let ok[i] mean the first i characters can be split. ok[0] is true.",
      "ok[i] is true if some word w ends at position i and ok[i - w.length] is true.",
    ],
    entry: {
      kind: "function",
      name: { js: "wordBreak", py: "word_break" },
      params: [
        { name: "s", type: "string" },
        { name: "wordDict", type: "string[]" },
      ],
      returns: "bool",
    },
    samples: 3,
    explanations: {
      0: '"sunflowerseed" splits as "sun" + "flower" + "seed".',
    },
    tests: [
      ["sunflowerseed", ["seed", "sun", "flower", "flow"]],
      ["catsdogs", ["cat", "dog", "cats", "do"]],
      ["pineapple", ["pine", "apples", "pin"]],
      ["a", ["a"]],
      ["b", ["a"]],
      ["aaaaaaa", ["aaa", "aaaa"]],
      ["aaaaaaaaaaab", ["a", "aa", "aaa", "aaaa"]],
      ["carpetcar", ["car", "pet", "carp", "et"]],
      ["x".repeat(299) + "y", ["x", "xx", "xxx", "xy"]],
      ["x".repeat(300), ["xy", "y"]],
    ],
    js: `
function wordBreak(s, wordDict) {
  const ok = new Array(s.length + 1).fill(false);
  ok[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (const word of wordDict) {
      const start = i - word.length;
      if (start >= 0 && ok[start] && s.startsWith(word, start)) {
        ok[i] = true;
        break;
      }
    }
  }
  return ok[s.length];
}`,
    py: `
from functools import lru_cache

def word_break(s, word_dict):
    words = set(word_dict)
    longest = max(len(w) for w in words)

    @lru_cache(maxsize=None)
    def can_split_from(start):
        if start == len(s):
            return True
        for end in range(start + 1, min(len(s), start + longest) + 1):
            if s[start:end] in words and can_split_from(end):
                return True
        return False

    return can_split_from(0)
`,
  },
  {
    slug: "unique-paths",
    title: "Unique Paths",
    difficulty: "MEDIUM",
    topics: ["DYNAMIC_PROGRAMMING"],
    leetcode: "https://leetcode.com/problems/unique-paths/",
    statement: `
A robot starts in the top-left cell of a grid with \`m\` rows and \`n\` columns. Each move takes
it one cell **right** or one cell **down**.

Return how many different routes lead it to the bottom-right cell.
`,
    constraints: ["1 ≤ m, n ≤ 100", "The answer is at most 2 × 10⁹."],
    hints: [
      "The number of routes into a cell is the routes into the cell above plus the routes into the cell to its left.",
      "The first row and first column each have exactly one route. A single row array is enough to fill the table.",
    ],
    entry: {
      kind: "function",
      name: { js: "uniquePaths", py: "unique_paths" },
      params: [
        { name: "m", type: "int" },
        { name: "n", type: "int" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: "On a 2 × 3 grid the robot makes 2 right moves and 1 down move in some order: down-right-right, right-down-right or right-right-down.",
    },
    tests: [
      [2, 3],
      [4, 4],
      [1, 1],
      [1, 50],
      [60, 1],
      [3, 9],
      [10, 10],
      [16, 17],
      [100, 3],
    ],
    js: `
function uniquePaths(m, n) {
  const row = new Array(n).fill(1);
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) row[c] += row[c - 1];
  }
  return row[n - 1];
}`,
    py: `
from math import comb

def unique_paths(m, n):
    return comb(m + n - 2, m - 1)
`,
  },
  {
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    difficulty: "MEDIUM",
    topics: ["DYNAMIC_PROGRAMMING", "STRINGS"],
    leetcode: "https://leetcode.com/problems/longest-common-subsequence/",
    statement: `
A **subsequence** of a string is what remains after deleting zero or more characters without
changing the order of the others. Given two strings \`text1\` and \`text2\`, return the length of
the longest string that is a subsequence of **both**. Return \`0\` if they share no characters.
`,
    constraints: ["1 ≤ text1.length, text2.length ≤ 500", "Only lowercase English letters."],
    hints: [
      "Compare the last characters. If they match, they can end the common subsequence; if not, drop one of them.",
      "lcs[i][j] = lcs[i-1][j-1] + 1 when text1[i-1] == text2[j-1], otherwise max(lcs[i-1][j], lcs[i][j-1]).",
    ],
    entry: {
      kind: "function",
      name: { js: "longestCommonSubsequence", py: "longest_common_subsequence" },
      params: [
        { name: "text1", type: "string" },
        { name: "text2", type: "string" },
      ],
      returns: "int",
    },
    samples: 2,
    explanations: {
      0: '"ford" is a subsequence of both "oxford" and "afforded", and no longer common subsequence exists.',
    },
    tests: [
      ["oxford", "afforded"],
      ["xyz", "abc"],
      ["q", "q"],
      ["same", "same"],
      ["abcdef", "fedcba"],
      ["banana", "atana"],
      ["aaaa", "aa"],
      ["abcde".repeat(100), "edcba".repeat(100)],
    ],
    js: `
function longestCommonSubsequence(text1, text2) {
  let prev = new Array(text2.length + 1).fill(0);
  for (let i = 1; i <= text1.length; i++) {
    const curr = new Array(text2.length + 1).fill(0);
    for (let j = 1; j <= text2.length; j++) {
      curr[j] = text1[i - 1] === text2[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[text2.length];
}`,
    py: `
def longest_common_subsequence(text1, text2):
    rows, cols = len(text1), len(text2)
    table = [[0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(rows - 1, -1, -1):
        for j in range(cols - 1, -1, -1):
            if text1[i] == text2[j]:
                table[i][j] = table[i + 1][j + 1] + 1
            else:
                table[i][j] = max(table[i + 1][j], table[i][j + 1])
    return table[0][0]
`,
  },
  {
    slug: "edit-distance",
    title: "Edit Distance",
    difficulty: "HARD",
    topics: ["DYNAMIC_PROGRAMMING", "STRINGS"],
    leetcode: "https://leetcode.com/problems/edit-distance/",
    statement: `
You may change a string using three kinds of single-character edits:

- **insert** a character anywhere,
- **delete** a character,
- **replace** a character with another one.

Return the smallest number of edits that turns \`word1\` into \`word2\`.
`,
    constraints: ["0 ≤ word1.length, word2.length ≤ 400", "Only lowercase English letters."],
    hints: [
      "Let d[i][j] be the cost of turning the first i characters of word1 into the first j characters of word2. Turning a prefix into the empty string costs its length.",
      "If the last characters match, d[i][j] = d[i-1][j-1]. Otherwise it is 1 + the minimum of the delete, insert and replace options.",
    ],
    entry: {
      kind: "function",
      name: { js: "minDistance", py: "min_distance" },
      params: [
        { name: "word1", type: "string" },
        { name: "word2", type: "string" },
      ],
      returns: "int",
    },
    samples: 3,
    explanations: {
      0: "Replace 'w' with 's', then insert 'p' and 'r': \"winter\" → \"sinter\" → \"spinter\" → \"sprinter\". No sequence of 2 edits works, so the answer is 3.",
    },
    tests: [
      ["winter", "sprinter"],
      ["", "abc"],
      ["kitchen", "kitchen"],
      ["abc", ""],
      ["", ""],
      ["a", "b"],
      ["flaw", "lawn"],
      ["intention", "invention"],
      ["abcdefgh", "hgfedcba"],
      ["xy".repeat(200), "yx".repeat(200)],
    ],
    js: `
function minDistance(word1, word2) {
  const m = word1.length;
  const n = word2.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) curr[j] = prev[j - 1];
      else curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}`,
    py: `
def min_distance(word1, word2):
    m, n = len(word1), len(word2)
    dist = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dist[i][0] = i
    for j in range(n + 1):
        dist[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if word1[i - 1] == word2[j - 1] else 1
            dist[i][j] = min(
                dist[i - 1][j] + 1,
                dist[i][j - 1] + 1,
                dist[i - 1][j - 1] + cost,
            )
    return dist[m][n]
`,
  },
];

export default problems;
