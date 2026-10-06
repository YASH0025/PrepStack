/** Node.js, Express and API topics. */
export const nodeTopics = [
  {
    slug: "node-runtime",
    name: "Node.js runtime and event loop",
    category: "Node.js",
    importance: 5,
    description:
      "libuv, event loop phases, the thread pool, process.nextTick and blocking the loop.",
    explanation: `Node.js runs JavaScript on a single main thread and delegates I/O to **libuv**. Network I/O uses the operating system's non-blocking APIs; some work (file system, DNS lookup, crypto, zlib) runs on libuv's thread pool (4 threads by default).

The event loop cycles through phases: **timers** (setTimeout/setInterval), **pending callbacks**, **poll** (new I/O events), **check** (setImmediate) and **close callbacks**. Between callbacks, \`process.nextTick\` callbacks and then promise microtasks run.

Because one thread runs all JavaScript, CPU-heavy work (large JSON parsing, image processing, synchronous crypto) blocks every request. Offload it to worker threads, a job queue, or another service.`,
    concepts: [
      "Single-threaded JS, non-blocking I/O via libuv",
      "Event loop phases",
      "process.nextTick vs microtasks vs setImmediate",
      "libuv thread pool and UV_THREADPOOL_SIZE",
      "Blocking the event loop",
      "Worker threads for CPU-bound work",
    ],
    mistakes: [
      "Using synchronous fs/crypto APIs in request handlers",
      "Assuming async means parallel CPU work",
      "Recursive process.nextTick starving I/O",
    ],
    bands: {
      "0-2": ["EXPLAIN", 3],
      "2-4": ["APPLY", 3],
      "4-6": ["APPLY", 2.5],
      "6+": ["DESIGN", 2.5],
    },
    roles: { frontend: 0, backend: 5, fullstack: 5 },
    prerequisites: ["js-event-loop"],
    questions: [
      {
        prompt:
          "One API endpoint generates a PDF report and takes 3 seconds of CPU. Other endpoints become slow while it runs. Why, and how do you fix it?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "Node runs JavaScript on one thread, so the PDF generation blocks other requests. Move the work to a worker thread or a background job.",
        mid: "CPU work on the main thread blocks the event loop, so no other callbacks (including other requests) can run. Options: run it in a worker_threads pool, or enqueue a job (BullMQ with Redis) processed by a separate worker process, return 202 with a job id, and notify or let the client poll. Also cache identical reports.",
        senior:
          "I would separate it into an asynchronous job: API enqueues, a worker service generates and uploads to object storage, the client gets a signed URL when ready. That isolates CPU load, allows independent scaling and retries, and protects API latency. I would monitor event-loop lag (perf_hooks.monitorEventLoopDelay) to catch similar issues.",
      },
      {
        prompt: "What is the order of process.nextTick, Promise.then and setImmediate callbacks?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior: "process.nextTick runs first, then promise callbacks, then setImmediate.",
        mid: "After the current operation completes, Node drains the nextTick queue, then the promise microtask queue; setImmediate runs in the check phase of the next loop iteration. Inside an I/O callback, setImmediate always runs before a setTimeout 0; at the top level their order is not guaranteed.",
        senior:
          "Same, and the practical takeaway: avoid process.nextTick in application code except for emitting events after a constructor returns; recursive nextTick or microtasks can starve I/O. Use setImmediate to yield in long loops.",
      },
      {
        mcq: true,
        prompt:
          "Which of these runs on libuv's thread pool rather than the OS's non-blocking network APIs?",
        depth: "EXPLAIN",
        options: ["An HTTP request handler", "fs.readFile", "A TCP socket read", "setTimeout"],
        correct: 1,
        explanation:
          "File system operations, DNS lookup, crypto and zlib use the thread pool. Network sockets use non-blocking OS APIs.",
        diagnostic: true,
        selfCheck: true,
      },
      {
        mcq: true,
        prompt:
          "An endpoint calls `crypto.pbkdf2Sync` with a high iteration count. What is the impact under load?",
        depth: "APPLY",
        options: [
          "None; crypto runs in the thread pool",
          "It blocks the event loop, increasing latency for all requests",
          "It only slows that endpoint",
          "Node automatically moves it to a worker thread",
        ],
        correct: 1,
        explanation:
          "The Sync variant runs on the main thread. Use the async version (thread pool) or a worker.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "Node.js: The event loop",
        "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick",
        "DOCS",
      ],
      [
        "Node.js: Don't block the event loop",
        "https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop",
        "DOCS",
      ],
    ],
  },
  {
    slug: "node-streams",
    name: "Streams and buffers",
    category: "Node.js",
    importance: 3,
    description: "Readable, writable and transform streams, piping and backpressure.",
    explanation: `Streams process data piece by piece instead of loading it all into memory, which keeps memory flat for large files and responses. There are readable, writable, duplex and transform streams.

**Backpressure** is how a fast producer slows down for a slow consumer: \`write()\` returns false when the buffer is full and the producer should wait for \`drain\`. \`stream.pipeline()\` connects streams, handles backpressure and propagates errors and cleanup correctly.

Buffers hold raw binary data. Use them for bytes, and always specify encodings when converting to strings.`,
    concepts: [
      "Readable, Writable, Duplex, Transform",
      "Backpressure and highWaterMark",
      "pipeline() over pipe() for error handling",
      "Async iteration over streams",
      "Buffers and encodings",
    ],
    mistakes: [
      "Reading a whole large file into memory to send it",
      "Using pipe() without error handling",
      "Ignoring the return value of write()",
    ],
    bands: { "0-2": ["KNOW", 1.5], "2-4": ["EXPLAIN", 2], "4-6": ["APPLY", 2], "6+": ["APPLY", 2] },
    roles: { frontend: 0, backend: 4, fullstack: 3 },
    prerequisites: ["node-runtime"],
    questions: [
      {
        prompt: "How would you let users download a 2 GB CSV export without running out of memory?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "Stream the file instead of reading it all into memory, for example with fs.createReadStream piped to the response.",
        mid: "Generate rows with a database cursor, transform them to CSV lines in a Transform stream, and pipeline them into the HTTP response with Content-Disposition. Backpressure keeps memory constant. Escape CSV fields properly.",
        senior:
          "For very large or slow exports I would make it asynchronous: a job streams from the database to object storage, then the user gets a signed download link. That survives timeouts and restarts. For synchronous downloads, stream with a cursor and pipeline, set limits, and add abort handling so the query stops if the client disconnects.",
      },
      {
        mcq: true,
        prompt: "What does stream.pipeline() add over chaining .pipe()?",
        depth: "EXPLAIN",
        options: [
          "Faster throughput",
          "Error propagation and cleanup of all streams",
          "Automatic compression",
          "Parallel processing",
        ],
        correct: 1,
        explanation:
          "pipeline forwards errors and destroys all streams on failure, preventing leaks that plain pipe chains cause.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [["Node.js docs: Stream", "https://nodejs.org/api/stream.html", "DOCS"]],
  },
  {
    slug: "express-middleware",
    name: "Express routing and middleware",
    category: "Node.js",
    importance: 4,
    description: "Middleware chain, routers, error-handling middleware, validation and structure.",
    explanation: `An Express app is a chain of middleware functions \`(req, res, next)\`. Each can modify the request, end the response, or call \`next()\` to continue. Order matters: parsers and auth run before routes, error handlers run last.

Error-handling middleware has four parameters \`(err, req, res, next)\`. In Express 4, errors thrown inside async handlers must be passed to \`next(err)\` (Express 5 handles rejected promises automatically).

A maintainable structure separates routes (HTTP), controllers or handlers (request parsing), services (business logic) and repositories (data access). Validate input at the edge with a schema.`,
    concepts: [
      "Middleware order and next()",
      "Routers for modular routes",
      "Error-handling middleware",
      "Async errors in Express 4 vs 5",
      "Layered architecture: route, service, repository",
      "Input validation at the boundary",
    ],
    mistakes: [
      "Forgetting to call next() or send a response (hanging requests)",
      "Unhandled async errors crashing or hanging requests",
      "Business logic inside route handlers",
      "Sending stack traces to clients in production",
    ],
    bands: {
      "0-2": ["APPLY", 3],
      "2-4": ["APPLY", 2.5],
      "4-6": ["APPLY", 1.5],
      "6+": ["DESIGN", 2],
    },
    roles: { frontend: 0, backend: 5, fullstack: 4 },
    prerequisites: ["node-runtime", "js-async-await-errors"],
    questions: [
      {
        prompt: "How do you handle errors consistently across an Express API?",
        type: "CODING",
        depth: "APPLY",
        junior:
          "Use try/catch in handlers and an error-handling middleware at the end that sends a JSON error with a status code.",
        mid: "Define error classes (NotFoundError, ValidationError) with status codes. Wrap async handlers (or use Express 5) so rejections reach next(err). A final error middleware maps known errors to status + { code, message }, logs unknown ones with a request id, and returns a generic 500 without stack traces in production.",
        senior:
          "Same plus contracts and operations: a documented error format, correlation ids in logs and responses, distinguishing operational errors from programmer errors (the latter alert and may restart the process), process-level handlers for unhandledRejection, and graceful shutdown that stops accepting traffic and finishes in-flight requests.",
      },
      {
        mcq: true,
        prompt:
          "In Express 4, an async route handler throws after an await. What happens if it is not wrapped?",
        depth: "APPLY",
        options: [
          "Express catches it and calls the error middleware",
          "The promise rejects unhandled and the request may hang",
          "Express retries the handler",
          "The server returns 404",
        ],
        correct: 1,
        explanation:
          "Express 4 does not await handlers, so the rejection is unhandled. Wrap handlers or upgrade to Express 5, which forwards rejected promises to next.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "Express: Writing middleware",
        "https://expressjs.com/en/guide/writing-middleware.html",
        "DOCS",
      ],
      ["Express: Error handling", "https://expressjs.com/en/guide/error-handling.html", "DOCS"],
    ],
  },
  {
    slug: "rest-api-design",
    name: "REST API design",
    category: "APIs",
    importance: 4,
    description: "Resource modelling, pagination, filtering, versioning, idempotency and errors.",
    explanation: `Good REST APIs model **resources** with nouns (\`/orders/{id}/items\`), use HTTP methods for actions, and return meaningful status codes.

Practical design choices:
- **Pagination**: cursor-based for large or changing data; offset-based is simpler but slow and unstable on large tables.
- **Filtering and sorting** through query parameters with an allow-list.
- **Versioning** via the URL (\`/v1\`) or headers; prefer additive, backward-compatible changes.
- **Idempotency keys** for POSTs that must not run twice (payments).
- A consistent **error format** and documentation (OpenAPI).

GraphQL and gRPC are alternatives with different trade-offs (flexible queries vs caching simplicity; binary performance vs browser support).`,
    concepts: [
      "Resource naming and nesting",
      "Cursor vs offset pagination",
      "Versioning and backward compatibility",
      "Idempotency keys",
      "Consistent error responses",
      "REST vs GraphQL vs gRPC",
    ],
    mistakes: [
      "Verbs in URLs (/getUsers)",
      "Breaking changes without versioning",
      "Unbounded list endpoints",
      "Leaking internal database ids or fields unintentionally",
    ],
    bands: {
      "0-2": ["EXPLAIN", 2],
      "2-4": ["APPLY", 2.5],
      "4-6": ["DESIGN", 3],
      "6+": ["DESIGN", 2.5],
    },
    roles: { frontend: 2, backend: 5, fullstack: 4 },
    prerequisites: ["web-http-caching"],
    questions: [
      {
        prompt:
          "Design the API for a 'place order' endpoint that must never charge a customer twice.",
        type: "SYSTEM_DESIGN",
        depth: "DESIGN",
        junior:
          "Use POST /orders. Disable the button after clicking so the user cannot submit twice.",
        mid: "POST /orders with an Idempotency-Key header generated by the client. The server stores the key with the result; a retry with the same key returns the stored result instead of creating a new order. Payment uses the provider's idempotency support too. Return 201 with the order, 409 if the key is reused with a different payload.",
        senior:
          "Idempotency keys stored with request hash, status and response, scoped per user with a TTL; processing inside a transaction or with a unique constraint so concurrent duplicates fail safely. The payment step is a state machine (pending, authorised, captured, failed) reconciled with provider webhooks, which are also processed idempotently. Clients retry with backoff on network errors, which is now safe.",
      },
      {
        prompt: "When would you choose cursor-based pagination over offset-based?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "Cursor pagination is better for large lists and infinite scroll; offset is fine for small lists with page numbers.",
        mid: "Offset (LIMIT/OFFSET) gets slower as the offset grows because the database still scans skipped rows, and results shift when rows are inserted. Cursor pagination uses WHERE (created_at, id) < (last values) with an index, so it is fast at any depth and stable. Use offset when users need random page access on small datasets.",
        senior:
          "Same reasoning, plus design details: opaque, encoded cursors so clients don't depend on internals, a stable sort with a unique tiebreaker, an index matching the sort, and consistent behaviour when filters change. I would expose hasMore/nextCursor rather than total counts, which are expensive on large tables.",
      },
      {
        mcq: true,
        prompt: "Which URL best follows REST conventions for fetching the items of order 42?",
        depth: "KNOW",
        options: [
          "GET /getOrderItems?id=42",
          "POST /orders/42/items/list",
          "GET /orders/42/items",
          "GET /order-items-for/42",
        ],
        correct: 2,
        explanation:
          "Resources are nouns, nested where it reflects ownership, and the method expresses the action.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "Microsoft: RESTful web API design",
        "https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design",
        "ARTICLE",
      ],
      ["Stripe: Idempotent requests", "https://docs.stripe.com/api/idempotent_requests", "DOCS"],
    ],
  },
  {
    slug: "auth-sessions-jwt",
    name: "Authentication: sessions, JWT and OAuth",
    category: "APIs",
    importance: 5,
    description:
      "Password hashing, session cookies vs JWT, refresh tokens, OAuth 2.0 / OIDC and authorisation.",
    explanation: `**Authentication** proves who the user is; **authorisation** decides what they may do.

Passwords are stored as slow, salted hashes (bcrypt, scrypt, Argon2), never encrypted or plain.

**Server sessions** store state on the server and give the browser an opaque id in an HttpOnly cookie; revocation is easy. **JWTs** are signed tokens carrying claims; they are stateless and fast to verify but hard to revoke before expiry, so they are kept short-lived and paired with refresh tokens or a revocation check.

**OAuth 2.0** delegates authorisation to another provider; **OpenID Connect** adds identity on top ("Sign in with Google"). The authorisation code flow with PKCE is the standard for web and mobile apps.

Authorisation must be checked on the server for every request, at the resource level (does this user own this order?).`,
    concepts: [
      "Authentication vs authorisation",
      "Password hashing with bcrypt/Argon2",
      "Sessions vs JWT trade-offs",
      "Access and refresh tokens; rotation",
      "OAuth 2.0 authorisation code + PKCE, OIDC",
      "RBAC and resource-level checks (IDOR)",
    ],
    mistakes: [
      "Long-lived JWTs with no way to revoke",
      "Trusting a user id from the request body",
      "Checking roles in the UI only",
      "Using fast hashes (SHA-256) for passwords",
    ],
    bands: {
      "0-2": ["EXPLAIN", 3],
      "2-4": ["APPLY", 3],
      "4-6": ["DESIGN", 3],
      "6+": ["DESIGN", 2.5],
    },
    roles: { frontend: 2, backend: 5, fullstack: 5 },
    prerequisites: ["web-security"],
    questions: [
      {
        prompt: "Sessions or JWTs for a typical web app? Explain the trade-offs.",
        type: "SYSTEM_DESIGN",
        depth: "DESIGN",
        junior:
          "Sessions store data on the server and are easy to log out. JWTs are stored by the client and don't need a server lookup. For a normal web app, sessions in cookies are simpler.",
        mid: "Sessions: opaque id in an HttpOnly cookie, lookup per request (fast with Redis), instant revocation. JWT: self-contained, no lookup, good for service-to-service, but revocation requires short expiry plus refresh tokens or a denylist. For first-party web apps, cookie sessions are simpler and safer; JWTs are useful when many services must verify identity independently.",
        senior:
          "I choose by revocation and topology needs. First-party web: HttpOnly cookie with either a server session or a short-lived signed token plus a version check (hybrid). Distributed services: short-lived JWT access tokens from a central identity provider, refresh token rotation with reuse detection, and key rotation via JWKS. Either way: CSRF defence for cookies, rate-limited login, and audit logging.",
      },
      {
        prompt: "What is an IDOR vulnerability and how do you prevent it?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "IDOR is when a user can access someone else's data by changing an id in the URL. Check that the record belongs to the logged-in user.",
        mid: "Insecure Direct Object Reference: the server trusts an id from the request without checking ownership, e.g. GET /invoices/123 returns any invoice. Prevent it by scoping every query to the authenticated user (WHERE id = ? AND user_id = ?) and centralising authorisation checks. Random ids help but are not a fix.",
        senior:
          "Same, enforced structurally: data access goes through repositories that require the caller's identity, multi-tenant queries always include the tenant id (or row-level security in Postgres), and tests cover cross-user access. Return 404 rather than 403 to avoid leaking existence.",
      },
      {
        mcq: true,
        prompt: "Why is bcrypt preferred over SHA-256 for storing passwords?",
        depth: "EXPLAIN",
        options: [
          "bcrypt produces shorter hashes",
          "bcrypt is deliberately slow and salted, making brute-force attacks expensive",
          "SHA-256 can be decrypted",
          "bcrypt is encryption, not hashing",
        ],
        correct: 1,
        explanation:
          "Fast hashes let attackers try billions of guesses per second. bcrypt/Argon2 are slow by design, with a tunable cost and built-in salt.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "OWASP: Password Storage Cheat Sheet",
        "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
        "DOCS",
      ],
      ["OAuth 2.0 simplified", "https://www.oauth.com/", "ARTICLE"],
    ],
  },
  {
    slug: "node-scaling",
    name: "Scaling Node.js services",
    category: "Node.js",
    importance: 3,
    description: "Clustering, statelessness, load balancing, queues and graceful shutdown.",
    explanation: `A Node.js process uses one CPU core for JavaScript. To use more cores, run several processes (the cluster module, PM2, or multiple containers behind a load balancer).

Horizontal scaling requires **stateless** services: sessions, caches and uploads live in shared stores (Redis, a database, object storage), not in process memory or local disk.

Slow or bursty work moves to **queues** and workers. Production services also need health checks, graceful shutdown (stop accepting connections, finish in-flight requests, close pools), timeouts on outgoing calls, and observability (logs, metrics, traces).`,
    concepts: [
      "Cluster / multiple processes per machine",
      "Stateless services and shared state stores",
      "Load balancing and health checks",
      "Queues and background workers",
      "Graceful shutdown and timeouts",
      "Observability: logs, metrics, traces",
    ],
    mistakes: [
      "Keeping sessions or caches in process memory and then scaling out",
      "No timeouts on outbound HTTP calls",
      "Killing pods without draining connections",
    ],
    bands: {
      "0-2": ["KNOW", 1],
      "2-4": ["EXPLAIN", 2],
      "4-6": ["APPLY", 2.5],
      "6+": ["DESIGN", 3],
    },
    roles: { frontend: 0, backend: 4, fullstack: 3 },
    prerequisites: ["node-runtime"],
    questions: [
      {
        prompt:
          "Your Node API runs on one server and needs to handle 10x traffic. What do you change?",
        type: "SYSTEM_DESIGN",
        depth: "DESIGN",
        junior:
          "Run more instances of the app behind a load balancer and use all CPU cores with PM2 or cluster mode.",
        mid: "Make the service stateless (sessions in Redis, files in object storage), run multiple instances behind a load balancer with health checks, add a cache for hot reads, move slow work to a queue, and add database connection pooling. Load-test to find the next bottleneck, usually the database.",
        senior:
          "Profile where time goes before scaling. Then: stateless horizontal scaling with autoscaling on CPU and latency, read replicas or caching for read-heavy paths, queue-based load levelling, rate limiting and back-pressure to protect dependencies, timeouts with circuit breakers, and SLO-based alerting. Plan the database: indexes, pool sizes relative to instances, and eventually partitioning.",
      },
      {
        mcq: true,
        prompt:
          "Why must a Node service be stateless before running multiple instances behind a load balancer?",
        depth: "EXPLAIN",
        options: [
          "Node cannot store state",
          "Requests from one user may hit different instances, which would not share in-memory state",
          "Load balancers delete memory",
          "It is required by Express",
        ],
        correct: 1,
        explanation:
          "Without sticky sessions, consecutive requests may land on different processes. Shared state must live in an external store.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [["Node.js docs: Cluster", "https://nodejs.org/api/cluster.html", "DOCS"]],
  },
];
