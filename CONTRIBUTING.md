# Contributing

## Prerequisites

- Node.js 20+
- `npm install` — installs all dependencies including dev tools

## Development workflow

```bash
npm start          # serve at http://localhost:4200 with hot reload
npm run build:prod # production build, verify bundle size
npm run test:ci    # run all tests once (headless)
npm run lint       # ESLint — must pass with 0 warnings before committing
npm run format     # auto-format with Prettier
```

## Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-desc>` | `feature/compare-mode` |
| Bug fix | `fix/<short-desc>` | `fix/race-condition-worker` |
| Refactor | `refactor/<short-desc>` | `refactor/filter-service` |
| Docs | `docs/<short-desc>` | `docs/api-setup` |

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>: <short imperative summary (max 72 chars)>

[optional body]
```

Types: `feat` · `fix` · `refactor` · `test` · `docs` · `style` · `chore`

Examples:
```
feat: add saved filters with localStorage persistence
fix: resolve race condition in GroupingService worker requests
test: add parseNaturalLanguage edge case coverage
```

## Pull requests

1. One concern per PR — avoid mixing features and refactors
2. All tests must pass (`npm run test:ci`)
3. Lint must be clean (`npm run lint`)
4. Update README if the change affects setup or architecture
5. At least 1 approval required to merge

### PR description template

```
## What
Brief description of the change.

## Why
The problem this solves or the feature this enables.

## Test plan
- [ ] Unit tests added/updated
- [ ] Manually tested in browser (light + dark mode)
- [ ] No regressions in existing features
```

## Code style

- **Angular**: standalone components, `ChangeDetectionStrategy.OnPush`, signals for state
- **TypeScript**: strict mode, no `any`, prefer `instanceof` over type assertions
- **RxJS**: `takeUntilDestroyed` for subscriptions, `switchMap` for cancellable async
- **CSS**: BEM naming (`.block__element--modifier`), CSS custom properties for theming
- **No comments** unless the *why* is non-obvious — well-named identifiers are the documentation

## Environment / secrets

- **Never commit** `src/environments/environment.ts` — it is gitignored
- Copy `environment.example.ts` → `environment.ts` and fill in your keys locally
- If you add a new environment variable, add it to `environment.example.ts` with an empty value
