/** Database and caching topics. */
export const dataTopics = [
  {
    slug: "sql-fundamentals",
    name: "SQL queries and joins",
    category: "Databases",
    importance: 4,
    description: "SELECT, joins, GROUP BY/HAVING, subqueries and window functions.",
    explanation: `Relational databases store data in tables with relationships enforced by keys. Core query skills:

- **Joins**: INNER (matching rows only), LEFT (all rows from the left, nulls where no match), and anti-joins (LEFT JOIN … WHERE right.id IS NULL, or NOT EXISTS).
- **Aggregation**: GROUP BY with COUNT/SUM/AVG; HAVING filters groups after aggregation, WHERE filters rows before.
- **Window functions** (ROW_NUMBER, RANK, SUM … OVER) compute across related rows without collapsing them, which solves "top N per group" and running totals.

Logical query order is FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.`,
    concepts: [
      "INNER vs LEFT joins and anti-joins",
      "WHERE vs HAVING",
      "Logical order of query evaluation",
      "Window functions for top-N per group",
      "NULL semantics in comparisons and aggregates",
      "Normalisation basics (1NF–3NF)",
    ],
    mistakes: [
      "Filtering a LEFT JOIN's right table in WHERE, turning it into an inner join",
      "Comparing with = NULL instead of IS NULL",
      "SELECT * in production queries",
      "N+1 queries from an ORM loop",
    ],
    bands: { "0-2": ["APPLY", 3], "2-4": ["APPLY", 3], "4-6": ["APPLY", 2], "6+": ["APPLY", 1.5] },
    roles: { frontend: 1, backend: 5, fullstack: 4 },
    prerequisites: [],
    questions: [
      {
        prompt: "Find the second-highest salary in each department.",
        type: "CODING",
        depth: "APPLY",
        junior:
          "Use a subquery: for each department, select the max salary that is less than the department's max salary.",
        mid: "```sql\nSELECT department_id, salary\nFROM (\n  SELECT department_id, salary,\n         DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk\n  FROM employees\n) ranked\nWHERE rnk = 2;\n```\nDENSE_RANK handles ties (two people with the top salary are both rank 1).",
        senior:
          "The window-function query above, plus clarifying requirements: ties (DENSE_RANK vs ROW_NUMBER), departments with only one salary (return nothing or NULL?), and performance: an index on (department_id, salary DESC) lets the database avoid a full sort. On very large tables I would check the plan with EXPLAIN.",
      },
      {
        prompt: "Why might a LEFT JOIN behave like an INNER JOIN?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "If you add a condition on the right table in the WHERE clause, rows without a match (NULLs) are filtered out.",
        mid: "WHERE runs after the join, so `WHERE o.status = 'paid'` removes left rows whose right side is NULL. Put the condition in the ON clause (`LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'`) to keep unmatched left rows.",
        senior:
          "Same explanation; I mention it as a frequent code-review catch and verify with a quick count comparison. For 'users without paid orders' I prefer NOT EXISTS, which states the intent and usually plans well.",
      },
      {
        mcq: true,
        prompt: "What is the difference between WHERE and HAVING?",
        depth: "KNOW",
        options: [
          "No difference",
          "WHERE filters rows before grouping; HAVING filters groups after aggregation",
          "HAVING is faster",
          "WHERE only works with joins",
        ],
        correct: 1,
        explanation:
          "WHERE removes rows before GROUP BY; HAVING can filter on aggregates like COUNT(*) > 5.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "PostgreSQL tutorial: Window functions",
        "https://www.postgresql.org/docs/current/tutorial-window.html",
        "DOCS",
      ],
      ["Use The Index, Luke", "https://use-the-index-luke.com/", "BOOK"],
    ],
  },
  {
    slug: "db-indexing",
    name: "Indexes and query performance",
    category: "Databases",
    importance: 5,
    description: "B-tree indexes, composite index order, covering indexes, EXPLAIN and trade-offs.",
    explanation: `An index is a separate data structure (usually a B-tree) that lets the database find rows without scanning the whole table. Indexes speed up reads on the indexed columns and slow down writes, because every insert and update must also update the index.

Composite indexes follow the **leftmost prefix** rule: an index on \`(user_id, created_at)\` helps queries filtering by \`user_id\`, or by \`user_id\` and \`created_at\`, but not by \`created_at\` alone. Put equality columns first, then range or sort columns.

A **covering index** contains every column a query needs, so the table is never read. Use \`EXPLAIN\` / \`EXPLAIN ANALYZE\` to see the plan: sequential scans on large tables, high row estimates and sorts are signs of a missing or unusable index. Functions on indexed columns (\`WHERE LOWER(email) = …\`) and leading wildcards (\`LIKE '%x'\`) usually prevent index use unless you index the expression.`,
    concepts: [
      "B-tree indexes and how lookups work",
      "Composite indexes and the leftmost prefix",
      "Covering indexes",
      "Reading EXPLAIN plans",
      "Write cost and over-indexing",
      "Selectivity and cardinality",
    ],
    mistakes: [
      "Indexing every column",
      "Wrong column order in composite indexes",
      "Wrapping indexed columns in functions",
      "Optimising without looking at the query plan",
    ],
    bands: {
      "0-2": ["EXPLAIN", 2],
      "2-4": ["APPLY", 3],
      "4-6": ["APPLY", 2.5],
      "6+": ["DESIGN", 2.5],
    },
    roles: { frontend: 0, backend: 5, fullstack: 4 },
    prerequisites: ["sql-fundamentals"],
    questions: [
      {
        prompt:
          "A query `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20` is slow on a 50M-row table. What do you do?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior: "Add an index on user_id so the database can find the user's orders quickly.",
        mid: "Run EXPLAIN ANALYZE. Create a composite index on (user_id, created_at DESC): the database can find the user's rows already ordered and stop after 20, with no sort. Select only needed columns, and consider including them in the index to make it covering.",
        senior:
          "Composite index (user_id, created_at DESC), created concurrently to avoid locking in production, verified with EXPLAIN ANALYZE before and after. Switch the endpoint to cursor pagination for deeper pages. Check write impact and existing redundant indexes (an index on user_id alone becomes redundant). Monitor with pg_stat_statements.",
      },
      {
        mcq: true,
        prompt: "Given an index on (country, city), which query can use it efficiently?",
        depth: "EXPLAIN",
        options: [
          "WHERE city = 'Pune'",
          "WHERE country = 'IN' AND city = 'Pune'",
          "WHERE LOWER(country) = 'in'",
          "WHERE city LIKE '%une'",
        ],
        correct: 1,
        explanation:
          "Composite indexes are used from the leftmost column. Filtering on city alone, applying functions, or leading wildcards prevent efficient use.",
        diagnostic: true,
        selfCheck: true,
      },
      {
        mcq: true,
        prompt: "Why can too many indexes hurt a write-heavy table?",
        depth: "APPLY",
        options: [
          "Indexes make SELECT slower",
          "Every insert/update must also update each index, increasing write cost and storage",
          "Databases limit tables to three indexes",
          "Indexes lock the table permanently",
        ],
        correct: 1,
        explanation:
          "Each index is a structure maintained on every write. Unused indexes cost write throughput and memory.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["Use The Index, Luke", "https://use-the-index-luke.com/", "BOOK"],
      [
        "PostgreSQL docs: Using EXPLAIN",
        "https://www.postgresql.org/docs/current/using-explain.html",
        "DOCS",
      ],
    ],
  },
  {
    slug: "db-transactions",
    name: "Transactions and isolation levels",
    category: "Databases",
    importance: 4,
    description: "ACID, isolation anomalies, locking, optimistic concurrency and deadlocks.",
    explanation: `A transaction groups operations so they succeed or fail together. **ACID**: Atomicity (all or nothing), Consistency (constraints hold), Isolation (concurrent transactions don't see each other's partial work, to a degree), Durability (committed data survives crashes).

Isolation levels trade correctness for concurrency. **Read Committed** (Postgres default) prevents dirty reads but allows non-repeatable reads and lost updates if you read-then-write naively. **Repeatable Read** and **Serializable** prevent more anomalies but may abort transactions that must be retried.

Common patterns: atomic updates (\`UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0\`), row locks (\`SELECT … FOR UPDATE\`), and optimistic concurrency with a version column. Deadlocks happen when transactions lock rows in different orders; consistent ordering and retries handle them.`,
    concepts: [
      "ACID properties",
      "Dirty reads, non-repeatable reads, phantoms, lost updates",
      "Isolation levels and their defaults",
      "Pessimistic locking (FOR UPDATE) vs optimistic (version column)",
      "Deadlocks and retry logic",
      "Keeping transactions short",
    ],
    mistakes: [
      "Read-modify-write in application code without locking (lost updates)",
      "Calling external APIs inside a database transaction",
      "Long transactions holding locks",
    ],
    bands: {
      "0-2": ["KNOW", 2],
      "2-4": ["EXPLAIN", 2.5],
      "4-6": ["APPLY", 3],
      "6+": ["DESIGN", 2.5],
    },
    roles: { frontend: 0, backend: 5, fullstack: 4 },
    prerequisites: ["sql-fundamentals"],
    questions: [
      {
        prompt:
          "Two users buy the last item in stock at the same time. How do you prevent overselling?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior: "Use a transaction and check the stock before reducing it.",
        mid: "A check-then-update in two statements races. Use a single atomic statement: `UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0 RETURNING stock` and treat zero affected rows as 'sold out'. Alternatively lock the row with SELECT … FOR UPDATE inside a transaction.",
        senior:
          "Atomic conditional update or a CHECK (stock >= 0) constraint as the safety net. For flash sales with heavy contention on one row, I would use reservations with expiry (or a Redis counter with Lua) and reconcile to the database, plus a queue to smooth the spike. The order and the stock decrement must be in the same transaction, or use an outbox pattern if events go to other services.",
      },
      {
        mcq: true,
        prompt: "What is a 'lost update'?",
        depth: "EXPLAIN",
        options: [
          "An update that fails due to a network error",
          "Two transactions read the same value, both modify it, and one write overwrites the other",
          "An update rolled back by the user",
          "A write to a replica that is never replicated",
        ],
        correct: 1,
        explanation:
          "Read-modify-write without locking or atomic updates lets one transaction silently overwrite another's change.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "PostgreSQL docs: Transaction isolation",
        "https://www.postgresql.org/docs/current/transaction-iso.html",
        "DOCS",
      ],
    ],
  },
  {
    slug: "mongodb-modeling",
    name: "MongoDB data modelling and aggregation",
    category: "Databases",
    importance: 3,
    description:
      "Embedding vs referencing, schema design for access patterns, indexes and aggregation pipelines.",
    explanation: `MongoDB stores JSON-like documents. Design is driven by **access patterns**: data read together should be stored together.

- **Embed** when the child data is bounded and always read with the parent (an order's line items).
- **Reference** when the related data is large, unbounded, shared, or updated independently (a user's orders).

Documents are limited to 16 MB, so unbounded arrays are an anti-pattern. Indexes work like in relational databases (including compound indexes and the ESR rule: Equality, Sort, Range). The **aggregation pipeline** (\`$match\`, \`$group\`, \`$lookup\`, \`$project\`, \`$sort\`) transforms data in stages; put \`$match\` early so indexes can be used. Multi-document transactions exist but are costlier than single-document atomic operations.`,
    concepts: [
      "Embedding vs referencing",
      "Design for access patterns",
      "Unbounded arrays and the 16 MB limit",
      "Compound indexes and the ESR rule",
      "Aggregation pipeline stages",
      "Single-document atomicity",
    ],
    mistakes: [
      "Modelling MongoDB like normalised SQL tables with $lookup everywhere",
      "Unbounded embedded arrays (comments inside a post forever)",
      "No indexes on frequently queried fields",
    ],
    bands: {
      "0-2": ["EXPLAIN", 2.5],
      "2-4": ["APPLY", 2.5],
      "4-6": ["APPLY", 2],
      "6+": ["DESIGN", 2],
    },
    roles: { frontend: 0, backend: 4, fullstack: 4 },
    prerequisites: [],
    questions: [
      {
        prompt:
          "Model a blog with posts and comments in MongoDB. Embed comments or reference them?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "Embed comments inside the post document so you can load a post with its comments in one query.",
        mid: "It depends on volume. Comments can grow without limit and are paginated, so store them in a separate collection with a postId index. Embed a small, bounded summary in the post (comment count, latest 3 comments) for fast reads, updated when comments are added.",
        senior:
          "A comments collection indexed on (postId, createdAt) for pagination, plus the subset pattern (recent comments and counts embedded) for the common read path. Updates to the embedded subset happen atomically with $push and $slice. I would also consider moderation states, threading depth, and hot posts receiving many writes.",
      },
      {
        mcq: true,
        prompt: "When is embedding usually the better choice?",
        depth: "EXPLAIN",
        options: [
          "When the child data grows without bound",
          "When the child data is bounded and always read with the parent",
          "When many parents share the same child",
          "When the child is updated very frequently by itself",
        ],
        correct: 1,
        explanation:
          "Embed small, bounded data accessed together. Reference large, shared or independently changing data.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["MongoDB: Data modeling", "https://www.mongodb.com/docs/manual/data-modeling/", "DOCS"],
      [
        "MongoDB: Aggregation pipeline",
        "https://www.mongodb.com/docs/manual/core/aggregation-pipeline/",
        "DOCS",
      ],
    ],
  },
  {
    slug: "caching-redis",
    name: "Caching with Redis",
    category: "Databases",
    importance: 3,
    description: "Cache-aside, TTLs, invalidation, stampedes and other Redis uses.",
    explanation: `Caching stores the results of expensive work for reuse. The common pattern is **cache-aside**: read from the cache; on a miss, load from the database, write to the cache with a TTL, and return.

The hard parts are **invalidation** (delete or update the cache entry when the source changes), **consistency** (accept staleness bounded by the TTL), and **stampedes** (many requests miss at once; use request coalescing, locks, or early refresh).

Redis is also used for sessions, rate limiting (INCR with expiry), distributed locks, queues (BullMQ), leaderboards (sorted sets) and pub/sub.`,
    concepts: [
      "Cache-aside, write-through, write-behind",
      "TTL and invalidation strategies",
      "Cache stampede protection",
      "Hot keys and memory limits/eviction",
      "Redis data structures and use cases",
    ],
    mistakes: [
      "Caching without a TTL and never invalidating",
      "Caching per-user data under shared keys",
      "Treating Redis as the source of truth without persistence",
    ],
    bands: {
      "0-2": ["KNOW", 1.5],
      "2-4": ["EXPLAIN", 2],
      "4-6": ["APPLY", 2],
      "6+": ["DESIGN", 2],
    },
    roles: { frontend: 0, backend: 4, fullstack: 3 },
    prerequisites: [],
    questions: [
      {
        prompt: "How do you keep a product cache consistent when prices change?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "Delete the product's cache key whenever its price is updated so the next read loads fresh data.",
        mid: "Cache-aside with a TTL as a safety net, and delete the key after the database write commits (not before, to avoid caching stale data in between). For many derived keys (lists, search), use versioned keys or tags so one change invalidates all related entries.",
        senior:
          "Delete-after-commit, triggered reliably via an outbox/event so invalidation is not lost if the app crashes; short TTL as a backstop; and an explicit staleness budget agreed with product (prices may need near-zero staleness, so read them from the database at checkout regardless of the cache). Monitor hit rate and stale reads.",
      },
      {
        mcq: true,
        prompt: "What is a cache stampede?",
        depth: "EXPLAIN",
        options: [
          "Redis running out of memory",
          "Many requests missing an expired hot key at once and all hitting the database",
          "Two servers writing the same key",
          "A cache that is never invalidated",
        ],
        correct: 1,
        explanation:
          "When a popular entry expires, concurrent misses overload the database. Use locking, request coalescing or early refresh.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "Redis docs: Client-side caching and patterns",
        "https://redis.io/docs/latest/develop/",
        "DOCS",
      ],
    ],
  },
];
