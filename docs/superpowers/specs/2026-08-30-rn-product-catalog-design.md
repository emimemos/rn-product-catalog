# Design: rn-product-catalog

**Date:** 2026-08-30
**Status:** implemented — see docs/superpowers/plans/2026-08-30-rn-product-catalog.md. Some claims in
this document were revised during implementation (see dated notes in sections 2, 5, and 12, and the
repo's README for full detail).
**Author:** Emiliano Martino (with Claude Code)

---

## 1. Purpose

React Native application built as a **portfolio piece for a technical interview**. The goal isn't
the product itself, but that every decision in the code is **defensible out loud**: why this
architecture, why this library, why this memoization, what tradeoff was accepted.

### Success criteria

1. `npm run lint`, `npm run typecheck`, and `npm test` pass green, and CI demonstrates it publicly.
2. The app runs on the iOS simulator and on Android from a clean clone following the README.
3. For every topic expected in a React Native interview there is **a concrete file** that
   demonstrates it, listed in the README.
4. Memoization can be **shown working live**, not just explained.
5. The tradeoffs accepted are documented in writing before the interviewer finds them.

### Non-goals (YAGNI)

- A real backend, database, or real authentication.
- Dark mode / dynamic theming, i18n, Detox E2E, complex animations, push notifications.
- 100% test coverage. What has logic gets tested, not presentation components.

---

## 2. Stack

Versions verified on npm on 2026-08-30.

| Piece                                     | Version                              | Justification                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Native (bare CLI)                   | 0.87.1                               | Latest stable. New Architecture (Fabric + TurboModules) active by default. Bare, not Expo, to be able to talk about the native layer (Podfile, Gradle, autolinking). |
| React                                     | 19.2.3                               | Peer dependency of RN 0.87.                                                                                                                                          |
| React Navigation                          | 7.x — `native-stack` + `bottom-tabs` | De facto standard. `native-stack` uses native navigators (better performance and gestures than `stack`).                                                             |
| Redux Toolkit                             | 2.12                                 | The app's global state and data layer.                                                                                                                               |
| RTK Query                                 | (included in RTK 2.12)               | Network cache, tags, `infiniteQuery` for pagination.                                                                                                                 |
| react-redux                               | 9.3                                  |                                                                                                                                                                      |
| MSW                                       | 2.15 (`msw/native` + `msw/node`)     | Network-level mocking: the app makes real HTTP calls and doesn't know it's mocked.                                                                                   |
| TypeScript                                | 5.x (the one from the RN template)   | **Not 7.0.2.** See ADR-002.                                                                                                                                          |
| Jest                                      | 30                                   | With the React Native preset.                                                                                                                                        |
| @testing-library/react-native             | 14                                   | Tests focused on user behavior.                                                                                                                                      |
| ESLint 10 + Prettier                      |                                      | With `@react-native/eslint-config`.                                                                                                                                  |
| husky + lint-staged                       |                                      | Pre-commit.                                                                                                                                                          |
| @react-native-async-storage/async-storage |                                      | Session and favorites persistence. See ADR-003.                                                                                                                      |

> **Corrected on 2026-08-31 after implementation.** The RN 0.87.1 template pins TypeScript 6.0.3,
> ESLint 8.57.1, and Jest 29.7.0 instead of TS 5.x / ESLint 10 / Jest 30. Those versions were
> accepted instead of forcing the ones in this table: the substance of ADR-002 (not TypeScript 7.x)
> still holds. See ADR-002 and the README's stack table for the detail.

### Version risk

RN 0.87.1 is very recent. If the native build fails (CocoaPods against Xcode 26.6, or Gradle against
JDK 17), **the fallback is RN 0.86.3**, which requires no change to the application code — only the
template gets regenerated. This decision is made at the first step of the plan, not afterward.

---

## 3. Architecture

### 3.1 Organization: feature-based

```
rn-product-catalog/
├── .github/workflows/ci.yml
├── android/                      # generated by the template
├── ios/                          # generated by the template
├── docs/superpowers/specs/       # this document
├── src/
│   ├── app/
│   │   ├── App.tsx               # provider composition
│   │   ├── store.ts              # configureStore + RootState/AppDispatch types
│   │   └── hooks.ts              # typed useAppDispatch / useAppSelector
│   ├── navigation/
│   │   ├── RootNavigator.tsx     # decides Auth vs App based on session state
│   │   ├── AuthNavigator.tsx
│   │   ├── AppTabs.tsx
│   │   ├── CatalogStack.tsx
│   │   └── types.ts              # ParamLists + global RootParamList declaration
│   ├── features/
│   │   ├── auth/
│   │   │   ├── authSlice.ts
│   │   │   ├── authApi.ts
│   │   │   ├── screens/LoginScreen.tsx
│   │   │   ├── hooks/useAuth.ts
│   │   │   └── __tests__/
│   │   ├── catalog/
│   │   │   ├── catalogApi.ts
│   │   │   ├── catalogSlice.ts   # UI state only: query, category, sort
│   │   │   ├── selectors.ts      # createSelector
│   │   │   ├── screens/ProductListScreen.tsx
│   │   │   ├── screens/ProductDetailScreen.tsx
│   │   │   ├── components/ProductCard.tsx
│   │   │   ├── components/SearchBar.tsx
│   │   │   ├── components/CategoryFilter.tsx
│   │   │   ├── hooks/useDebouncedValue.ts
│   │   │   └── __tests__/
│   │   ├── favorites/
│   │   │   ├── favoritesSlice.ts
│   │   │   ├── screens/FavoritesScreen.tsx
│   │   │   └── __tests__/
│   │   └── profile/
│   │       ├── screens/ProfileScreen.tsx
│   │       └── screens/PerformanceLabScreen.tsx
│   ├── components/ui/            # Button, TextField, Screen, EmptyState, ErrorView, Skeleton
│   ├── services/
│   │   ├── api/baseApi.ts        # createApi + baseQuery with auth and 401 handling
│   │   └── storage/              # Storage interface + AsyncStorage implementation
│   ├── theme/tokens.ts           # colors, spacing, typography (constants, not runtime theming)
│   ├── mocks/
│   │   ├── db.ts                 # fixtures + search/filter/pagination logic
│   │   ├── handlers/auth.ts
│   │   ├── handlers/products.ts
│   │   ├── handlers/index.ts     # shared between app and tests
│   │   ├── server.native.ts      # msw/native's setupServer (__DEV__ only)
│   │   └── server.node.ts        # msw/node's setupServer (tests only)
│   └── test/
│       ├── setup.ts
│       └── renderWithProviders.tsx
├── CLAUDE.md
└── README.md
```

**Dependency rule.** A feature can import from `components/ui`, `services`, `theme`, and
`navigation/types`. A feature does **not** import from another feature: if two need the same thing,
it moves up to `components/ui` or `services`. `favorites` references products only by `id`,
resolving the data from the RTK Query cache, so as not to couple to `catalog`.

This gives a concrete answer to "how does this scale to 40 screens?".

### 3.2 Data flow

```
Screen
  → RTK Query hook (useGetProductsInfiniteQuery)
      → baseApi (fetchBaseQuery, injects Authorization from the store)
          → native fetch
              → MSW intercepts (in dev and in tests)
                  → mocks/db.ts applies filter, sort, and pagination
  ← cache normalized by tags
Screen ← useAppSelector(selector memoized with createSelector)
```

Deliberate separation: **RTK Query owns server state** (products, user); **slices own client
state** (session, search query, category, favorites). Server data is not duplicated inside slices.
That distinction is itself an interview answer.

---

## 4. Functionality

### 4.1 Authentication

- `LoginScreen` with email and password, validation on submit (email format, minimum password),
  loading states, and distinct credential-error and network-error states.
- Test credentials are shown on screen in `__DEV__` so the demo is immediate.
- `POST /api/auth/login` responds `{ accessToken, user }` or `401`.
- The token is persisted; on startup, `RootNavigator` does a bootstrap (splash → Auth or App)
  reading storage before the first navigation render.
- Logout clears the token, resets the store, and **invalidates the RTK Query cache**
  (`api.util.resetApiState`).

### 4.2 Catalog

- `FlatList` of products with:
  - search with a 300 ms debounce (`useDebouncedValue`),
  - filter by category,
  - sort by price or name,
  - **infinite pagination** with RTK Query 2.12's `infiniteQuery`,
  - pull to refresh.
- Explicit states: loading skeleton, empty list (`EmptyState`), error with retry (`ErrorView`).
- `ProductCard` is `React.memo`, with stable `getItemLayout` and `keyExtractor`.

### 4.3 Details

- Typed params (`ProductDetail: { productId: string }`), no `any`.
- Reuses the RTK Query cache: if the product is already there, it renders instantly and revalidates
  in the background.
- Favorite toggle.

### 4.4 Favorites

- Slice persisted in AsyncStorage.
- Resolves products from the cache; if one is missing, it's requested by `id`.

### 4.5 Profile and Performance Lab

- Profile: user data, logout, and entry point to the Performance Lab.
- **`PerformanceLabScreen`**: two equivalent lists side by side —one not memoized and one
  memoized— with a **visible render counter per row**. An input at the top forces parent
  re-renders. While typing, the left list re-renders every row and the right one re-renders none.

  It's the centerpiece of the demo: it lets you **show** memoization instead of just describing it,
  and it naturally opens the conversation about when memoization is **not** worth it.

---

## 5. useMemo / useCallback demonstration

Three levels, meant to be walked through in that order during the interview.

**Level 1 — in the real code (`ProductListScreen`).**
`useCallback` on `renderItem` and `keyExtractor`; `useMemo` on the derived list (filtered + sorted);
`React.memo` on `ProductCard`.

> **Corrected on 2026-08-30 after measuring it.** The original version of this document claimed
> that `React.memo` on the row is useless if `renderItem` is recreated on every render.
> `ProductCard`'s body was instrumented and the renders were counted: while typing in the search
> box, 10 with `useCallback` on `renderItem` and 10 without it; forcing parent re-renders without
> changing the data, 0 and 0. The reason is that `FlatList` wraps each row in a `CellRenderer` that
> is already a `PureComponent`: even if `renderItem`'s identity changes, the cell produces a new
> element with the same props and `React.memo` still short-circuits. What actually sustains the
> memoization is that **`onPressProduct` is memoized**, because that keeps the row's props stable.
> The `useCallback` on `renderItem` is kept for a narrower reason: it avoids re-rendering the
> list's internal wrappers, not the rows.

The point to explain stops being the repeated rule and becomes the measurement: memoization is
justified by measured cost, not by reflex.

**Level 2 — outside React (`catalog/selectors.ts`).**
Reselect's `createSelector`. Explains memoization at the store level and why an inline selector
inside `useSelector` that returns a new object or array triggers re-renders on every dispatch.

**Level 3 — measurable (`PerformanceLabScreen`).**
The render counter turns the argument into evidence.

**Mandatory counterpoint.** In `ProductDetailScreen` a cheap calculation is deliberately left
**not** memoized, with a comment explaining why memoizing it would be worse (the cost of `useMemo`
exceeds that of the calculation, and it adds noise). Knowing when _not_ to memoize is what
distinguishes a senior answer.

Also, `useDebouncedValue` demonstrates a custom hook with correct `useEffect` cleanup.

---

## 6. Mocked backend

- `src/mocks/db.ts`: ~50 in-memory products, in 5 categories, plus the search, filter, sort, and
  cursor pagination logic. It's the "database".
- `src/mocks/handlers/`: MSW handlers. **The same handlers feed the app in dev and the tests** — a
  single source of truth for the API contract.
- Startup: `msw/native` under `if (__DEV__)` in the entrypoint; `msw/node` in `test/setup.ts` with
  `onUnhandledRequest: 'error'`.
- Artificial latency of 300–600 ms so loading and skeletons are visible in the demo.
- Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/products` (query params `q`,
  `category`, `sort`, `cursor`, `limit`), `GET /api/products/:id`.
- **Failure injection:** the `?fail=1` query param (or a toggle in the Performance Lab) forces a
  500, to demonstrate error handling and retry live.

The selling point: since MSW intercepts at the network level, **zero mocking code lives in the
app**. The day a real backend exists, the `mocks/` folder gets deleted and nothing else changes.

---

## 7. Testing

Strategy: **few tests, well chosen**, prioritizing behavior over implementation.

| File                         | What it covers                                   | Why                                                   |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| `authSlice.test.ts`          | Reducers and state transitions                   | Pure logic, fast and stable test                      |
| `catalog/selectors.test.ts`  | `createSelector` memoization                     | Verifies it **doesn't** recompute with the same input |
| `useDebouncedValue.test.ts`  | Debounce and cleanup                             | `jest.useFakeTimers()` + `renderHook`                 |
| `LoginScreen.test.tsx`       | Validation, successful login, 401, network error | Critical user path                                    |
| `ProductListScreen.test.tsx` | loading → data → search → empty → error          | Real integration test against MSW                     |
| `favoritesSlice.test.ts`     | Toggle and persistence                           |                                                       |

- `renderWithProviders.tsx`: helper that wraps in Redux's `Provider` with a fresh store and in
  `NavigationContainer`. Avoids repeating setup and is a good example of test hygiene.
- No large UI snapshots: they're brittle and prove nothing. A defensible, documented decision.
- `coverageThreshold` in `jest.config.js` over `src/features/**` and `src/services/**`.

---

## 8. Type checking

- `strict: true`, plus `noUncheckedIndexedAccess` and `noImplicitOverride`.
- Path alias `@/*` → `src/*`, configured in `tsconfig.json` **and** in `babel.config.js`
  (`babel-plugin-module-resolver`) — both are necessary, and explaining why is a good interview
  question.
- Typed navigation: `RootStackParamList` and friends, with
  `declare global { namespace ReactNavigation { interface RootParamList extends RootStackParamList {} } }`
  so that `navigate()` is type-safe throughout the app without importing types.
- Typed Redux hooks in `app/hooks.ts` — never raw `useSelector`.
- `npm run typecheck` = `tsc --noEmit`, and it runs in CI.
- Zero `any` in `src/`. Where needed, it's `unknown` with narrowing.

---

## 9. Linting and formatting

- `@react-native/eslint-config` as the base. Flat config (`eslint.config.js`) is used if the
  package version supports it; otherwise, `.eslintrc.js`. Decided at scaffold time, by checking the
  actual package.
- Prettier integrated via `eslint-config-prettier` (Prettier formats, ESLint doesn't fight it).
- `import/order` with groups and a blank line between them.
- `no-console` rule as a warning, with `console.error` allowed.
- husky + lint-staged: on pre-commit, `eslint --fix` and `prettier --write` over the staged files.

---

## 10. CI — GitHub Actions

`.github/workflows/ci.yml`, on push to `main` and on every PR:

1. checkout, Node 20 with npm cache
2. `npm ci`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test -- --coverage`

No native build in CI: it's slow, brittle, and doesn't add to what this project wants to
demonstrate — a decision documented in the README, not an omission. Status badge in the README.

---

## 11. Documentation

**`CLAUDE.md`** — for the agent and for the human reader: architecture map, commands, dependency
rules between features, naming conventions, testing strategy, known gotchas (MSW on RN, babel
alias, New Architecture), and the decisions with their reasoning.

**`README.md`** — setup from a clean clone, test credentials, screenshots, and an **"Interview
notes"** section: for each topic (New Architecture, memoization, RTK Query vs Context, typed
navigation, MSW, testing strategy, token security, list performance), the exact file where it's
demonstrated and the short answer. It's the review cheat sheet.

---

## 12. Decisions and tradeoffs (short ADRs)

**ADR-001 — bare RN CLI instead of Expo.**
Expo would have been faster and more stable. Bare was chosen to be able to talk about autolinking,
Podfile, Gradle, and New Architecture, which is what tends to get asked in RN interviews. Cost
accepted: a more fragile setup.

**ADR-002 — TypeScript 5.x instead of 7.0.2.**
TS 7 (the Go port) is the latest version, but its compatibility with `typescript-eslint` and with
RN's types isn't settled yet. A repo that compiles today is prioritized over one that uses the
newest thing. Revisit once the ecosystem stabilizes.

**ADR-003 — AsyncStorage instead of Keychain for the token.**
`react-native-keychain` is the right choice in production (Keychain on iOS, EncryptedSharedPreferences
on Android). AsyncStorage was chosen to minimize native dependencies and reduce the risk of the
build breaking on interview day. **The tradeoff is declared explicitly in the README and in the
code**, behind a `Storage` interface so the replacement is a single-file change.

**ADR-004 — RTK Query instead of TanStack Query.**
Both are valid. RTK Query wins here because the project already uses Redux Toolkit for client
state, and a single library for both things is less conceptual surface area. TanStack Query would
be the better choice if global state were minimal.

**ADR-005 — MSW instead of a mocked services layer.**
MSW intercepts at the network level, so the app's code contains no mocking branches, and the same
handlers serve the tests. Cost: one more dependency and some configuration on RN.

> **Corrected on 2026-08-31 after implementation.** `msw/native` was tested, not assumed, and it
> doesn't work on RN 0.87.1: its `FetchInterceptor` returns an empty body against the native
> `fetch`. In tests, `msw/node` genuinely intercepts; in dev, the entrypoint installs a ~20-line
> shim over `globalThis.fetch` that routes to the same handlers. The property that holds is the
> one that matters: zero mocking code in `src/features/` and `src/services/`, verifiable with
> grep, and deleting `src/mocks/` doesn't touch anything else. See ADR-005 in the README for the
> full detail, including the production bundle measurement.

---

## 13. Suggested implementation order

1. Scaffold RN 0.87.1 (with native build verification and fallback to 0.86.3), TS, alias, ESLint,
   Prettier, husky, Jest, CI. **Verify that lint + typecheck + test pass green before continuing.**
2. `services/api`, `services/storage`, `mocks/` (db + handlers + startup in dev and tests).
3. `components/ui` and `theme/tokens`.
4. Auth: slice, api, `LoginScreen`, session bootstrap, tests.
5. Navigation: `RootNavigator`, tabs, stack, types.
6. Catalog: api with `infiniteQuery`, UI slice, selectors, list, search, filters, tests.
7. Details and favorites.
8. Profile and `PerformanceLabScreen`.
9. `CLAUDE.md` and `README.md` with the interview notes.
10. Final verification pass and publish to GitHub.

Each step closes with lint, typecheck, and tests green. Nothing is assumed without running the
command.
