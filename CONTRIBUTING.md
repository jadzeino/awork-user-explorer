# Contributing

Thank you for taking the time to contribute. This guide covers everything you need to go from zero to a merged pull request.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Environment & Secrets](#environment--secrets)

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | 10+ | Comes with Node 20 |
| Angular CLI | 20 | Installed locally via `npm install` — no global install needed |
| Playwright browsers | auto | Installed on first `npm run test:e2e` run |

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up Agent Mode
cp src/environments/environment.example.ts src/environments/environment.ts
# Add your free Groq API key: https://console.groq.com/keys

# 3. Start the dev server
npm start
# → http://localhost:4200
```

> `src/environments/environment.ts` is gitignored. Never commit it.

---

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/            # TypeScript interfaces — User, GroupBy, SortBy, etc.
│   │   ├── services/          # FilterService, UsersService, GroupingService,
│   │   │                      #   SavedFiltersService, ThemeService
│   │   └── validation/        # Zod schemas for API response boundary
│   ├── features/
│   │   └── users/
│   │       ├── components/    # All presentational components (13 total)
│   │       └── containers/    # UsersPage — orchestrates services → components
│   └── shared/
│       └── components/        # SkeletonComponent
├── workers/
│   ├── grouping.logic.ts      # Pure functions: filter, sort, group (testable standalone)
│   └── grouping.worker.ts     # Web Worker wrapper
└── environments/
    └── environment.example.ts # Commit template — fill in locally as environment.ts
e2e/
├── fixtures/users.json        # 8-user fixture for deterministic Playwright tests
└── app.spec.ts                # 16 E2E scenarios
```

---

## Development Workflow

```bash
npm start              # dev server + hot reload at http://localhost:4200
npm run build:prod     # production build — verify no budget errors
npm run lint           # ESLint (0 warnings policy)
npm run format         # Prettier auto-format
npm run format:check   # Prettier check without writing (CI)
```

### Key architectural rules to keep in mind

- **All components must use `ChangeDetectionStrategy.OnPush`** — no exceptions.
- **State lives in `FilterService`** — use `filterService.update(patch)` to apply changes; never mutate state directly.
- **No raw subscriptions in components** — use `takeUntilDestroyed(this.destroyRef)` or `toSignal()` for any RxJS stream.
- **Grouping and filtering belong in the worker** — `grouping.logic.ts` is the pure function layer; `grouping.worker.ts` is only the postMessage bridge.
- **Validate at boundaries** — Zod schemas live in `core/validation/`. Only raw API responses need validation; internal data structures are trusted.

---

## Testing

### Unit Tests (Jest)

```bash
npm run test:ci   # single run — use in CI and before pushing
npm test          # watch mode — use during development
```

- Tests live alongside source: `src/**/*.spec.ts`
- E2E files (`e2e/**`) are excluded from Jest via `testMatch` in `jest.config.js`
- `GroupingService` is auto-mocked via `moduleNameMapper` to avoid `import.meta.url` incompatibility with Jest's CommonJS output — see `src/__mocks__/grouping.service.mock.ts`
- `setup-jest.ts` bootstraps Zone.js via `setupZoneTestEnv()` — required for Angular 20 + jest-preset-angular v16

**Adding tests:**
- Test pure logic in `grouping.logic.ts` directly — no Angular TestBed needed
- Use `TestBed.configureTestingModule` for service-level tests
- Prefer `jest.fn()` over spies where possible for readability

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

Playwright auto-starts `ng serve` before the suite and stops it after. No manual server management needed.

**Key conventions for E2E tests:**
- **Always mock the API** via `page.route('**/randomuser.me/api**', ...)` in `beforeEach` — never hit the real network in CI. Use `e2e/fixtures/users.json` as the response body.
- Use `getByRole` and `getByPlaceholder` selectors where possible — they are resilient to markup changes and validate accessibility semantics simultaneously.
- For assertions that depend on the Web Worker completing (e.g., filter result count), use `expect(...).not.toHaveText(originalValue, { timeout: 5_000 })` to wait for the async change rather than asserting a fixed value immediately.
- Add to `e2e/fixtures/users.json` if a new test requires coverage of a user attribute not already present.

---

## Code Style

### Angular
- **Standalone components only** — no NgModules
- `ChangeDetectionStrategy.OnPush` on every component
- Use `input()` / `output()` / `model()` signal-based APIs for component I/O
- `inject()` over constructor injection

### TypeScript
- `strict: true` + `noImplicitAny` enforced
- No `any` — use `unknown` and narrow with `instanceof` or type guards
- No non-null assertions (`!`) — use optional chaining (`?.`) or explicit checks
- Use `crypto.randomUUID()` for ID generation (available in all modern browsers and Node 20)

### RxJS
- `takeUntilDestroyed(this.destroyRef)` for all subscriptions inside components or services
- `switchMap` for cancellable async pipelines (search, worker requests)
- `shareReplay(1)` for shared HTTP observables — prevents duplicate requests

### CSS / SCSS
- BEM naming: `.block__element--modifier`
- All colours via CSS custom properties — never hard-coded hex in components
- Animations and `@keyframes` must be wrapped in `@media (prefers-reduced-motion: no-preference)`
- Component-scoped styles in `.component.scss`; global tokens only in `src/styles.scss`

### Comments
- Default to **no comments** — well-named identifiers are the documentation
- Add a comment only when the *why* is non-obvious: a hidden constraint, a browser quirk, a workaround for a specific bug
- Never describe *what* the code does — that belongs in the code itself

### Linting
ESLint is configured with `--max-warnings=0`. A PR with any lint warning will fail CI.

Notable enforced rules:
- `eqeqeq` — always use `===` / `!==`
- `no-console` — only `console.warn` and `console.error` are allowed
- `@typescript-eslint/no-non-null-assertion` — no `!` postfix operator
- `@typescript-eslint/no-unused-vars` — no dead variables

---

## Branch & Commit Conventions

### Branch names

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<short-desc>` | `feature/url-serialised-filters` |
| Bug fix | `fix/<short-desc>` | `fix/worker-race-condition` |
| Refactor | `refactor/<short-desc>` | `refactor/extract-nl-parser` |
| Test | `test/<short-desc>` | `test/e2e-compare-mode` |
| Docs | `docs/<short-desc>` | `docs/ssr-migration-guide` |
| Chore | `chore/<short-desc>` | `chore/upgrade-angular-20` |

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<optional scope>): <short imperative summary, max 72 chars>

[optional body — explain WHY, not WHAT]
```

Types: `feat` · `fix` · `refactor` · `test` · `docs` · `style` · `chore` · `perf`

**Examples:**
```
feat(filters): add URL-serialised filter state for shareable links

fix(worker): resolve stale result when rapid filter changes race the Web Worker

test(e2e): add nationality filter stacking scenario to Playwright suite

perf(list): replace O(n²) nat count with single-pass Map in computed()

docs: update README with SEO migration plan and AI-assisted development section
```

---

## Pull Request Process

### Before opening a PR

- [ ] `npm run test:ci` passes (all ~50 unit tests green)
- [ ] `npm run lint` exits with 0 warnings
- [ ] `npm run format:check` passes
- [ ] `npm run build:prod` succeeds with no budget errors
- [ ] Manually tested in both light and dark mode
- [ ] New behaviour covered by a Jest unit test or a Playwright E2E scenario

### PR checklist

1. **One concern per PR** — don't mix a feature with unrelated refactors
2. **Keep it small** — aim for < 400 lines changed; split larger work into stacked PRs
3. **Update README.md** if the change affects setup, architecture, or features
4. **At least one approval** required to merge into `main`

### PR description template

```markdown
## What
<!-- One paragraph describing the change. -->

## Why
<!-- The problem this solves or the user need this enables. -->

## How
<!-- Key implementation decisions. Link to relevant code sections. -->

## Test plan
- [ ] Unit tests added / updated
- [ ] E2E scenario added / updated (if user-visible behaviour changed)
- [ ] Manually tested in Chrome (light + dark mode)
- [ ] No regressions observed in existing features
```

---

## Environment & Secrets

- **Never commit `src/environments/environment.ts`** — it is gitignored
- Copy `environment.example.ts` → `environment.ts` and fill in your keys locally
- If you add a new environment variable, add it to `environment.example.ts` with an empty placeholder value and document it in the README
- Groq API keys should have the minimum required scope — read-only inference is sufficient

---

## Useful Resources

| Resource | URL |
|---|---|
| Angular 20 docs | https://angular.dev |
| Angular CDK | https://material.angular.io/cdk |
| Angular Signals guide | https://angular.dev/guide/signals |
| Jest docs | https://jestjs.io/docs/getting-started |
| Playwright docs | https://playwright.dev/docs/intro |
| jest-preset-angular | https://thymikee.github.io/jest-preset-angular |
| Groq API | https://console.groq.com/docs |
| Conventional Commits | https://www.conventionalcommits.org |
| WCAG 2.1 AA checklist | https://www.w3.org/WAI/WCAG21/quickref |
