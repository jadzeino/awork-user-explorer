# Solution & Decision Log — awork Angular Challenge

**Candidate:** Ahmed Zeno  
**Live demo:** https://awork-user-explorer.vercel.app  
**Repository:** https://github.com/jadzeino/awork-user-explorer

---

## 1. Challenge Interpretation

The brief asked for an Angular application that fetches users from the Random User API and presents them in a useful way. Rather than building the minimum viable list, I treated it as a product problem: *"What would a real team ship if they needed engineers to explore, filter, and compare a large user dataset daily?"*

That interpretation drove three priorities:

1. **Performance at scale** — 5,000 users should feel instant, not laggy
2. **Discoverability** — the data should be explorable, not just searchable
3. **Quality signals** — tests, accessibility, CI, and deployment to demonstrate production readiness

---

## 2. Architecture Overview

```
Random User API
      │
      ▼
UsersService (HTTP + Zod + shareReplay)
      │
      ├──► allUsers  →  LocationFilterComponent (dropdown options)
      │
      └──► users$  ──► combineLatest(filterState$)
                              │
                              ▼
                    GroupingService (Web Worker bridge)
                              │
                              ▼
                    groups signal  →  UserListComponent (CDK virtual scroll)
                                            │
                                            ▼
                                      UserItemComponent (single row)
                                            │
                                  click ───►  UserDetailComponent (right drawer)
```

All state lives in `FilterService` as a single `signal<FilterState>`. Components read from it; nothing writes to it except `FilterService.update()`. This makes the data flow unidirectional and easy to trace.

---

## 3. Feature Decisions

### 3.1 Virtual Scroll (Angular CDK) — not pagination-by-default

**Decision:** render 5,000 users as a continuously scrollable virtual list, with pagination available as an opt-in toggle.

**Argument:** Pagination forces the user to decide how to navigate before they know what they're looking for. Virtual scroll lets you scan continuously while the DOM stays at ~20 nodes — the same memory cost regardless of dataset size. Angular CDK's `cdk-virtual-scroll-viewport` handles this with a single flat `VirtualRow[]` array that interleaves group headers and user rows.

**Trade-off accepted:** Jump-to-letter loses meaning without visible group boundaries. Solved by the letter-jump input (`A–Z` sidebar → single character scrolls directly to that group).

---

### 3.2 Web Worker for Grouping and Filtering

**Decision:** all filter/sort/group logic runs in a dedicated Web Worker (`grouping.worker.ts`), never on the main thread.

**Argument:** Filtering 5,000 objects with multiple predicates, grouping them, sorting groups and items, then flattening into a `VirtualRow[]` is O(n log n) work. On a mid-range device that takes 8–15 ms — enough to drop a frame and cause a visible jank on every keypress. Moving it off-thread means the UI stays at 60 fps while the worker computes.

**Concurrency design:** each request gets a monotonic `__id`. The worker echoes it back; `GroupingService` resolves only the `Subject` matching that id via a `Map<id, Subject>`. Rapid filter changes cannot produce stale results because `switchMap` in the container cancels superseded requests before they resolve.

**Trade-off accepted:** Worker construction fails in Jest's jsdom environment. A synchronous `runGrouping()` fallback in `GroupingService` activates automatically when `new Worker()` throws, keeping tests simple and fast without mocking the worker protocol.

---

### 3.3 Signal-First State — no NgRx, no BehaviorSubject

**Decision:** `FilterService` exposes a single `signal<FilterState>`. Components call `filterService.update({ key: value })` to patch state.

**Argument:** NgRx would be the right call at 10+ developers or when state needs cross-module serialisation. For a single-page tool with one data domain, the overhead of actions, reducers, selectors, and effects is ceremony without benefit. Angular Signals introduced in v16 give the same guarantees (immutable snapshots, computed derivations, change propagation only to interested consumers) with zero boilerplate.

`computed()` replaces selectors. `toObservable()` bridges signals to RxJS where async operators like `switchMap` and `combineLatest` are needed. The result is ~300 fewer lines of code than an equivalent NgRx implementation.

---

### 3.4 Zod at the API Boundary

**Decision:** every HTTP response is parsed through a Zod schema before entering the application.

**Argument:** The Random User API is an external service with no contract guarantees. Without validation, a shape change silently corrupts runtime state. Zod's `safeParse` gives a typed `success/error` discriminated union: on failure, the app logs the mismatch and falls back to a lenient filter that rejects only records genuinely missing `uuid`, `name.first`, or `email`. The rest of the app never sees invalid data.

**Trade-off accepted:** Zod adds ~13 kB to the bundle. Acceptable given the guarantee it provides and the fact the rest of the bundle is lazy-loaded.

---

### 3.5 Analytics as Interactive Filters

**Decision:** the gender donut, age histogram, and nationality bar chart are not read-only visualisations — clicking any segment applies it as a filter.

**Argument:** in a data-exploration tool, the gap between "I see a spike in 30–35 year olds" and "let me see who those people are" should be zero clicks. Making charts interactive removes that gap. The implementation is simple: each chart element calls `filterService.update()` with the corresponding filter value. No special event bus or callback chain is needed.

---

### 3.6 Natural Language Parsing (two layers)

**Decision:** implement NL parsing twice — once as a local regex token parser, and once as an LLM-backed agent mode.

**Argument:**

| Layer | Technology | When to use |
|---|---|---|
| Local NL parser | Regex token consumption in `filter.service.ts` | Zero-latency, works offline, handles common patterns |
| Agent mode | Groq API (llama-3.1-8b-instant) | Handles ambiguous, complex, or language-variant queries |

The local parser handles ~80% of realistic queries (`"female under 30 from Germany"`, `"sort by age"`, `"group by nationality"`) with no network cost. Agent mode handles the remaining 20% — unusual phrasing, compound logic, non-English input — at the cost of a Groq API call (~200 ms).

**The app is fully functional without a Groq key.** Agent mode degrades gracefully with a configuration notice rather than an error.

---

### 3.7 Saved Filter Presets

**Decision:** allow users to name and persist any combination of filter state to `localStorage`, then restore or delete presets.

**Argument:** power users of exploration tools develop "favourite views" — `"German females under 40"`, `"All users, grouped by age, sorted by name"`. Without presets, they rebuild these filters from scratch every session. `localStorage` is the right storage here: no server required, survives page reload, scoped to the origin.

---

### 3.8 Compare Mode

**Decision:** a side-by-side analytics view comparing two gender or nationality segments.

**Argument:** the analytics panel answers "what does the whole dataset look like?" Compare mode answers "how does group A differ from group B?" — a question that comes up naturally when filtering by gender or nationality. The implementation reuses the same chart components with filtered subsets, avoiding duplication.

---

### 3.9 OnPush Everywhere + Lazy Routes

**Decision:** `ChangeDetectionStrategy.OnPush` on all 13 components; both page routes are lazy-loaded.

**Argument:** with 5,000 virtual rows, Angular's default change detection would dirty-check every component subtree on every event. OnPush limits checks to components whose inputs have changed references, reducing the cycle cost by an order of magnitude.

Lazy routing means the `UsersPageComponent` bundle (~203 kB) is only fetched when the user navigates to `/`. The 404 page (`~1 kB`) is a separate chunk that only loads if needed.

---

## 4. Testing Strategy

### Unit tests (Jest) — logic, not DOM

The unit test suite targets pure logic and service contracts, not component rendering. Reasons:

- `grouping.logic.ts` is a pure function — trivial to test exhaustively without Angular
- `parseNaturalLanguage()` has ~20 distinct input patterns; snapshot tests on the output string are more valuable than clicking through a UI
- Component rendering tests add Angular TestBed overhead without catching the classes of bugs that matter here (incorrect filter logic, schema mismatch, stale worker results)

### E2E tests (Playwright) — user journeys, mocked API

16 scenarios covering every major user journey. The randomuser.me API is intercepted with an 8-user deterministic fixture — tests never hit the network, run in ~4 seconds, and produce the same result on any machine.

The fixture approach was chosen over a local mock server because Playwright's `page.route()` intercept happens at the browser network layer, meaning the real `HttpClient`, Zod validation, and Web Worker pipeline all run — only the HTTP response is synthetic.

---

## 5. Quality & Tooling Decisions

| Decision | Rationale |
|---|---|
| **ESLint `--max-warnings=0`** | Zero-tolerance lint policy prevents gradual quality decay; the CI step fails if any warning is introduced |
| **Prettier with `format:check` in CI** | Formatting disagreements in PRs waste review time; auto-format enforces one style |
| **`legacy-peer-deps=true` in `.npmrc`** | `@typescript-eslint` peer dep ceiling lags behind Angular's TypeScript requirement; flag documented in `.npmrc` rather than hidden in CI flags |
| **GitHub Actions CI** | Runs `lint → test:ci → build:prod` on every push and PR; catches regressions before merge |
| **Vercel deployment** | SPA-native routing via `vercel.json` rewrites; preview URLs on every PR; zero-config for Angular output |

---

## 6. Accessibility Decisions

WCAG 2.1 AA was treated as a hard requirement, not an afterthought. Specific decisions:

- **`outline-offset: -2px` globally** — Chrome clips `outline` ink overflow inside `overflow: hidden` containers. A negative offset renders the ring inside the element's border box so it is never clipped by any ancestor.
- **HTML `inert` attribute on closed drawer** — removes all descendants from the tab order without DOM removal. Chosen over `display: none` (abrupt) and `tabindex="-1"` on every child (fragile).
- **`setTimeout(0)` for focus after drawer open** — Angular signal updates are synchronous but the DOM attribute change needs a microtask to settle before `querySelector` finds focusable elements.
- **`prefers-reduced-motion` wrapping all animations** — vestibular disorders affect ~35% of adults over 40. Every `@keyframes` block is inside `@media (prefers-reduced-motion: no-preference)`.
- **Nat badge contrast fix** — `$color-blue-900` (`#006dfa`) on a near-transparent background failed AA in dark mode. Replaced with `var(--accent-male)` border + text, which resolves to `#60a5fa` in dark mode (7.55:1 contrast ratio).

---

## 7. What Was Deliberately Not Built

| Feature | Reason |
|---|---|
| **Angular SSR** | Would double scope and obscure Angular proficiency decisions; architecture is SSR-ready |
| **NgRx** | Overhead without benefit for a single-domain tool; Signals cover the same guarantees |
| **Real-time updates / WebSockets** | No API support; randomuser.me is a static fixture API |
| **User editing / CRUD** | Out of scope for a read-only directory |
| **i18n** | Challenge is English-only; architecture supports `$localize` layering |

---

## 8. If I Had More Time

1. **URL-serialised filter state** — encode `FilterState` as query params so any filtered view is bookmarkable and shareable
2. **Angular SSR** — unlock real SEO and sub-100 ms first paint
3. **IndexedDB caching** — store the 5k users locally for instant repeat visits
4. **Map view** — plot nationality pins on a world map; the location data is already on the model
5. **Export to CSV/JSON** — one-click download of the current filtered result set
