/** JavaScript and TypeScript topics for the Full-Stack JavaScript track. */
export const javascriptTopics = [
  {
    slug: "js-types-coercion",
    name: "Types, equality and coercion",
    category: "JavaScript",
    importance: 4,
    description: "Primitive vs reference types, == vs ===, truthiness and implicit conversion.",
    explanation: `JavaScript has seven primitive types (string, number, bigint, boolean, undefined, symbol, null) and one structural type, object. Primitives are compared and copied by value; objects (including arrays and functions) are compared and copied by reference.

Strict equality (\`===\`) compares type and value with no conversion. Loose equality (\`==\`) first converts operands using the abstract equality rules, which is why \`0 == ""\` and \`null == undefined\` are true while \`null == 0\` is false.

Coercion also happens in arithmetic and conditionals: \`+\` concatenates if either side is a string, other arithmetic operators convert to numbers, and \`if (value)\` uses truthiness. The falsy values are \`false\`, \`0\`, \`-0\`, \`0n\`, \`""\`, \`null\`, \`undefined\` and \`NaN\`.`,
    concepts: [
      'Seven primitives plus object; typeof null is "object" (historical bug)',
      "=== never converts; == follows abstract equality rules",
      "The eight falsy values",
      "NaN is not equal to itself; use Number.isNaN",
      "Object.is differs from === for NaN and -0",
      "Copy by value vs copy by reference",
    ],
    mistakes: [
      "Using == and being surprised by [] == false",
      "Checking for an array with typeof instead of Array.isArray",
      "Assuming a function parameter object is a copy and mutating it",
      'Using || for defaults when 0 or "" are valid values (use ??)',
    ],
    bands: {
      "0-2": ["EXPLAIN", 2],
      "2-4": ["EXPLAIN", 2],
      "4-6": ["EXPLAIN", 1.5],
      "6+": ["EXPLAIN", 1],
    },
    roles: { frontend: 3, backend: 3, fullstack: 3 },
    prerequisites: [],
    questions: [
      {
        prompt: "What is the difference between == and ===, and when (if ever) would you use ==?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "=== checks value and type without converting. == converts the values to a common type first, so 1 == '1' is true but 1 === '1' is false. Prefer === everywhere.",
        mid: "== applies the abstract equality algorithm: null and undefined are only loosely equal to each other, booleans become numbers, and objects are converted with valueOf/toString. That makes results like [] == false (true) hard to predict. A common, readable exception is `value == null`, which checks for both null and undefined in one comparison.",
        senior:
          "I default to === and enforce it with a lint rule (eqeqeq with the 'null' exception). The only == I allow is `x == null`. For edge cases I reach for Object.is (NaN, -0) or Number.isNaN. In code review, implicit coercion bugs usually show up at boundaries such as query params and form values, which are always strings, so I parse and validate input at the edge instead of relying on comparison semantics.",
      },
      {
        prompt:
          "Explain what happens with `const b = a` when a is an object versus a number, and how you would copy an object safely.",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "For a number, b gets its own copy of the value. For an object, b points to the same object, so changing b.name also changes a.name. You can copy with the spread operator: { ...a }.",
        mid: "Spread and Object.assign make shallow copies: nested objects are still shared. For a deep copy of plain data use structuredClone (it handles Dates, Maps, Sets and cycles, but not functions or class instances). JSON.parse(JSON.stringify(x)) loses Dates, undefined and Infinity.",
        senior:
          "I avoid needing deep copies by treating state as immutable: produce new objects at the level that changes and share the rest (structural sharing). That keeps React and memoised selectors cheap because reference equality means unchanged. When a deep copy is truly needed (e.g. snapshotting a draft), structuredClone is the default; for class instances I add explicit clone methods.",
      },
      {
        mcq: true,
        prompt: "Which expression evaluates to true?",
        depth: "EXPLAIN",
        options: ["null == 0", "NaN === NaN", "null == undefined", "[] === []"],
        correct: 2,
        explanation:
          "null and undefined are loosely equal only to each other. NaN is never equal to itself, and two array literals are different references.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: Equality comparisons and sameness",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness",
        "DOCS",
      ],
      [
        "MDN: JavaScript data types",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-scope-closures",
    name: "Scope, hoisting and closures",
    category: "JavaScript",
    importance: 5,
    description:
      "Lexical scope, var/let/const, the temporal dead zone and how closures capture variables.",
    explanation: `Scope is lexical: a function can read variables from the block and functions it was written inside, regardless of where it is called from.

\`var\` is function-scoped and hoisted with the value \`undefined\`. \`let\` and \`const\` are block-scoped and hoisted too, but accessing them before the declaration throws a ReferenceError (the temporal dead zone).

A closure is a function bundled with references to the variables of the scope it was created in. Closures power private state, factories, memoisation, event handlers and React hooks. Because they capture variables (not values), a closure sees later changes to the variable, and a stale closure keeps an old value alive.`,
    concepts: [
      "Lexical scope and the scope chain",
      "var is function-scoped; let/const are block-scoped",
      "Hoisting and the temporal dead zone",
      "Closures capture variables, not values",
      "Module pattern and private state",
      "Stale closures in callbacks and React hooks",
    ],
    mistakes: [
      "Using var in a loop with async callbacks and getting the last value",
      "Assuming const makes objects immutable",
      "Creating memory leaks by holding large objects in long-lived closures",
      "Reading state inside a stale closure (setInterval in useEffect)",
    ],
    bands: {
      "0-2": ["EXPLAIN", 3],
      "2-4": ["APPLY", 3],
      "4-6": ["APPLY", 2],
      "6+": ["APPLY", 1.5],
    },
    roles: { frontend: 5, backend: 4, fullstack: 5 },
    prerequisites: [],
    questions: [
      {
        prompt: "What is a closure? Give a practical example from your own work.",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "A closure is a function that remembers variables from where it was created. Example: a counter factory `function makeCounter() { let count = 0; return () => ++count; }`. Each returned function has its own count.",
        mid: "A closure is a function plus the lexical environment it was created in. I use them for private state (module pattern), for debounce/throttle wrappers that keep a timer id between calls, and for event handlers that need context. React hooks rely on closures too: every render creates new handler closures over that render's props and state.",
        senior:
          "Closures are how JavaScript does encapsulation without classes, and they explain a class of bugs. In React, a handler created in an old render closes over old state, so effects with missing dependencies read stale values; the fixes are correct dependency arrays, functional state updates, or a ref for the latest value. On the server, closures in long-lived singletons can retain request data and leak memory, so I keep per-request data out of module scope.",
      },
      {
        prompt:
          "Predict the output and fix it:\n```js\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n```",
        type: "CODING",
        depth: "APPLY",
        junior:
          "It prints 3, 3, 3 because var is shared across iterations and the callbacks run after the loop ends. Changing var to let prints 0, 1, 2.",
        mid: "var creates one function-scoped binding; all three callbacks close over it and run after the loop finished, when i is 3. let creates a fresh binding per iteration, so each callback captures its own i. Before let, an IIFE was used to create a new scope per iteration.",
        senior:
          "Same explanation, plus the general lesson: asynchronous callbacks observe a variable's value at execution time, not at scheduling time. In real code this appears as handlers reading mutable outer state; I prefer passing values explicitly or capturing immutable snapshots, and lint rules like no-loop-func catch the pattern.",
      },
      {
        mcq: true,
        prompt: "What does this log?\n```js\nconsole.log(a);\nlet a = 1;\n```",
        depth: "EXPLAIN",
        options: ["undefined", "1", "ReferenceError", "null"],
        correct: 2,
        explanation:
          "let is hoisted but stays in the temporal dead zone until its declaration runs, so reading it earlier throws a ReferenceError. With var it would log undefined.",
        diagnostic: true,
        selfCheck: true,
      },
      {
        mcq: true,
        prompt:
          "In a React component, a setInterval created in useEffect with an empty dependency array always logs the initial count. What is the most accurate cause?",
        depth: "APPLY",
        options: [
          "setInterval is not supported inside effects",
          "The interval callback closes over the count from the first render",
          "React batches state updates inside intervals",
          "The component is not re-rendering",
        ],
        correct: 1,
        explanation:
          "The effect ran once, so its interval callback is a closure over the first render's count (a stale closure). Use a functional update, include count in dependencies, or read from a ref.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["MDN: Closures", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures", "DOCS"],
      [
        "MDN: let and the temporal dead zone",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-this-binding",
    name: "this, call/apply/bind and arrow functions",
    category: "JavaScript",
    importance: 3,
    description: "How this is determined at call time and how arrow functions differ.",
    explanation: `For regular functions, \`this\` is decided by how the function is called, not where it is defined:

- Called as \`obj.method()\` → \`this\` is \`obj\`
- Called plainly as \`fn()\` → \`undefined\` in strict mode (the global object in sloppy mode)
- Called with \`new\` → the newly created object
- Called with \`call\`, \`apply\` or \`bind\` → the object you pass

Arrow functions have no own \`this\`; they use the \`this\` of the surrounding scope. That makes them ideal for callbacks inside methods but wrong as object methods that need the object.`,
    concepts: [
      "Four binding rules: default, implicit, explicit, new",
      "Arrow functions use lexical this",
      "bind returns a new function with a fixed this",
      "call vs apply (arguments list vs array)",
      "Losing this when passing a method as a callback",
    ],
    mistakes: [
      "Passing obj.method as a callback and losing this",
      "Using an arrow function as an object method that needs this",
      "Binding in render on every call without need",
    ],
    bands: {
      "0-2": ["EXPLAIN", 2],
      "2-4": ["EXPLAIN", 1.5],
      "4-6": ["EXPLAIN", 1],
      "6+": ["EXPLAIN", 1],
    },
    roles: { frontend: 3, backend: 3, fullstack: 3 },
    prerequisites: ["js-scope-closures"],
    questions: [
      {
        prompt: "Why does `setTimeout(user.greet, 100)` lose the user, and how do you fix it?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "Passing user.greet passes only the function, so when setTimeout calls it, this is not user. Fix with setTimeout(() => user.greet(), 100) or user.greet.bind(user).",
        mid: "this is bound at call time. setTimeout calls the function plainly, so this is undefined in strict mode (or window). Wrapping in an arrow keeps the obj.method() call shape; bind creates a permanently bound function. In classes, defining handlers as arrow-function class fields binds them per instance.",
        senior:
          "Same answer, and I mention the trade-offs: arrow class fields allocate one function per instance and do not live on the prototype, which matters for very many instances or for mocking in tests. In most modern codebases I avoid relying on this altogether for callbacks by using closures or plain functions taking explicit arguments.",
      },
      {
        mcq: true,
        prompt: "Inside an arrow function defined in a class method, what does this refer to?",
        depth: "EXPLAIN",
        options: [
          "The arrow function itself",
          "The global object",
          "The this of the enclosing method (the instance)",
          "undefined, always",
        ],
        correct: 2,
        explanation:
          "Arrow functions do not have their own this; they use the enclosing scope's this, here the instance the method was called on.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: this",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-prototypes-classes",
    name: "Prototypes and classes",
    category: "JavaScript",
    importance: 3,
    description: "Prototype chain, class syntax as sugar, inheritance vs composition.",
    explanation: `Every object has an internal link to a prototype object. Property lookups walk this prototype chain until the property is found or the chain ends at \`null\`.

\`class\` syntax is mostly sugar over constructor functions and prototypes: methods live on \`Class.prototype\`, \`extends\` sets up the chain, and \`super\` calls the parent. Classes add real features too: private fields (\`#field\`), static blocks, and constructors that throw if called without \`new\`.

In application code, composition (small functions and objects combined) is usually preferred over deep inheritance hierarchies.`,
    concepts: [
      "Prototype chain lookup",
      "Methods on prototype are shared between instances",
      "class/extends/super as prototype sugar",
      "Private fields with #",
      "Composition over inheritance",
    ],
    mistakes: [
      "Mutating built-in prototypes",
      "Deep inheritance hierarchies that are hard to change",
      "Forgetting super() before using this in a subclass constructor",
    ],
    bands: {
      "0-2": ["KNOW", 1.5],
      "2-4": ["EXPLAIN", 2],
      "4-6": ["EXPLAIN", 1.5],
      "6+": ["EXPLAIN", 1],
    },
    roles: { frontend: 2, backend: 3, fullstack: 3 },
    prerequisites: ["js-this-binding"],
    questions: [
      {
        prompt: "How does inheritance work in JavaScript under the class syntax?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "Objects inherit from other objects through the prototype chain. A class's methods are stored on its prototype, and instances can use them. extends makes one class's prototype inherit from another's.",
        mid: "When you read obj.x and x is not an own property, the engine checks obj's prototype, then its prototype, and so on. class Child extends Parent sets Child.prototype's prototype to Parent.prototype and Child's own prototype to Parent (for statics). super.method() calls the parent's version.",
        senior:
          "Beyond the mechanics: I use classes for things with identity and lifecycle (a repository, a service with injected dependencies) and plain functions and data elsewhere. I avoid inheritance more than one level deep; when variation grows I switch to composition or strategy objects, which are easier to test and to change.",
      },
      {
        mcq: true,
        prompt: "Where are methods declared in a class body stored?",
        depth: "KNOW",
        options: [
          "On each instance",
          "On the class's prototype",
          "In a hidden global registry",
          "On Object.prototype",
        ],
        correct: 1,
        explanation:
          "Class methods are added to Class.prototype and shared by all instances through the prototype chain.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: Inheritance and the prototype chain",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-event-loop",
    name: "The event loop",
    category: "JavaScript",
    importance: 5,
    description:
      "Call stack, task and microtask queues, and why async code runs in the order it does.",
    explanation: `JavaScript runs your code on a single thread with one call stack. Long-running work blocks everything else on that thread.

Asynchronous work is coordinated by the event loop:

1. Run the current script until the call stack is empty.
2. Run all queued **microtasks** (promise reactions, \`queueMicrotask\`, \`MutationObserver\`), including ones queued while draining.
3. In browsers, possibly render.
4. Take the next **task** (timers, I/O callbacks, UI events) and repeat.

So \`Promise.resolve().then(a)\` always runs before \`setTimeout(b, 0)\`. Node.js has the same microtask rule plus its own phases (timers, poll, check) and \`process.nextTick\`, which runs before other microtasks.`,
    concepts: [
      "Single-threaded call stack",
      "Tasks (macrotasks) vs microtasks",
      "Microtasks drain completely before the next task",
      "setTimeout(fn, 0) is not immediate",
      "Rendering happens between tasks in browsers",
      "Blocking the main thread freezes the UI",
    ],
    mistakes: [
      "Assuming setTimeout 0 runs before promise callbacks",
      "Running CPU-heavy loops on the main thread",
      "Infinite microtask loops starving rendering",
      "Thinking async functions run on another thread",
    ],
    bands: { "0-2": ["EXPLAIN", 3], "2-4": ["APPLY", 3], "4-6": ["APPLY", 2], "6+": ["APPLY", 2] },
    roles: { frontend: 5, backend: 5, fullstack: 5 },
    prerequisites: [],
    questions: [
      {
        prompt:
          "Predict the output:\n```js\nconsole.log('A');\nsetTimeout(() => console.log('B'), 0);\nPromise.resolve().then(() => console.log('C'));\nconsole.log('D');\n```",
        type: "CODING",
        depth: "EXPLAIN",
        junior:
          "A, D, C, B. Synchronous logs run first; the promise callback is a microtask and runs before the setTimeout callback, which is a task.",
        mid: "A and D run synchronously. After the script finishes, the event loop drains the microtask queue (C) before taking the next task from the timer queue (B). The 0 ms delay only means 'as soon as possible after the current task and its microtasks'.",
        senior:
          "A, D, C, B, and I would add how this generalises: any number of chained .then callbacks will all run before B, because microtasks queued during draining are also drained. That is why a promise-heavy loop can starve rendering and timers. In Node, process.nextTick callbacks would run even before C.",
      },
      {
        prompt:
          "A page freezes for two seconds when a user clicks 'Export'. How do you diagnose and fix it?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "Some code is probably running for too long on the main thread. I would look at the click handler and move heavy work out, for example with setTimeout or a Web Worker.",
        mid: "Profile it in the Performance panel to find the long task. If it is CPU work (formatting a large CSV), move it to a Web Worker or split it into chunks that yield back to the event loop (await a timeout or scheduler.yield). If it is layout thrashing, batch DOM reads and writes. Show progress so the UI responds.",
        senior:
          "First measure: long tasks in the profiler, INP in field data. Then pick the fix by cause: a Worker for pure computation, chunking with yielding for work that needs the DOM, server-side generation with a download link for very large exports, and streaming if the data is large. I would add a performance budget or INP alert so the regression does not return.",
      },
      {
        mcq: true,
        prompt: "Which of these is scheduled as a microtask?",
        depth: "KNOW",
        options: [
          "setTimeout callback",
          "A click event handler",
          "A .then() callback of a resolved promise",
          "setInterval callback",
        ],
        correct: 2,
        explanation: "Promise reactions are microtasks. Timers and UI events are tasks.",
        diagnostic: true,
        selfCheck: true,
      },
      {
        mcq: true,
        prompt:
          "A loop schedules 10,000 chained promise callbacks. What happens to a setTimeout(fn, 0) scheduled before the loop?",
        depth: "APPLY",
        options: [
          "It runs first because it was scheduled first",
          "It runs interleaved with the promise callbacks",
          "It runs only after all the microtasks have drained",
          "It is cancelled",
        ],
        correct: 2,
        explanation:
          "The event loop drains the entire microtask queue, including newly queued microtasks, before running the next task.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: The event loop",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop",
        "DOCS",
      ],
      [
        "Jake Archibald: Tasks, microtasks, queues and schedules",
        "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/",
        "ARTICLE",
      ],
    ],
  },
  {
    slug: "js-promises",
    name: "Promises",
    category: "JavaScript",
    importance: 5,
    description:
      "Promise states, chaining, combinators (all, allSettled, race, any) and error propagation.",
    explanation: `A promise represents a value that will be available later. It is **pending**, then either **fulfilled** with a value or **rejected** with a reason, and it settles only once.

\`.then\` returns a new promise, which is what makes chaining work: returning a value fulfils the next promise, returning a promise adopts its state, and throwing rejects it. A rejection skips \`.then\` handlers until a \`.catch\` (or the second argument of \`.then\`) handles it.

Combinators:
- \`Promise.all\` – fulfils with all values, rejects on the first rejection
- \`Promise.allSettled\` – waits for all and reports each outcome
- \`Promise.race\` – settles like the first one to settle
- \`Promise.any\` – fulfils with the first fulfilment, rejects only if all reject`,
    concepts: [
      "Pending, fulfilled, rejected; settles once",
      "then returns a new promise",
      "Errors propagate down the chain to the nearest catch",
      "all vs allSettled vs race vs any",
      "Unhandled rejections",
      "Promise executor runs synchronously",
    ],
    mistakes: [
      "Forgetting to return inside .then, breaking the chain",
      "Nesting promises instead of chaining",
      "Using Promise.all when partial failure should not cancel the rest",
      "Swallowing errors with an empty catch",
    ],
    bands: {
      "0-2": ["EXPLAIN", 3],
      "2-4": ["APPLY", 3],
      "4-6": ["APPLY", 2],
      "6+": ["APPLY", 1.5],
    },
    roles: { frontend: 5, backend: 5, fullstack: 5 },
    prerequisites: ["js-event-loop"],
    questions: [
      {
        prompt:
          "You need data from three independent APIs. One sometimes fails, but the page should still show the other two. How do you write this?",
        type: "CODING",
        depth: "APPLY",
        junior:
          "Use Promise.allSettled with the three fetches, then check each result's status and use the value if it is fulfilled.",
        mid: "Run them in parallel with Promise.allSettled([a(), b(), c()]); map results to { value } or { error } and render each section independently. Promise.all would reject as soon as one fails and lose the other two results. Add a timeout per call with AbortController so a slow API does not block the page.",
        senior:
          "allSettled for independence, plus per-call timeouts via AbortSignal.timeout, retries with backoff only for idempotent calls, and graceful degradation in the UI (each section shows its own error state). If one call is critical, I await it separately and fail fast. On the server I would also cap concurrency and add observability (latency and error rate per dependency).",
      },
      {
        prompt:
          "What is the difference between Promise.all and Promise.allSettled? When would you use Promise.any?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "Promise.all fails if any promise fails. Promise.allSettled waits for all and tells you which succeeded and which failed. Promise.any gives the first successful one.",
        mid: "all short-circuits on the first rejection and fulfils with an array of values in input order. allSettled never rejects; it gives { status, value | reason } for each. any fulfils with the first fulfilment and only rejects (with an AggregateError) if every promise rejects. Use any for redundancy, e.g. the fastest of several mirrors.",
        senior:
          "Same semantics, plus a caveat: none of them cancels the losing promises; the work keeps running. For real cancellation I pass an AbortSignal and abort the rest once I have what I need. I also keep an eye on unhandled rejections from promises that lose a race.",
      },
      {
        mcq: true,
        prompt:
          "What does this chain log?\n```js\nPromise.resolve(1)\n  .then(x => { throw new Error('x') })\n  .then(() => console.log('then'))\n  .catch(() => console.log('catch'))\n  .then(() => console.log('after'));\n```",
        depth: "EXPLAIN",
        options: ["then, after", "catch, after", "catch", "then, catch, after"],
        correct: 1,
        explanation:
          "The throw rejects the chain, so the next then is skipped. catch handles it and returns a fulfilled promise, so the final then runs.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: Using promises",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises",
        "DOCS",
      ],
      [
        "MDN: Promise.allSettled",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-async-await-errors",
    name: "async/await and error handling",
    category: "JavaScript",
    importance: 4,
    description: "Writing async code with async/await, try/catch, parallelism and cancellation.",
    explanation: `\`async\` functions always return a promise. \`await\` pauses the function until the promise settles, returning the value or throwing the rejection reason, so ordinary \`try/catch/finally\` works for async errors.

Sequential awaits run one after another. For independent work, start everything first and await together (\`await Promise.all([...])\`).

Cancellation is done with \`AbortController\`: pass its signal to \`fetch\` and other APIs, and call \`abort()\` when the result is no longer needed (component unmounted, user typed again, timeout).`,
    concepts: [
      "async functions return promises",
      "try/catch/finally around await",
      "Sequential vs parallel awaits",
      "AbortController and AbortSignal.timeout",
      "Error boundaries between layers (wrap, add context, rethrow)",
    ],
    mistakes: [
      "Awaiting in a loop when calls are independent",
      "Using forEach with async callbacks and expecting it to wait",
      "Catching errors and returning undefined silently",
      "Not cancelling stale requests (race conditions in search boxes)",
    ],
    bands: {
      "0-2": ["EXPLAIN", 2],
      "2-4": ["APPLY", 2.5],
      "4-6": ["APPLY", 2],
      "6+": ["APPLY", 1.5],
    },
    roles: { frontend: 4, backend: 5, fullstack: 5 },
    prerequisites: ["js-promises"],
    questions: [
      {
        prompt:
          "Why doesn't this wait for the saves, and how do you fix it?\n```js\nitems.forEach(async (item) => { await save(item); });\nconsole.log('done');\n```",
        type: "CODING",
        depth: "APPLY",
        junior:
          "forEach does not wait for async callbacks, so 'done' logs before saves finish. Use a for...of loop with await, or Promise.all(items.map(save)).",
        mid: "forEach ignores the promises its callback returns. Use `for (const item of items) await save(item)` for sequential saves, or `await Promise.all(items.map(save))` for parallel ones. Choose based on whether order matters and whether the backend can handle the load.",
        senior:
          "Same fix, and I would bound concurrency for large lists (process in batches of N, or a small pool) so we neither hammer the API nor take forever sequentially. I would use allSettled if partial success is acceptable and report which items failed, with retries for transient errors.",
      },
      {
        prompt:
          "How do you prevent a search-as-you-type box from showing results for an old query?",
        type: "CONCEPT",
        depth: "APPLY",
        junior: "Debounce the input and ignore responses that do not match the latest query.",
        mid: "Debounce input, and abort the previous request with an AbortController when a new one starts, so an older, slower response can never overwrite newer results. In React this lives in an effect whose cleanup calls abort().",
        senior:
          "Debounce plus abort on change, plus caching by query so going back is instant; a data-fetching library (TanStack Query) handles dedupe, cancellation and stale-while-revalidate. On the server side, cap results and make the endpoint cheap because type-ahead traffic is spiky.",
      },
      {
        mcq: true,
        prompt:
          "Two independent requests take 1s and 2s. How long does `const a = await f1(); const b = await f2();` take?",
        depth: "EXPLAIN",
        options: ["About 1s", "About 2s", "About 3s", "It depends on the event loop"],
        correct: 2,
        explanation:
          "Sequential awaits wait for f1 before starting f2. Starting both and awaiting Promise.all takes about 2s.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: async function",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function",
        "DOCS",
      ],
      [
        "MDN: AbortController",
        "https://developer.mozilla.org/en-US/docs/Web/API/AbortController",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-array-object-methods",
    name: "Arrays, objects and immutable updates",
    category: "JavaScript",
    importance: 4,
    description:
      "map/filter/reduce, destructuring, spread, Map/Set and updating data without mutation.",
    explanation: `Everyday JavaScript is data transformation. The core array methods are \`map\` (transform each item), \`filter\` (keep some items), \`reduce\` (fold into one value), \`find\`/\`some\`/\`every\`, and \`flatMap\`. Newer non-mutating methods (\`toSorted\`, \`toReversed\`, \`with\`) return copies instead of changing the original.

Destructuring and spread make immutable updates concise: \`{ ...user, name }\` creates a new object, \`[...list, item]\` a new array. \`Map\` and \`Set\` are better than plain objects for dynamic keys, non-string keys and frequent additions/removals.`,
    concepts: [
      "map, filter, reduce, find, some, every, flatMap",
      "sort mutates; toSorted does not",
      "Destructuring with defaults and rest",
      "Spread for shallow immutable updates",
      "Map and Set vs objects and arrays",
      "Grouping with Object.groupBy / reduce",
    ],
    mistakes: [
      "Sorting props or state in place",
      "Using reduce where map/filter is clearer",
      "O(n²) lookups with find inside loops instead of a Map",
      "Using an array of numbers without a compare function in sort",
    ],
    bands: { "0-2": ["APPLY", 3], "2-4": ["APPLY", 2], "4-6": ["APPLY", 1], "6+": ["APPLY", 1] },
    roles: { frontend: 4, backend: 4, fullstack: 4 },
    prerequisites: ["js-types-coercion"],
    questions: [
      {
        prompt:
          "Given orders `[{ userId, amount }]`, return total amount per user, sorted by total descending.",
        type: "CODING",
        depth: "APPLY",
        junior:
          "Loop over orders and add each amount to totals[userId] in an object, then turn it into an array with Object.entries and sort by the total.",
        mid: "```js\nconst totals = new Map();\nfor (const { userId, amount } of orders) {\n  totals.set(userId, (totals.get(userId) ?? 0) + amount);\n}\nreturn [...totals].map(([userId, total]) => ({ userId, total }))\n  .toSorted((a, b) => b.total - a.total);\n```\nO(n + k log k), using a Map so user ids of any type work.",
        senior:
          "The Map-based single pass above. I would also mention money handling: store amounts as integer paise/cents to avoid floating-point drift, and if this ran in the database I would push it down to a GROUP BY with an index instead of loading all orders into memory.",
      },
      {
        mcq: true,
        prompt: "Which of these does NOT mutate the original array?",
        depth: "KNOW",
        options: ["arr.sort()", "arr.reverse()", "arr.toSorted()", "arr.splice(0, 1)"],
        correct: 2,
        explanation:
          "toSorted returns a sorted copy. sort, reverse and splice change the array in place.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: Array",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
        "DOCS",
      ],
      [
        "MDN: Map",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-debounce-throttle",
    name: "Debounce, throttle and memoisation",
    category: "JavaScript",
    importance: 3,
    description: "Rate-limiting functions and caching results; a classic machine-coding question.",
    explanation: `**Debounce** delays a call until a quiet period has passed (search input, window resize end). **Throttle** allows at most one call per interval (scroll position, analytics pings). Both are built with closures that keep a timer id or last-call timestamp between invocations.

**Memoisation** caches a pure function's results by its arguments. It trades memory for speed and is only correct for pure functions.`,
    concepts: [
      "Debounce: wait for silence",
      "Throttle: at most once per interval",
      "Leading vs trailing calls",
      "Preserving this and arguments",
      "Memoisation and cache invalidation",
    ],
    mistakes: [
      "Creating a new debounced function on every React render",
      "Losing this/arguments in the wrapper",
      "Unbounded memo caches leaking memory",
    ],
    bands: { "0-2": ["APPLY", 2], "2-4": ["APPLY", 2], "4-6": ["APPLY", 1], "6+": ["APPLY", 1] },
    roles: { frontend: 4, backend: 2, fullstack: 3 },
    prerequisites: ["js-scope-closures", "js-event-loop"],
    questions: [
      {
        prompt: "Implement debounce(fn, wait).",
        type: "CODING",
        depth: "APPLY",
        junior:
          "```js\nfunction debounce(fn, wait) {\n  let timer;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}\n```\nEvery call resets the timer, so fn runs once after calls stop for `wait` ms.",
        mid: "The version above, preserving this and arguments. I would add a cancel() method that clears the timer (useful on unmount) and optionally flush(). In React I create the debounced function once (useMemo or a ref) so the timer survives re-renders.",
        senior:
          "Same core plus options: leading/trailing edges and maxWait (which turns it into a throttle-debounce hybrid, like lodash). I would discuss returning a promise for the eventual result, cancelling in-flight work with AbortController, and testing it with fake timers.",
      },
      {
        mcq: true,
        prompt: "For tracking scroll position every 100ms while the user scrolls, which fits best?",
        depth: "EXPLAIN",
        options: [
          "Debounce with 100ms",
          "Throttle with 100ms",
          "Memoisation",
          "setInterval regardless of scrolling",
        ],
        correct: 1,
        explanation:
          "Throttle runs at most once per interval while events keep firing. Debounce would wait until scrolling stops.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: setTimeout",
        "https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout",
        "DOCS",
      ],
    ],
  },
  {
    slug: "js-modules",
    name: "Modules and bundling",
    category: "JavaScript",
    importance: 3,
    description: "ES modules vs CommonJS, tree shaking, code splitting and dynamic import.",
    explanation: `ES modules (\`import\`/\`export\`) are static: imports are resolved before code runs, which enables tree shaking (removing unused exports) and live bindings. CommonJS (\`require\`/\`module.exports\`) is dynamic and synchronous; it is still common in older Node.js code.

Bundlers (webpack, Vite/Rollup, Turbopack) build a dependency graph, transform code (TypeScript, JSX), split it into chunks and minify it. \`import()\` loads a module on demand and is the basis for route-level and component-level code splitting.`,
    concepts: [
      "Static ESM vs dynamic CommonJS",
      "Named vs default exports",
      "Tree shaking and side effects",
      "Dynamic import() and code splitting",
      "Circular dependencies",
    ],
    mistakes: [
      "Importing a whole library for one helper",
      "Side effects at module top level that break tree shaking",
      "Circular imports causing undefined values at startup",
    ],
    bands: {
      "0-2": ["KNOW", 1.5],
      "2-4": ["EXPLAIN", 1.5],
      "4-6": ["APPLY", 2],
      "6+": ["APPLY", 1.5],
    },
    roles: { frontend: 3, backend: 3, fullstack: 3 },
    prerequisites: [],
    questions: [
      {
        prompt: "What is tree shaking and why does it work better with ES modules than CommonJS?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "Tree shaking removes code you never use from the bundle. ES module imports are static, so the bundler can see what is used.",
        mid: "ESM import/export statements are static and top-level, so a bundler can determine at build time which exports are referenced and drop the rest. require can be called conditionally with computed paths, so its usage cannot be analysed reliably. Libraries mark themselves side-effect free in package.json so whole files can be dropped.",
        senior:
          "Plus practical levers: prefer per-function imports or libraries with good ESM builds, mark sideEffects correctly, check the bundle analyser in CI, and use dynamic import for heavy, rarely used features (charts, editors). For Node services, ESM vs CJS mostly affects interop and tooling rather than size.",
      },
      {
        mcq: true,
        prompt: "What does `import('./Chart.js')` return?",
        depth: "KNOW",
        options: [
          "The module synchronously",
          "A promise for the module namespace object",
          "A URL",
          "Nothing; it only prefetches",
        ],
        correct: 1,
        explanation:
          "Dynamic import returns a promise that resolves to the module namespace, letting bundlers split it into a separate chunk.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: JavaScript modules",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules",
        "DOCS",
      ],
    ],
  },
  {
    slug: "ts-fundamentals",
    name: "TypeScript fundamentals and generics",
    category: "TypeScript",
    importance: 4,
    description:
      "Structural typing, unions and narrowing, generics, utility types and strict mode.",
    explanation: `TypeScript adds a static type system that is erased at compile time. Typing is **structural**: two types are compatible if their shapes match, regardless of names.

Union types (\`A | B\`) model values that can be one of several shapes; **narrowing** (\`typeof\`, \`in\`, discriminant fields, type guards) tells the compiler which one you have. **Generics** let functions and types work over many types while preserving relationships (\`function first<T>(xs: T[]): T | undefined\`).

Utility types such as \`Partial\`, \`Pick\`, \`Omit\`, \`Record\` and \`ReturnType\` derive types from others. Strict mode (especially \`strictNullChecks\`) is what makes TypeScript catch real bugs. Types do not exist at runtime, so external input must still be validated (for example with Zod).`,
    concepts: [
      "Structural typing",
      "Unions, discriminated unions and narrowing",
      "Generics and constraints (extends)",
      "Utility types (Partial, Pick, Omit, Record)",
      "unknown vs any",
      "Types are erased: validate at runtime boundaries",
    ],
    mistakes: [
      "Using any to silence errors",
      "Casting with as instead of narrowing",
      "Trusting API responses because they have a type",
      "Disabling strict mode",
    ],
    bands: {
      "0-2": ["EXPLAIN", 3],
      "2-4": ["APPLY", 3],
      "4-6": ["APPLY", 2.5],
      "6+": ["DESIGN", 3],
    },
    roles: { frontend: 4, backend: 4, fullstack: 4 },
    prerequisites: ["js-types-coercion"],
    questions: [
      {
        prompt: "What is a discriminated union and why is it useful?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "It is a union of object types that share a field with different literal values, like type: 'loading' | 'success' | 'error'. Checking that field tells TypeScript which type you have.",
        mid: "```ts\ntype State =\n  | { status: 'loading' }\n  | { status: 'success'; data: User }\n  | { status: 'error'; error: string };\n```\nSwitching on status narrows the type, so data is only accessible in the success branch. It makes impossible states unrepresentable, unlike separate isLoading/data/error fields.",
        senior:
          "I use them for state machines, API results and events. With a `never` check in the default case, adding a new variant becomes a compile error everywhere it is not handled (exhaustiveness checking). Combined with Zod schemas at the boundary, the runtime data and the types stay in sync.",
      },
      {
        prompt: "When would you use unknown instead of any?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior: "unknown is the safe version of any: you must check the type before using it.",
        mid: "Both accept any value, but any disables type checking for everything it touches, while unknown forces narrowing before use. Use unknown for untrusted data: JSON.parse results, catch clause errors, external API responses. Then narrow with type guards or validate with a schema.",
        senior:
          "Same, plus policy: lint against any (no-explicit-any), use unknown at all trust boundaries and turn it into typed data via validation (Zod's parse returns a typed value). That keeps 'unsafe' code to a few audited places.",
      },
      {
        mcq: true,
        prompt: "What does `Partial<User>` produce?",
        depth: "KNOW",
        options: [
          "A User with all properties required",
          "A User type with all properties optional",
          "A copy of a User value",
          "A runtime validator for User",
        ],
        correct: 1,
        explanation:
          "Partial is a compile-time utility type that makes every property optional. Types do not create runtime values or validators.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["TypeScript Handbook", "https://www.typescriptlang.org/docs/handbook/intro.html", "DOCS"],
      [
        "TypeScript: Narrowing",
        "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
        "DOCS",
      ],
    ],
  },
];
