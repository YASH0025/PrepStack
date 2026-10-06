/** React, browser and web platform topics. */
export const reactTopics = [
  {
    slug: "react-rendering",
    name: "React rendering and reconciliation",
    category: "React",
    importance: 5,
    description:
      "What triggers a render, how React reconciles, keys, and the render vs commit phases.",
    explanation: `A component re-renders when its state changes, its parent re-renders, or a context it reads changes. Rendering means calling the component function to get a new element tree; it does not necessarily touch the DOM.

React then **reconciles**: it compares the new tree with the previous one and commits only the differences to the DOM. Elements of a different type replace the whole subtree; elements of the same type are updated in place. In lists, \`key\` tells React which item is which across renders, so items keep their state when the list is reordered.

Rendering must be pure: no side effects, no mutation of props or state. Side effects go in event handlers or effects, which run after the commit.`,
    concepts: [
      "Triggers: state change, parent render, context change",
      "Render phase (pure) vs commit phase (DOM updates)",
      "Reconciliation by element type and key",
      "Stable, unique keys in lists (not array index for dynamic lists)",
      "Strict Mode double-invokes renders in development to surface impurity",
      "Batching of state updates",
    ],
    mistakes: [
      "Using array index as key in lists that can reorder or filter",
      "Mutating state and expecting a re-render",
      "Defining components inside other components (remounts every render)",
      "Doing side effects during render",
    ],
    bands: {
      "0-2": ["EXPLAIN", 3],
      "2-4": ["APPLY", 3],
      "4-6": ["APPLY", 2.5],
      "6+": ["DESIGN", 3],
    },
    roles: { frontend: 5, backend: 0, fullstack: 5 },
    prerequisites: ["js-scope-closures"],
    questions: [
      {
        prompt: "Why are keys needed in lists, and what goes wrong if you use the array index?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "Keys help React identify which list items changed. With index keys, if you insert or delete an item, React may reuse the wrong component and show stale input values.",
        mid: "During reconciliation React matches children by key. If keys are indexes and you insert at the top, every item's key shifts, so React updates every item's props and, worse, keeps component state (like an input's value or an open dropdown) attached to the wrong row. Use a stable id from the data.",
        senior:
          "Keys are identity. Beyond lists, I use key deliberately to reset state: changing a form's key when the selected record changes remounts it with fresh state, which is cleaner than syncing state in effects. Index keys are fine only for static lists that never reorder, filter or have stateful children.",
      },
      {
        prompt:
          "A component re-renders too often and the page feels slow. How do you find the cause and fix it?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "Use the React DevTools Profiler to see which components render and why. Avoid creating new objects and functions in props when they cause child re-renders, and use React.memo where it helps.",
        mid: "Profile with React DevTools ('why did this render'). Common causes: state held too high (lift it down or split components), context values recreated each render, unstable props breaking React.memo. Fixes: colocate state, memoise context values, useMemo/useCallback for props of memoised children, virtualise long lists.",
        senior:
          "Measure first (Profiler, INP in production). Most wins are structural: move state closer to where it is used, split contexts by update frequency, pass children instead of re-creating subtrees, virtualise large lists, and defer non-urgent updates with useDeferredValue or transitions. With the React Compiler, manual memoisation is often unnecessary, so I check whether it is enabled before adding useMemo everywhere.",
      },
      {
        mcq: true,
        prompt: "What happens when a parent component re-renders?",
        depth: "KNOW",
        options: [
          "Only children whose props changed re-render",
          "By default, all its children re-render as well",
          "Nothing re-renders unless state changed in the child",
          "The DOM is fully rebuilt",
        ],
        correct: 1,
        explanation:
          "By default React re-renders the whole subtree. React.memo (or the React Compiler) can skip children with unchanged props. The DOM is only updated where output differs.",
        diagnostic: true,
        selfCheck: true,
      },
      {
        mcq: true,
        prompt:
          "A form component keeps the previous user's typed values after you select a different user. What is the cleanest fix?",
        depth: "APPLY",
        options: [
          "Copy props into state with useEffect whenever userId changes",
          "Render the form with key={userId}",
          "Force a re-render with a counter",
          "Use useMemo for the form",
        ],
        correct: 1,
        explanation:
          "Changing the key remounts the component, resetting its state. Syncing props into state with effects causes extra renders and bugs.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["React docs: Render and commit", "https://react.dev/learn/render-and-commit", "DOCS"],
      [
        "React docs: Preserving and resetting state",
        "https://react.dev/learn/preserving-and-resetting-state",
        "DOCS",
      ],
    ],
  },
  {
    slug: "react-hooks",
    name: "Hooks: state, effects and refs",
    category: "React",
    importance: 5,
    description:
      "useState, useEffect, useRef, dependency arrays, cleanup, and when you don't need an effect.",
    explanation: `\`useState\` holds values that should trigger a re-render. Updates are queued; use the functional form (\`setCount(c => c + 1)\`) when the new value depends on the old one.

\`useEffect\` synchronises a component with something outside React (subscriptions, timers, non-React widgets, network). It runs after commit; its dependency array lists every reactive value it reads, and its cleanup runs before the next effect and on unmount.

\`useRef\` holds a mutable value that does not trigger renders, or a reference to a DOM node.

Many effects are unnecessary: derived values should be computed during render, and responses to user actions belong in event handlers.`,
    concepts: [
      "Rules of hooks (top level, React functions only)",
      "Functional state updates",
      "Effect dependencies and cleanup",
      "Effects synchronise with external systems",
      "You might not need an effect (derived state, event handlers)",
      "useRef for mutable values and DOM nodes",
    ],
    mistakes: [
      "Missing dependencies causing stale values",
      "Storing derived data in state and syncing it with an effect",
      "Fetching in effects without handling race conditions or cleanup",
      "Calling hooks conditionally",
    ],
    bands: { "0-2": ["APPLY", 4], "2-4": ["APPLY", 3], "4-6": ["APPLY", 2], "6+": ["DESIGN", 2] },
    roles: { frontend: 5, backend: 0, fullstack: 5 },
    prerequisites: ["react-rendering", "js-scope-closures"],
    questions: [
      {
        prompt: "When should you NOT use useEffect? Give examples.",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "You don't need an effect to compute a value from props or state; just calculate it during render. You also don't need one to respond to a button click; do it in the click handler.",
        mid: "Effects are for syncing with external systems. Not needed for: derived values (fullName from first and last name; compute inline or useMemo if expensive), resetting state on prop change (use a key), reacting to user events (event handlers), and notifying parents about changes (call their callback in the same handler).",
        senior:
          "I treat every effect as a smell to justify. Data fetching goes to a library or framework loader (server components, TanStack Query) that handles caching and races. Chains of effects setting state are replaced by computing in render or a reducer. Legitimate effects: subscriptions, timers, integrating non-React widgets, analytics on mount. That cuts render cascades and bugs.",
      },
      {
        prompt: "Write a useWindowWidth hook.",
        type: "CODING",
        depth: "APPLY",
        junior:
          "```js\nfunction useWindowWidth() {\n  const [width, setWidth] = useState(window.innerWidth);\n  useEffect(() => {\n    const onResize = () => setWidth(window.innerWidth);\n    window.addEventListener('resize', onResize);\n    return () => window.removeEventListener('resize', onResize);\n  }, []);\n  return width;\n}\n```",
        mid: "Same structure, guarding for server rendering (no window on the server: initialise lazily or default), and throttling the resize handler. The cleanup is essential to avoid leaking listeners.",
        senior:
          "I would use useSyncExternalStore: subscribe adds the listener, getSnapshot returns innerWidth, getServerSnapshot returns a default. It avoids tearing in concurrent rendering and handles SSR cleanly. Often a CSS media query or container query is the better tool than JS width at all.",
      },
      {
        mcq: true,
        prompt: "When does the cleanup function returned by useEffect run?",
        depth: "EXPLAIN",
        options: [
          "Only when the component unmounts",
          "Before the effect re-runs and when the component unmounts",
          "Before every render",
          "Never, unless called manually",
        ],
        correct: 1,
        explanation:
          "Cleanup runs before the next run of the effect (when dependencies changed) and on unmount.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "React docs: You Might Not Need an Effect",
        "https://react.dev/learn/you-might-not-need-an-effect",
        "DOCS",
      ],
      ["React docs: useEffect", "https://react.dev/reference/react/useEffect", "DOCS"],
    ],
  },
  {
    slug: "react-state-management",
    name: "State management and data fetching",
    category: "React",
    importance: 4,
    description: "Local vs shared vs server state, context, reducers, and when to use a library.",
    explanation: `Not all state is the same:

- **Local UI state** (an open menu, a form input) lives in the component.
- **Shared client state** (current theme, a multi-step wizard) can be lifted to a common parent, put in context, or kept in a small store.
- **Server state** (data from an API) is a cache of remote data with its own concerns: loading, errors, refetching, invalidation and deduplication. Libraries such as TanStack Query or RTK Query solve this; global stores are a poor fit.
- **URL state** (filters, tabs, pagination) belongs in the URL so it survives refresh and can be shared.

\`useReducer\` helps when updates are complex or depend on the previous state. Context is a dependency-injection mechanism, not a performance tool: every consumer re-renders when its value changes.`,
    concepts: [
      "Local, shared, server and URL state",
      "Lifting state up vs context",
      "useReducer for complex transitions",
      "Server state libraries (caching, invalidation)",
      "Context re-render behaviour",
    ],
    mistakes: [
      "Putting server data in a global store and syncing it manually",
      "One giant context that re-renders everything",
      "Keeping filters in state instead of the URL",
      "Duplicating the same data in several places",
    ],
    bands: {
      "0-2": ["EXPLAIN", 2],
      "2-4": ["APPLY", 3],
      "4-6": ["DESIGN", 3],
      "6+": ["DESIGN", 2.5],
    },
    roles: { frontend: 5, backend: 0, fullstack: 4 },
    prerequisites: ["react-hooks"],
    questions: [
      {
        prompt:
          "How do you decide between local state, context, a store like Redux/Zustand, and a server-state library?",
        type: "SYSTEM_DESIGN",
        depth: "DESIGN",
        junior:
          "Use local state by default. Use context for things many components need, like the theme or current user. Use Redux or a similar store for large apps with a lot of shared state.",
        mid: "Classify the state first. Server data goes to a server-state library (caching, refetching, mutations). URL-worthy state goes to the URL. Local UI state stays local. What remains, genuinely shared client state, is usually small: context for rarely changing values, a store when many components update it often.",
        senior:
          "I map each piece of state to an owner and a lifetime. Server state: query library or server components, with explicit invalidation after mutations. URL: anything shareable. Client: local first, a store only for cross-cutting interactive state (an editor, a multi-pane workspace). I also weigh team familiarity and devtools, and I avoid duplicating server data into a client store because that creates two sources of truth.",
      },
      {
        mcq: true,
        prompt:
          "A context provides { user, theme } as a new object on every render of App. What is the effect?",
        depth: "APPLY",
        options: [
          "No effect; React compares context fields",
          "Every consumer re-renders whenever App renders",
          "Only consumers that read changed fields re-render",
          "Context values are cached automatically",
        ],
        correct: 1,
        explanation:
          "Context compares the value by reference. A new object every render makes all consumers re-render. Memoise the value or split contexts.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["React docs: Managing state", "https://react.dev/learn/managing-state", "DOCS"],
      [
        "TanStack Query: Overview",
        "https://tanstack.com/query/latest/docs/framework/react/overview",
        "DOCS",
      ],
    ],
  },
  {
    slug: "react-performance",
    name: "React performance optimisation",
    category: "React",
    importance: 3,
    description: "memo, useMemo, useCallback, virtualisation, code splitting and transitions.",
    explanation: `Optimise only after measuring. The main tools:

- **Avoid work**: move state down, split components, pass \`children\` so subtrees don't re-render.
- **Skip renders**: \`React.memo\` with stable props (\`useMemo\` for objects, \`useCallback\` for functions). The React Compiler can do this automatically.
- **Do less per render**: virtualise long lists, memoise expensive calculations.
- **Load less**: code-split routes and heavy components with \`lazy\` and dynamic import.
- **Stay responsive**: \`useTransition\` and \`useDeferredValue\` mark updates as non-urgent so typing stays smooth.`,
    concepts: [
      "Measure with the Profiler before optimising",
      "React.memo and referential stability",
      "useMemo/useCallback costs and benefits",
      "List virtualisation",
      "Code splitting with lazy",
      "Transitions and deferred values",
    ],
    mistakes: [
      "Wrapping everything in useMemo/useCallback without measuring",
      "memo on components that always receive new props",
      "Rendering thousands of rows without virtualisation",
    ],
    bands: {
      "0-2": ["KNOW", 1.5],
      "2-4": ["APPLY", 2.5],
      "4-6": ["APPLY", 2],
      "6+": ["DESIGN", 2],
    },
    roles: { frontend: 4, backend: 0, fullstack: 3 },
    prerequisites: ["react-rendering", "react-hooks"],
    questions: [
      {
        prompt: "When does useCallback actually improve performance?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "When you pass a function to a child wrapped in React.memo, so the child doesn't re-render because of a new function every time.",
        mid: "Only when referential stability matters: the function is a prop of a memoised child, or a dependency of an effect/memo. Otherwise it adds cost (allocating the dependency array, comparing) for no gain.",
        senior:
          "Same, plus context: with the React Compiler enabled, manual useCallback is mostly redundant. Without it, I apply memoisation at measured hotspots (large lists, expensive children), and I prefer structural fixes (moving state down) which help more than sprinkling hooks.",
      },
      {
        mcq: true,
        prompt:
          "A list renders 10,000 rows and scrolling is janky. What is the most effective fix?",
        depth: "APPLY",
        options: [
          "Wrap each row in React.memo",
          "Use useMemo for the array",
          "Virtualise the list so only visible rows render",
          "Move the list into context",
        ],
        correct: 2,
        explanation:
          "Virtualisation renders only the visible rows, reducing DOM nodes and render work dramatically.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["React docs: memo", "https://react.dev/reference/react/memo", "DOCS"],
      ["React docs: useTransition", "https://react.dev/reference/react/useTransition", "DOCS"],
    ],
  },
  {
    slug: "react-forms",
    name: "Forms and validation in React",
    category: "React",
    importance: 3,
    description:
      "Controlled vs uncontrolled inputs, form libraries, schema validation and accessibility.",
    explanation: `Controlled inputs keep the value in React state; uncontrolled inputs keep it in the DOM and are read on submit (via refs or FormData). Large forms with many controlled inputs can re-render on every keystroke, which is why libraries such as React Hook Form use uncontrolled inputs with subscriptions.

Validation should be defined once as a schema (Zod, Yup) and run on the client for fast feedback and again on the server for security; the client is never trusted.

Accessible forms associate labels with inputs, link error messages with \`aria-describedby\`, mark invalid fields with \`aria-invalid\`, and move focus to the first error on submit.`,
    concepts: [
      "Controlled vs uncontrolled inputs",
      "Schema validation shared by client and server",
      "React Hook Form and resolvers",
      "Server actions and progressive enhancement",
      "Accessible labels and error messages",
    ],
    mistakes: [
      "Validating only on the client",
      "Re-rendering the whole form on every keystroke",
      "Placeholder text used instead of labels",
    ],
    bands: { "0-2": ["APPLY", 2], "2-4": ["APPLY", 2], "4-6": ["APPLY", 1.5], "6+": ["APPLY", 1] },
    roles: { frontend: 4, backend: 0, fullstack: 3 },
    prerequisites: ["react-hooks"],
    questions: [
      {
        prompt: "How would you build a multi-step signup form with validation?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "Keep all fields in one state object, show one step at a time, and validate the current step before going to the next. Submit everything at the end.",
        mid: "Use React Hook Form with a Zod schema per step (or one schema with per-step pick). Keep the form instance at the wizard level so values persist across steps, validate with trigger() before advancing, and re-validate everything on the server. Save progress to the server or sessionStorage so a refresh does not lose data.",
        senior:
          "Same structure, plus product concerns: persist partial progress server-side for long flows, make steps addressable by URL for analytics and back-button support, handle server-side errors per field, and keep accessibility right (focus management on step change, error summary). I would also question whether every step is necessary, since shorter forms convert better.",
      },
      {
        mcq: true,
        prompt: "Why must validation also run on the server even if the client validates?",
        depth: "KNOW",
        options: [
          "Client validation is slower",
          "Requests can be sent directly without the UI, so client checks can be bypassed",
          "Browsers do not support validation",
          "It is required by React",
        ],
        correct: 1,
        explanation:
          "Anyone can call your endpoint directly. Client-side validation is for user experience; server-side validation is for correctness and security.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["React Hook Form: Get started", "https://react-hook-form.com/get-started", "DOCS"],
      ["Zod documentation", "https://zod.dev/", "DOCS"],
    ],
  },
  {
    slug: "nextjs-ssr",
    name: "Next.js, SSR and server components",
    category: "React",
    importance: 4,
    description: "CSR vs SSR vs SSG, React Server Components, hydration and caching.",
    explanation: `Rendering strategies:

- **CSR**: the browser downloads JavaScript and renders. Simple hosting, slower first paint, weaker SEO.
- **SSR**: the server renders HTML per request; the client hydrates it to make it interactive.
- **SSG/ISR**: pages are rendered at build time (or periodically) and served from a CDN.

**React Server Components** run only on the server, can read data directly (database, filesystem) and send no JavaScript for themselves. Client Components (\`"use client"\`) handle interactivity. Server Actions let forms call server functions directly.

**Hydration** attaches event handlers to server-rendered HTML; mismatches between server and client output (dates, random values, browser-only APIs) cause hydration errors.`,
    concepts: [
      "CSR vs SSR vs SSG/ISR trade-offs",
      "Server vs Client Components",
      "Hydration and hydration mismatches",
      "Server Actions and their security (always check auth)",
      "Streaming with Suspense",
      "Caching and revalidation",
    ],
    mistakes: [
      "Marking everything 'use client' and losing server rendering benefits",
      "Reading window/localStorage during server render",
      "Trusting a Server Action without checking auth",
      "Leaking secrets into Client Components",
    ],
    bands: { "0-2": ["KNOW", 2], "2-4": ["EXPLAIN", 3], "4-6": ["APPLY", 3], "6+": ["DESIGN", 3] },
    roles: { frontend: 4, backend: 1, fullstack: 4 },
    prerequisites: ["react-rendering"],
    questions: [
      {
        prompt: "What is the difference between a Server Component and a Client Component?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        junior:
          "Server Components run on the server and send HTML; they cannot use state or effects. Client Components run in the browser too and can use hooks and event handlers.",
        mid: "Server Components render only on the server, can be async and read data directly, and their code is never shipped to the browser. Client Components are rendered on the server for the initial HTML and then hydrated in the browser, so they can use state, effects and events. Props from server to client must be serialisable. Push 'use client' as far down the tree as possible.",
        senior:
          "I design the boundary deliberately: data loading and heavy formatting stay on the server (less JS, direct access to data with auth checks), interactivity islands are client components. Security matters: Server Actions are public endpoints, so each one validates input and checks authorisation. I also watch for accidental serialisation of secrets into client props.",
      },
      {
        mcq: true,
        prompt: "Which causes a hydration mismatch?",
        depth: "APPLY",
        options: [
          "Rendering new Date().toLocaleTimeString() directly in a component rendered on server and client",
          "Fetching data in a Server Component",
          "Using useState in a Client Component",
          "Using CSS modules",
        ],
        correct: 0,
        explanation:
          "The server and the browser compute different times, so the HTML differs from the client's first render. Render time-sensitive values after mount or pass them from the server.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "Next.js docs: Server and Client Components",
        "https://nextjs.org/docs/app/getting-started/server-and-client-components",
        "DOCS",
      ],
      [
        "React docs: Server Components",
        "https://react.dev/reference/rsc/server-components",
        "DOCS",
      ],
    ],
  },
  {
    slug: "react-testing",
    name: "Testing React applications",
    category: "React",
    importance: 3,
    description: "Unit, component and end-to-end tests with Testing Library and Playwright.",
    explanation: `Test behaviour, not implementation. React Testing Library renders components and queries them the way users do (by role, label and text), then simulates interactions with \`user-event\`. Mock the network at the boundary (MSW) rather than mocking your own modules.

Pure logic (reducers, formatters, validation) gets fast unit tests. Critical user journeys (signup, checkout) get a few end-to-end tests with Playwright or Cypress against a running app.`,
    concepts: [
      "Testing pyramid / trophy",
      "Query by role and label",
      "user-event over fireEvent",
      "Mocking network with MSW",
      "End-to-end tests for critical flows",
    ],
    mistakes: [
      "Testing internal state or implementation details",
      "Snapshot tests nobody reads",
      "Too many slow, flaky end-to-end tests",
    ],
    bands: {
      "0-2": ["KNOW", 1.5],
      "2-4": ["APPLY", 2],
      "4-6": ["APPLY", 2],
      "6+": ["DESIGN", 1.5],
    },
    roles: { frontend: 3, backend: 0, fullstack: 3 },
    prerequisites: ["react-hooks"],
    questions: [
      {
        prompt: "How would you test a login form component?",
        type: "CODING",
        depth: "APPLY",
        junior:
          "Render it with Testing Library, type into the email and password fields, click submit and check that the submit function was called with the values. Also check that an error shows for an empty email.",
        mid: "Render with RTL, find inputs by label, use user-event to type and submit. Mock the network with MSW: one test for success (redirect or callback called), one for invalid credentials (error message visible), one for validation (submit disabled or field error). Assert on what the user sees, not on state.",
        senior:
          "Component tests as above for states and validation, plus one Playwright end-to-end test for the real login flow including cookies and redirect. I would also cover accessibility (labels, error announcements) with jest-axe or Playwright's accessibility checks, and keep tests independent of implementation so refactors do not break them.",
      },
      {
        mcq: true,
        prompt: "Which Testing Library query best reflects how a user finds a submit button?",
        depth: "KNOW",
        options: [
          "getByTestId('submit')",
          "container.querySelector('button')",
          "getByRole('button', { name: /sign in/i })",
          "getByClassName('btn')",
        ],
        correct: 2,
        explanation:
          "Role queries match how users and assistive technology perceive the page, and also check accessibility.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "Testing Library: Guiding principles",
        "https://testing-library.com/docs/guiding-principles",
        "DOCS",
      ],
      ["Playwright: Getting started", "https://playwright.dev/docs/intro", "DOCS"],
    ],
  },
  {
    slug: "web-browser-performance",
    name: "Web performance and Core Web Vitals",
    category: "Web",
    importance: 3,
    description: "LCP, INP, CLS, the critical rendering path, images, caching and bundle size.",
    explanation: `Core Web Vitals measure real user experience:

- **LCP** (Largest Contentful Paint): loading. Improve with fast server responses, preloading the hero image, avoiding render-blocking resources.
- **INP** (Interaction to Next Paint): responsiveness. Improve by keeping the main thread free: smaller bundles, splitting long tasks, less work per interaction.
- **CLS** (Cumulative Layout Shift): visual stability. Reserve space for images, ads and fonts.

Other levers: compress and size images properly (modern formats, \`srcset\`), cache static assets with long-lived hashed URLs, ship less JavaScript, and use a CDN.`,
    concepts: [
      "LCP, INP, CLS and their thresholds",
      "Lab (Lighthouse) vs field (RUM) data",
      "Critical rendering path",
      "Image optimisation and lazy loading",
      "HTTP caching for static assets",
    ],
    mistakes: [
      "Optimising Lighthouse scores while field data is bad",
      "Lazy-loading the LCP image",
      "Images without width/height causing layout shift",
    ],
    bands: { "0-2": ["KNOW", 1.5], "2-4": ["EXPLAIN", 2], "4-6": ["APPLY", 2], "6+": ["APPLY", 2] },
    roles: { frontend: 4, backend: 1, fullstack: 3 },
    prerequisites: ["js-event-loop"],
    questions: [
      {
        prompt:
          "Your product page has a poor LCP on mobile. Walk through how you would improve it.",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "Check which element is the LCP in Lighthouse, usually the main image. Compress it, use a modern format like WebP, and make sure it is not lazy-loaded.",
        mid: "Identify the LCP element and break the time into server response, resource load delay, load time and render delay. Fix the biggest part: cache or speed up the server response, preload or prioritise the hero image (fetchpriority=high), serve a correctly sized responsive image, remove render-blocking CSS/JS, and avoid client-only rendering of the hero.",
        senior:
          "Same breakdown, driven by field data (CrUX/RUM) segmented by device and page type. Then systemic fixes: SSR or static generation for the page shell, an image CDN, a performance budget in CI, and monitoring so regressions are caught after deploys.",
      },
      {
        mcq: true,
        prompt: "Which metric is most affected by long JavaScript tasks on the main thread?",
        depth: "EXPLAIN",
        options: ["CLS", "INP", "TTFB", "LCP only"],
        correct: 1,
        explanation:
          "INP measures how quickly the page responds to interactions; long tasks block the main thread and delay responses.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [["web.dev: Core Web Vitals", "https://web.dev/articles/vitals", "ARTICLE"]],
  },
  {
    slug: "web-security",
    name: "Web security: XSS, CSRF, CORS",
    category: "Web",
    importance: 4,
    description: "Common web vulnerabilities and defences: escaping, CSP, cookies, CORS.",
    explanation: `**XSS** (cross-site scripting) injects scripts into your page. Defences: let the framework escape output (React does by default), avoid \`dangerouslySetInnerHTML\` or sanitise first, and add a Content Security Policy.

**CSRF** (cross-site request forgery) tricks a logged-in browser into sending a request. Defences: \`SameSite\` cookies, CSRF tokens for cookie-authenticated forms, and checking the Origin header.

**CORS** is a browser mechanism that lets a server opt in to cross-origin reads. It is not a server-side protection: it does not stop non-browser clients.

Session cookies should be \`HttpOnly\` (no JavaScript access), \`Secure\` (HTTPS only) and \`SameSite\`.`,
    concepts: [
      "Stored, reflected and DOM-based XSS",
      "Output escaping and Content Security Policy",
      "CSRF and SameSite cookies",
      "CORS is enforced by browsers only",
      "HttpOnly, Secure, SameSite cookie flags",
      "OWASP Top 10",
    ],
    mistakes: [
      "Storing auth tokens in localStorage where XSS can read them",
      "Setting Access-Control-Allow-Origin: * with credentials",
      "Rendering user HTML without sanitising",
      "Thinking CORS protects the API from attackers",
    ],
    bands: {
      "0-2": ["EXPLAIN", 2],
      "2-4": ["EXPLAIN", 2],
      "4-6": ["APPLY", 2.5],
      "6+": ["DESIGN", 2.5],
    },
    roles: { frontend: 4, backend: 5, fullstack: 5 },
    prerequisites: [],
    questions: [
      {
        prompt: "Where should you store an auth token in a web app, and why?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "In an HttpOnly cookie, because JavaScript cannot read it, so an XSS attack cannot steal it. localStorage is readable by any script on the page.",
        mid: "An HttpOnly, Secure, SameSite=Lax (or Strict) cookie set by the server. It is sent automatically, cannot be read by injected scripts, and SameSite mitigates CSRF. With cookies, add CSRF protection for state-changing requests (Origin check or token). Tokens in memory are an option for SPAs but are lost on refresh and still exposed to XSS during the session.",
        senior:
          "HttpOnly session cookie with short-lived sessions, rotation on privilege change, server-side revocation (session version or store), plus CSRF defence and a strict CSP to reduce XSS impact. For third-party API access I would use separate scoped tokens. The real threat model is XSS: if an attacker runs script in your origin, they can make authenticated requests either way, so preventing XSS matters most.",
      },
      {
        mcq: true,
        prompt: "What does CORS protect against?",
        depth: "EXPLAIN",
        options: [
          "Any client calling your API without permission",
          "Malicious websites reading responses from your API in a user's browser",
          "SQL injection",
          "Brute-force login attempts",
        ],
        correct: 1,
        explanation:
          "CORS controls whether browsers let other origins read responses. Non-browser clients ignore it, so it is not an access-control mechanism for your API.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["OWASP Top 10", "https://owasp.org/www-project-top-ten/", "DOCS"],
      ["MDN: CORS", "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS", "DOCS"],
    ],
  },
  {
    slug: "web-http-caching",
    name: "HTTP, REST semantics and caching",
    category: "Web",
    importance: 4,
    description: "Methods, status codes, idempotency, headers, Cache-Control and ETags.",
    explanation: `HTTP methods carry meaning: \`GET\` reads (safe, cacheable), \`POST\` creates or performs actions, \`PUT\` replaces (idempotent), \`PATCH\` partially updates, \`DELETE\` removes (idempotent). Status codes communicate outcomes: 2xx success, 3xx redirects, 4xx client errors (400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 422, 429), 5xx server errors.

Caching is controlled by \`Cache-Control\` (\`max-age\`, \`no-store\`, \`private\`, \`s-maxage\`, \`stale-while-revalidate\`) and validators (\`ETag\` with \`If-None-Match\`, returning 304 Not Modified). Static assets with hashed filenames can be cached for a year; HTML and API responses usually need short or no caching.`,
    concepts: [
      "Safe and idempotent methods",
      "Status code classes and common codes",
      "Cache-Control directives",
      "ETags and conditional requests",
      "CDN caching and cache keys",
      "HTTP/2 and HTTP/3 basics",
    ],
    mistakes: [
      "Returning 200 with an error body",
      "Caching personalised responses publicly",
      "Using GET for actions that change data",
    ],
    bands: { "0-2": ["EXPLAIN", 2], "2-4": ["APPLY", 2], "4-6": ["APPLY", 2], "6+": ["DESIGN", 2] },
    roles: { frontend: 3, backend: 5, fullstack: 4 },
    prerequisites: [],
    questions: [
      {
        prompt: "What is the difference between 401 and 403?",
        type: "CONCEPT",
        depth: "KNOW",
        junior:
          "401 means you are not logged in (unauthenticated). 403 means you are logged in but not allowed to do this (unauthorised).",
        mid: "401 Unauthorized: missing or invalid credentials; the client should authenticate. 403 Forbidden: credentials are valid but lack permission; re-authenticating will not help. Some APIs return 404 instead of 403 to avoid revealing that a resource exists.",
        senior:
          "Same, and I mention consistency: document the error contract (status plus a machine-readable error code), avoid leaking existence of private resources (404 for other users' records), and make sure clients handle 401 by refreshing or redirecting to login without loops.",
      },
      {
        prompt:
          "How would you cache an API response that lists products, which changes a few times a day?",
        type: "SYSTEM_DESIGN",
        depth: "APPLY",
        junior:
          "Set a Cache-Control header with a max-age, for example a few minutes, so browsers and CDNs reuse the response.",
        mid: "Use Cache-Control: public, s-maxage=300, stale-while-revalidate=600 so the CDN serves cached responses and refreshes in the background, plus an ETag for cheap revalidation. If products update, purge the CDN cache for that key or use short max-age. Personalised parts (prices per user) must not be in the shared cached response.",
        senior:
          "Layered caching: CDN with stale-while-revalidate, an application cache (Redis) keyed by query parameters, and event-driven invalidation when products change. Watch the cache key (query param order, headers) and hit ratio. Keep user-specific data in a separate, private endpoint.",
      },
      {
        mcq: true,
        prompt: "Which HTTP methods are idempotent?",
        depth: "EXPLAIN",
        options: ["POST and PATCH", "GET, PUT and DELETE", "Only GET", "All methods"],
        correct: 1,
        explanation:
          "Repeating GET, PUT or DELETE has the same effect as doing it once. POST is not idempotent; PATCH is not guaranteed to be.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      ["MDN: HTTP caching", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching", "DOCS"],
      [
        "MDN: HTTP response status codes",
        "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
        "DOCS",
      ],
    ],
  },
  {
    slug: "web-css-accessibility",
    name: "CSS layout and accessibility",
    category: "Web",
    importance: 3,
    description: "Flexbox, Grid, responsive design, semantic HTML and accessibility basics.",
    explanation: `**Flexbox** lays items out in one dimension (a row or a column); **Grid** handles two dimensions. Responsive design uses fluid layouts, media queries and container queries.

Accessibility starts with semantic HTML: real \`<button>\`, \`<a>\`, \`<label>\`, headings in order, and landmarks (\`<main>\`, \`<nav>\`). Everything interactive must work with a keyboard and show a visible focus state. Colour contrast must meet WCAG (4.5:1 for normal text), and information must never be conveyed by colour alone. ARIA fills gaps but is not a substitute for native elements.`,
    concepts: [
      "Flexbox vs Grid",
      "Box model and stacking contexts",
      "Media and container queries",
      "Semantic HTML and landmarks",
      "Keyboard access and focus management",
      "WCAG contrast; don't rely on colour alone",
    ],
    mistakes: [
      "Clickable divs instead of buttons",
      "Removing focus outlines",
      "Images without alt text",
      "ARIA roles that contradict the element",
    ],
    bands: {
      "0-2": ["APPLY", 2.5],
      "2-4": ["APPLY", 2],
      "4-6": ["APPLY", 1.5],
      "6+": ["APPLY", 1],
    },
    roles: { frontend: 4, backend: 0, fullstack: 2 },
    prerequisites: [],
    questions: [
      {
        prompt: "How do you make a custom dropdown accessible?",
        type: "CONCEPT",
        depth: "APPLY",
        junior:
          "Use a button to open it, make the options focusable, support keyboard navigation with arrow keys and Escape to close, and add proper labels.",
        mid: "Prefer a native <select> if possible. Otherwise follow the WAI-ARIA listbox or menu pattern: a button with aria-expanded and aria-controls, options with role=option and aria-selected, arrow-key navigation, typeahead, Escape to close and return focus to the trigger. Test with a keyboard and a screen reader.",
        senior:
          "I would use a well-tested headless primitive (Radix, React Aria) rather than hand-rolling one, because the edge cases (focus trapping, screen reader announcements, mobile) are many. Then add automated checks (axe) in CI and include keyboard-only flows in end-to-end tests.",
      },
      {
        mcq: true,
        prompt:
          "Which layout tool is designed for two-dimensional layouts (rows and columns together)?",
        depth: "KNOW",
        options: ["Flexbox", "CSS Grid", "Floats", "position: absolute"],
        correct: 1,
        explanation:
          "Grid controls rows and columns together. Flexbox distributes items along one axis.",
        diagnostic: true,
        selfCheck: true,
      },
    ],
    resources: [
      [
        "MDN: CSS Grid layout",
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout",
        "DOCS",
      ],
      ["W3C: WAI-ARIA Authoring Practices", "https://www.w3.org/WAI/ARIA/apg/", "DOCS"],
    ],
  },
];
