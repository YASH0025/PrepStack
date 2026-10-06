/** General engineering, DSA and system design topics. */
export const engineeringTopics = [
  {
    slug: "dsa-arrays-hashing",
    name: "DSA: arrays, strings and hashing",
    category: "DSA",
    importance: 4,
    description: "Big-O, two pointers, sliding window and hash maps for common coding rounds.",
    explanation: `Most product-company coding rounds start with arrays and strings. Key techniques:

- **Hash maps/sets** turn O(n²) lookups into O(1) average (two-sum, duplicates, frequency counts, grouping anagrams).
- **Two pointers** for sorted arrays and in-place operations (pair sums, removing duplicates, palindromes).
- **Sliding window** for contiguous subarrays and substrings with a constraint (longest substring without repeats).
- **Prefix sums** for range sums and subarray-sum counts.

Always state the brute force, then improve, and give time and space complexity. Talk through edge cases: empty input, one element, duplicates, negatives, very large inputs.`,
    concepts: [
      "Big-O time and space",
      "Hash maps for O(1) lookups",
      "Two pointers",
      "Sliding window",
      "Prefix sums",
      "Communicating approach and edge cases",
    ],
    mistakes: [
      "Coding before clarifying the problem",
      "Not stating complexity",
      "Missing edge cases (empty input, duplicates)",
      "Silent coding without explaining",
    ],
    bands: { "0-2": ["APPLY", 6], "2-4": ["APPLY", 6], "4-6": ["APPLY", 5], "6+": ["APPLY", 4] },
    roles: { frontend: 3, backend: 4, fullstack: 4 },
    prerequisites: ["js-array-object-methods"],
    questions: [
      {
        prompt: "Find the length of the longest substring without repeating characters.",
        type: "CODING",
        depth: "APPLY",
        junior:
          "Check every substring and test whether its characters are unique. This is O(n³) but correct; then try to improve it.",
        mid: "Sliding window with a map of last-seen indexes:\n```js\nfunction longest(s) {\n  const last = new Map();\n  let start = 0, best = 0;\n  for (let i = 0; i < s.length; i++) {\n    if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;\n    last.set(s[i], i);\n    best = Math.max(best, i - start + 1);\n  }\n  return best;\n}\n```\nO(n) time, O(min(n, alphabet)) space.",
        senior:
          "The O(n) sliding window above, explained with an invariant (the window [start, i] has no duplicates). I would cover Unicode (iterate code points for emoji), test cases (empty, all same, all unique), and how the pattern generalises to 'at most k distinct characters'.",
      },
      {
        prompt: "Two-sum: return indexes of two numbers that add up to a target.",
        type: "CODING",
        depth: "APPLY",
        junior: "Use two nested loops to check every pair. O(n²).",
        mid: "One pass with a hash map from value to index: for each number, check whether target - num was seen; if so, return both indexes. O(n) time, O(n) space.",
        senior:
          "Hash map in one pass, discussing the sorted-input variant (two pointers, O(1) space), duplicates, and returning all pairs. In an interview I state the brute force first, then optimise, and test with a quick dry run.",
      },
      {
        mcq: true,
        prompt:
          "What is the time complexity of checking membership in a JavaScript Set on average?",
        depth: "KNOW",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: 0,
        explanation: "Sets and Maps are hash-based with average constant-time lookups.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["NeetCode roadmap", "https://neetcode.io/roadmap", "COURSE"],
      [
        "LeetCode: Top interview questions",
        "https://leetcode.com/studyplan/top-interview-150/",
        "COURSE",
      ],
    ],
  },
  {
    slug: "dsa-trees-graphs",
    name: "DSA: trees, graphs and recursion",
    category: "DSA",
    importance: 3,
    description:
      "Tree traversal, BFS/DFS, recursion, and when graph thinking appears in real systems.",
    explanation: `Trees and graphs appear in coding rounds and in real systems (DOM, file systems, dependency graphs, social networks).

- **Tree traversals**: preorder, inorder, postorder (DFS) and level order (BFS with a queue).
- **Graph search**: BFS finds shortest paths in unweighted graphs; DFS explores and detects cycles. Track visited nodes.
- **Topological sort** orders tasks with dependencies (build systems, course schedules, prerequisite graphs).
- **Recursion** needs a base case; deep recursion can overflow the stack, so iterative versions with explicit stacks are sometimes needed.`,
    concepts: [
      "DFS (recursive/iterative) and BFS",
      "Binary search trees and balanced trees",
      "Visited sets and cycle detection",
      "Topological sort",
      "Recursion depth and stack limits",
    ],
    mistakes: [
      "Forgetting a visited set in graphs (infinite loops)",
      "Missing base cases",
      "Using DFS when the shortest path is required",
    ],
    bands: { "0-2": ["EXPLAIN", 4], "2-4": ["APPLY", 5], "4-6": ["APPLY", 4], "6+": ["APPLY", 3] },
    roles: { frontend: 2, backend: 3, fullstack: 3 },
    prerequisites: ["dsa-arrays-hashing"],
    questions: [
      {
        prompt:
          "Given courses and prerequisite pairs, decide whether all courses can be completed.",
        type: "CODING",
        depth: "APPLY",
        junior:
          "Build a graph of prerequisites and check for a cycle; if there is a cycle, you cannot finish all courses.",
        mid: "Kahn's algorithm: compute in-degrees, queue courses with in-degree 0, pop and decrement neighbours, count processed nodes. If processed equals the number of courses, there is no cycle. O(V + E).",
        senior:
          "Kahn's algorithm (which also yields an order), or DFS with three colours for cycle detection. I would relate it to real uses: build tools and package managers, and in this very kind of product, ordering learning topics by prerequisites while respecting priority.",
      },
      {
        mcq: true,
        prompt: "Which traversal finds the shortest path (fewest edges) in an unweighted graph?",
        depth: "EXPLAIN",
        options: [
          "Depth-first search",
          "Breadth-first search",
          "Inorder traversal",
          "Binary search",
        ],
        correct: 1,
        explanation:
          "BFS explores level by level, so the first time it reaches a node is via the fewest edges.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [["NeetCode roadmap", "https://neetcode.io/roadmap", "COURSE"]],
  },
  {
    slug: "system-design-basics",
    name: "System design fundamentals",
    category: "System design",
    importance: 4,
    description:
      "Requirements, estimates, load balancing, caching, databases, queues and trade-offs.",
    explanation: `System design interviews test structured thinking about trade-offs. A reliable approach:

1. **Clarify requirements**: functional (what it does) and non-functional (scale, latency, availability, consistency).
2. **Estimate** load: requests per second, storage growth, read/write ratio.
3. **High-level design**: clients, load balancer, stateless services, data stores, caches, queues, CDN.
4. **Deep dives**: data model and access patterns, scaling the bottleneck, failure modes.
5. **Trade-offs**: consistency vs availability, latency vs cost, simplicity vs flexibility.

Building blocks to know: load balancers, caching layers, SQL vs NoSQL, replication and sharding, message queues and event-driven processing, CDNs, rate limiting, and observability.`,
    concepts: [
      "Functional vs non-functional requirements",
      "Back-of-the-envelope estimation",
      "Horizontal scaling and stateless services",
      "Replication, sharding and read replicas",
      "Queues, async processing and idempotency",
      "CAP and consistency trade-offs",
    ],
    mistakes: [
      "Jumping into components before clarifying requirements",
      "Over-engineering for scale that is not needed",
      "Not discussing failure modes and trade-offs",
    ],
    bands: { "0-2": ["KNOW", 2], "2-4": ["EXPLAIN", 4], "4-6": ["DESIGN", 6], "6+": ["DESIGN", 6] },
    roles: { frontend: 2, backend: 5, fullstack: 4 },
    prerequisites: ["rest-api-design", "db-indexing"],
    questions: [
      {
        prompt: "Design a URL shortener.",
        type: "SYSTEM_DESIGN",
        depth: "DESIGN",
        junior:
          "Store each long URL in a database with a short random code. When someone opens the short URL, look up the code and redirect.",
        mid: "Requirements: create short links, redirect fast, very read-heavy. Generate codes via base62 of a unique id or random with a uniqueness check; store code → URL in a key-value or SQL table indexed by code; redirect with 301/302; cache hot codes in Redis and at the CDN; rate-limit creation; track clicks asynchronously through a queue.",
        senior:
          "Same core, with estimates (e.g. 100M links/month, 100:1 reads) driving choices: ID generation without coordination (pre-allocated ranges per node), a partitioned KV store, CDN and in-memory caching for redirects, analytics via an event stream into a separate store, abuse controls (malware scanning, rate limits), custom aliases with uniqueness, and expiry. I would discuss 301 vs 302 (caching vs accurate analytics).",
      },
      {
        prompt: "When would you introduce a message queue into a system?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "When some work takes a long time, like sending emails, so the user doesn't have to wait.",
        mid: "To decouple producers and consumers: slow or unreliable work (emails, PDFs, webhooks), smoothing traffic spikes, retrying failures, and fanning out events to several consumers. It brings at-least-once delivery, so consumers must be idempotent, plus monitoring of queue depth and dead-letter queues.",
        senior:
          "Same, plus the costs: eventual consistency, ordering guarantees (per-key partitions), exactly-once is effectively 'at-least-once plus idempotency', and operational overhead. I would use the outbox pattern to publish events reliably with database writes and design for replay.",
      },
      {
        mcq: true,
        prompt:
          "A service is 95% reads and the database is the bottleneck. Which change helps most directly?",
        depth: "APPLY",
        options: [
          "Add a write-ahead log",
          "Add caching and/or read replicas",
          "Switch to a message queue for reads",
          "Increase the number of database writes",
        ],
        correct: 1,
        explanation:
          "Read-heavy load is relieved by caching hot data and spreading reads across replicas.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["System Design Primer", "https://github.com/donnemartin/system-design-primer", "ARTICLE"],
      ["ByteByteGo: System design", "https://bytebytego.com/", "COURSE"],
    ],
  },
  {
    slug: "testing-strategy",
    name: "Testing strategy for backend and full-stack",
    category: "Engineering",
    importance: 3,
    description:
      "Unit, integration and end-to-end tests; mocks vs real dependencies; testing in CI.",
    explanation: `A good test suite gives confidence quickly. Unit tests cover pure logic; integration tests check modules working with real dependencies (a test database, an HTTP layer); end-to-end tests cover a few critical user journeys.

Mock at system boundaries (third-party APIs, email), not your own modules. Tests should be deterministic: control time, randomness and network. Run them in CI on every change, keep them fast, and treat flaky tests as bugs.`,
    concepts: [
      "Unit vs integration vs end-to-end",
      "Test doubles: stubs, mocks, fakes",
      "Testing with a real database (containers)",
      "Deterministic tests (fake timers, seeded data)",
      "Coverage as a guide, not a goal",
    ],
    mistakes: [
      "Mocking everything so tests prove nothing",
      "Flaky tests that everyone ignores",
      "Only end-to-end tests: slow and hard to debug",
    ],
    bands: { "0-2": ["EXPLAIN", 2], "2-4": ["APPLY", 2], "4-6": ["APPLY", 2], "6+": ["DESIGN", 2] },
    roles: { frontend: 2, backend: 3, fullstack: 3 },
    prerequisites: [],
    questions: [
      {
        prompt:
          "How would you test a service method that charges a card and sends a receipt email?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "Mock the payment and email services and check they are called with the right values.",
        mid: "Inject the payment gateway and email sender as interfaces. Unit test with fakes: success path (charged once, email sent), payment failure (no email, error returned), email failure (charge kept, email retried or queued). Add an integration test against the provider's sandbox in CI.",
        senior:
          "Design for testability first: payment via an idempotent gateway interface, email via an outbox so a send failure never loses a receipt. Tests cover the state machine transitions, idempotency (retrying the same request does not double-charge), and webhook handling. Contract tests against the provider's sandbox catch API drift.",
      },
      {
        mcq: true,
        prompt: "Where is mocking most appropriate?",
        depth: "EXPLAIN",
        options: [
          "Every internal function call",
          "System boundaries such as third-party APIs and email providers",
          "The code under test itself",
          "Never",
        ],
        correct: 1,
        explanation:
          "Mock what you don't own or can't run reliably in tests. Mocking your own internals couples tests to implementation.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "Martin Fowler: The practical test pyramid",
        "https://martinfowler.com/articles/practical-test-pyramid.html",
        "ARTICLE",
      ],
    ],
  },
  {
    slug: "git-ci-cd",
    name: "Git, code review and CI/CD",
    category: "Engineering",
    importance: 3,
    description:
      "Branching strategies, rebasing vs merging, pull requests, pipelines and safe deploys.",
    explanation: `Teams collaborate through Git branches and pull requests. Trunk-based development (short-lived branches merged often) reduces painful merges. Rebasing keeps a linear history; merging preserves context. Never rewrite shared history.

CI runs lint, type checks, tests and builds on every change. CD deploys automatically when checks pass, using strategies that limit risk: blue-green, canary releases, and feature flags. Every deploy needs a fast rollback path and monitoring.`,
    concepts: [
      "Trunk-based vs GitFlow",
      "Rebase vs merge; interactive rebase",
      "Good pull requests and reviews",
      "CI pipeline stages",
      "Blue-green, canary and feature flags",
      "Rollback and database migrations",
    ],
    mistakes: [
      "Force-pushing shared branches",
      "Huge pull requests that cannot be reviewed",
      "Deploying schema changes that break the running version",
    ],
    bands: {
      "0-2": ["APPLY", 2],
      "2-4": ["APPLY", 1.5],
      "4-6": ["APPLY", 1.5],
      "6+": ["DESIGN", 2],
    },
    roles: { frontend: 2, backend: 3, fullstack: 3 },
    prerequisites: [],
    questions: [
      {
        prompt: "How do you deploy a database column rename without downtime?",
        type: "SYSTEM_DESIGN",
        depth: "DESIGN",
        junior: "Rename the column and deploy the new code at the same time during low traffic.",
        mid: "Expand and contract: add the new column, deploy code that writes to both and reads from the old, backfill, switch reads to the new column, stop writing the old, then drop it in a later release. Each step is backward compatible with the running version.",
        senior:
          "Expand/contract as above, run as separate releases with verification between steps, backfills in batches to avoid locks, and feature flags controlling the read switch so rollback is instant. Also consider replicas, caches and other services reading the table.",
      },
      {
        mcq: true,
        prompt: "What does a canary release do?",
        depth: "KNOW",
        options: [
          "Deploys to all users at once",
          "Routes a small percentage of traffic to the new version first and watches metrics",
          "Runs tests in production",
          "Deploys only on weekends",
        ],
        correct: 1,
        explanation:
          "A canary limits blast radius: if errors rise, roll back before most users are affected.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [["Atlassian: Git tutorials", "https://www.atlassian.com/git/tutorials", "ARTICLE"]],
  },
  {
    slug: "design-patterns",
    name: "Design principles and patterns",
    category: "Engineering",
    importance: 3,
    description: "SOLID, dependency injection, common patterns and keeping code changeable.",
    explanation: `Design principles exist to keep code easy to change. The most useful in practice:

- **Single responsibility**: a module has one reason to change.
- **Dependency inversion**: business logic depends on interfaces (a repository, an email sender), not concrete implementations, which makes it testable and swappable.
- **Composition over inheritance.**
- **Separation of concerns**: transport (HTTP), business logic and data access in separate layers.

Common patterns: repository, strategy, factory, adapter, observer/pub-sub, and middleware/pipeline. Apply them to solve a real problem, not preemptively.`,
    concepts: [
      "SOLID principles",
      "Dependency injection and interfaces",
      "Repository and service layers",
      "Strategy, adapter, factory, observer",
      "YAGNI and avoiding premature abstraction",
    ],
    mistakes: [
      "Abstractions with a single implementation and no reason",
      "God services that do everything",
      "Business logic mixed with HTTP or SQL",
    ],
    bands: {
      "0-2": ["KNOW", 1.5],
      "2-4": ["EXPLAIN", 2],
      "4-6": ["APPLY", 2],
      "6+": ["DESIGN", 2],
    },
    roles: { frontend: 2, backend: 3, fullstack: 3 },
    prerequisites: [],
    questions: [
      {
        prompt: "Why put database access behind a repository interface?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "So the rest of the code doesn't need to know SQL, and you can change the database later more easily.",
        mid: "Business logic depends on an interface (findById, save) rather than a specific database client. Services become testable with in-memory fakes, queries are centralised (one place to add indexes or tenant filters), and switching storage only changes the implementation.",
        senior:
          "Same benefits, with honesty about costs: an extra layer, and leaky abstractions when queries are complex. I keep repositories thin and aggregate-focused, allow query-specific methods rather than a generic ORM wrapper, and enforce security (tenant scoping) there. It pays off when storage really changes, for example moving from files to Postgres.",
      },
      {
        mcq: true,
        prompt:
          "Which principle says high-level modules should depend on abstractions, not concrete implementations?",
        depth: "KNOW",
        options: [
          "Single responsibility",
          "Open/closed",
          "Liskov substitution",
          "Dependency inversion",
        ],
        correct: 3,
        explanation:
          "Dependency inversion: depend on interfaces so implementations can be swapped and tested.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["Refactoring Guru: Design patterns", "https://refactoring.guru/design-patterns", "ARTICLE"],
    ],
  },
];
