# awork Challenge — Angular User Directory

A production-ready Angular 20 application that fetches, groups, filters, and displays 5,000 users from the [Random User API](https://randomuser.me/documentation).

---

## Setup & Running

```bash
npm install
npm start         # dev server at http://localhost:4200
npm run build     # production build
npm test          # unit tests (Karma + Jasmine)
```

---

## Architecture

```
src/app/
├── core/
│   ├── models/        # Strict TypeScript interfaces (User, GroupBy, etc.)
│   ├── services/      # UsersService, GroupingService, FilterService, ThemeService
│   └── validation/    # Zod schemas — API boundary validation
├── features/
│   └── users/
│       ├── components/  # UserList, UserItem, UserFilters (presentational)
│       └── containers/  # UsersPage (orchestration, state wiring)
├── shared/
│   └── components/    # SkeletonComponent
└── workers/
    ├── grouping.logic.ts   # Pure grouping/filtering functions (testable)
    └── grouping.worker.ts  # Web Worker wrapper
```

---

## Key Technical Decisions

### Virtual Scrolling (CDK)
5,000 users rendered as a flat `VirtualRow[]` array combining group headers and user rows. CDK `cdk-virtual-scroll-viewport` with `itemSize="56"` keeps the DOM to ~20 rendered nodes regardless of dataset size.

### Web Worker
All grouping and filtering runs in `grouping.worker.ts` off the main thread. The `GroupingService` uses a "latest-wins" pending-response pattern: if a new request arrives before the previous one completes, the old Subject is silently replaced. `switchMap` in the container disposes stale subscriptions. Synchronous `runGrouping()` fallback is used when `Worker` construction fails (test environments, SSR).

### Zod Validation
`ApiResponseSchema` validates the raw HTTP response at the boundary. On schema mismatch, it logs the issues and falls back to a lenient filter rejecting only records missing `uuid`, `name.first`, or `email` — partial API degradation never crashes the app.

### RxJS Caching (`shareReplay(1)`)
`UsersService` builds the `users$` observable once. Subsequent `getUsers()` calls receive the cached replay without an additional HTTP request. `combineLatest([users$, filterState$])` in the container re-triggers grouping on every filter change without re-fetching.

### OnPush Change Detection
Every component uses `ChangeDetectionStrategy.OnPush`. State flows via Angular signals. The original O(n²) nationality counting bottleneck is replaced by a single `computed()` `Map<nat, count>` in `UserListComponent`.

### Dark / Light Mode
`ThemeService` reads `prefers-color-scheme` on first load, persists to `localStorage`, and sets `data-theme` on `<html>`. All colors are semantic CSS custom properties that flip between two token sets.

### Input Sanitization
Search queries strip `< > " ' &` before the substring match in the worker. Age inputs use `type="number"` with `min`/`max`. `maxlength="100"` on the search field prevents excessively long strings reaching the worker.

---

## Performance Profile

| Concern | Before | After |
|---|---|---|
| DOM nodes (5k users) | 5,000+ | ~20 (virtual scroll) |
| Nationality count | O(n²) per render | O(n) once, cached |
| Change detection | Default (full tree) | OnPush everywhere |
| Grouping thread | Main thread | Web Worker |
| API call dedup | None | `shareReplay(1)` |
| Loading UX | "Loading…" text | Skeleton rows |

---

## Features

- **Search** by name, email, or username (debounced 250ms)
- **Filter** by gender, nationality (21 options), and age range
- **Group** by first letter / age range / nationality — switchable live
- **Accordion expand** with Angular animations (200ms) showing full user detail
- **Dark / Light mode** toggle — persisted to localStorage
- **Skeleton loaders** during initial fetch
- **ARIA** roles, `aria-expanded`, `aria-label`, keyboard navigation (Enter/Space to expand)
- **Error banner** on HTTP failure with descriptive message

---

## Tests

```bash
npm test
```

24 unit tests covering:
- `grouping.logic`: all groupBy modes, all filter types, combined filters, edge cases, XSS safety
- `user.schema`: valid mapping, Zod graceful fallback, UUID image URL
- `users.service`: HTTP mapping, `shareReplay` deduplication, cache behaviour
