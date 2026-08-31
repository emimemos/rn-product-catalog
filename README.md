# rn-product-catalog

[![CI](https://github.com/emimemos/rn-product-catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/emimemos/rn-product-catalog/actions/workflows/ci.yml)

## What this is

A product catalog in React Native (bare CLI, no Expo): login, a list with search, filters,
sorting and infinite pagination, product detail, persisted favorites, and a profile screen with
a performance lab that measures memoization live. There's no real backend: an in-memory mock
server (MSW) serves the same handlers in development and in tests.

It's built as a portfolio piece for React Native technical interviews: every architecture
decision, memoization choice, or tradeoff is meant to be explainable out loud and pointed at in a
concrete file, not just described in the abstract. This document and `CLAUDE.md` are the map for
doing that.

## Setup from a clean clone

Requirements: Node ≥ 22.11 (see `engines` in `package.json`; CI runs on Node 22 — local
development was also tested on Node 20.19, with `engines` warnings but no failures), JDK 17 for
Android, a recent Xcode for iOS.

```bash
npm ci

# CocoaPods runs with the repo's Gemfile, not the global pod: the Gemfile
# pins the version and `.bundle/config` installs the gems into vendor/bundle.
bundle install
bundle exec pod install --project-directory=ios

npm run ios       # or: npm run android
```

`npm run lint`, `npm run typecheck`, and `npm test -- --coverage` are the three commands that
`.github/workflows/ci.yml` runs, on Node 22; they should pass clean with no manual step beyond the
ones above. The badge above reflects the state of the latest run.

**Only iOS was verified running natively on this machine** (there's no `ANDROID_HOME`
configured). The Android code has no branch that diverges from iOS — same JS, same New
Architecture bridge — but the Android build itself was never run, nor seen running on an
emulator.

## Demo credentials

```
demo@catalog.dev / password123
```

These are fixed in `src/features/auth/demoCredentials.ts` (used by the UI, under `__DEV__`) and
in `src/mocks/db.ts` (used by the mock server). A test (`demoCredentials.test.ts`) compares both
files so they don't diverge — they're two copies on purpose, not a shared import; see ADR-005
and the "mock isolation" note below.

## Screenshots

| Login                                | Catalog                                  | Details                                 |
| ------------------------------------ | ---------------------------------------- | --------------------------------------- |
| ![Login](docs/screenshots/login.png) | ![Catalog](docs/screenshots/catalog.png) | ![Details](docs/screenshots/detail.png) |

| Favorites                                    | Performance Lab                                          |
| -------------------------------------------- | -------------------------------------------------------- |
| ![Favorites](docs/screenshots/favorites.png) | ![Performance Lab](docs/screenshots/performance-lab.png) |

The Performance Lab one is the most useful to read: 5 characters were typed into the field above
and it landed on **"Parent renders: 6"** (1 initial render + 5 per keystroke). The **Not
memoized** column climbed to 6 across all 8 rows; the **Memoized** column stayed at 1 across all 8. Same parent re-rendering 6 times, opposite result depending on whether the row is memoized and
receives stable props. Verified live on the simulator, not just in the screen's unit test.

It was also verified on the simulator, in addition to in the tests: the catalog loads showing its
skeleton before it has data; search filters the list keystroke by keystroke with debounce (typing
"atlas" leaves only "Headphones Atlas", "Gamepad Atlas", and "Lamp Atlas" visible); scrolling to
the end of the list brings in more pages — the full catalog exceeds a single page, and this was
confirmed by reaching "Smartwatch" products far below alphabetically from the first "Gamepad"
ones; and favorites resolves from the RTK Query cache, with no new request, when the product was
already seen in the list. The pull-to-refresh gesture ran without errors or hangs, but since the
mock data is static, the screenshot can't visually distinguish a successful refetch from a no-op.

That's exactly the kind of claim a screenshot can't back up and a test can, so the list's three
interactions are tested by counting requests, not by looking at pixels
(`ProductListScreen.test.tsx`, the "requests each interaction triggers" block): the count comes
from msw's event stream, against the same handlers that serve the rest of the suite.
Pull-to-refresh fires exactly one more request, with the same URL — a refetch, not a new page;
the retry button after a 500 requests again and repaints the list; reaching the end requests the
next page with `cursor=p-010`, the id of the last visible row, and the list goes from 10 to 20
items; and with a filter whose result fits on a single page, reaching the end fires nothing. The
first three fail if the handler backing them is emptied out — this was confirmed by doing exactly
that.

## Interview notes

Each row points to a real file in the repo.

| Topic                                  | Where it is                                                                                | Short answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New Architecture                       | `android/gradle.properties`                                                                | Fabric + TurboModules active by default since RN 0.76 (here, RN 0.87.1). Renderer in C++, no classic async bridge. The explicit evidence in the repo is `newArchEnabled=true` on Android; on iOS there's no line in the `Podfile` that mentions it, because RN 0.87 turns it on inside `react_native_pods.rb`.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Memoization level 1                    | `src/features/catalog/screens/ProductListScreen.tsx`                                       | Measured, not assumed: inside `FlatList`, `useCallback` on `renderItem` doesn't change how many times `ProductCard` renders (10 renders with and without memoization when typing in the search box; 0 and 0 when forcing parent re-renders without changing data). The reason is that `FlatList` already wraps each row in a `CellRenderer` that is a `PureComponent`. What does hold up the memoization is `onPressProduct` being memoized, keeping the row's props stable; the `useCallback` on `renderItem` is kept for a different, narrower reason: it avoids re-rendering the list's internal wrappers.                                                                                                                  |
| Memoization level 2                    | `src/features/catalog/selectors.ts`                                                        | Both sides of the same rule, in one file: `selectProductsQueryArgs` builds a new object and needs `createSelector`, because without it the identity changes on every call and triggers a re-render on every dispatch whether or not the change is related. `selectHasActiveFilters`, right next to it, returns a boolean and is **not** memoized: `useSelector` compares with `===`, and a primitive doesn't change identity without changing value. What decides this isn't whether the selector is derived, it's whether it returns a new reference (same criterion in `src/services/favorites/selectors.ts`).                                                                                                               |
| Memoization level 3                    | `src/features/profile/screens/PerformanceLabScreen.tsx`                                    | With no `FlatList` in the mix, mapping rows directly, prop stability is what decides everything: the not-memoized column climbs in lockstep with the parent, the memoized one stays put. It's the contrast that shows why the level-1 result doesn't generalize to just any list.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| When NOT to memoize                    | `src/features/catalog/screens/ProductDetailScreen.tsx`                                     | A cheap computation (a comparison and a string concatenation over data already in memory) is deliberately left without `useMemo`, with a comment explaining the structural reason without inventing a measurement that was never made.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Custom hook with cleanup               | `src/features/catalog/hooks/useDebouncedValue.ts`                                          | The `return` from `useEffect` cancels the pending timer; without it, every keystroke would leave a dangling timer still running after the value had already changed again.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RTK Query vs. Context                  | `src/services/api/baseApi.ts`, `src/features/catalog/catalogApi.ts`                        | Cache, tags, request deduplication, and loading states (`isLoading`/`isFetching`/`error`) come for free. Context isn't a cache system: without this, all of that would have to be reimplemented by hand.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Server state vs. client state          | `src/features/catalog/catalogSlice.ts`                                                     | The slice stores the chosen search, category, and sort order — never products. Products live only in the RTK Query cache.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Infinite pagination                    | `src/features/catalog/catalogApi.ts`                                                       | `infiniteQuery` with a cursor; `getNextPageParam` returns `undefined` when there are no more pages, which is the signal that cuts off infinite scroll.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Typed navigation                       | `src/navigation/types.ts`                                                                  | One `ParamList` per navigator plus a `declare global` that extends `ReactNavigation.RootParamList`, so `navigation.navigate` types its arguments across the whole app without casting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 401 handling                           | `src/services/api/baseApi.ts`, `src/services/api/sessionEvents.ts`                         | A wrapper around `baseQuery` detects the 401 and dispatches a neutral action creator (`unauthorized`) instead of importing `sessionSlice` directly — that way `services/` doesn't depend on `features/`. That same path is what validates the restored token: on startup, `restoreSession` trusts whatever is in storage and drops straight into the app, without asking the server anything. If that token no longer works, the first authenticated request returns a 401 and logs the user out. It's lazy validation on purpose: it avoids a blocking request on every startup and a "revalidating" state on the splash screen, at the cost of a stale token being discovered a moment later, on the first screen with data. |
| Token security                         | `src/services/storage/asyncStorage.ts`                                                     | AsyncStorage is **not encrypted**: it stores the token as plain text in the app's sandbox. On a jailbroken/rooted device, or in an unencrypted backup, the token is readable. It sits behind a `Storage` interface (see ADR-003) precisely so that replacing it with Keychain/EncryptedSharedPreferences means changing one file, not rewriting the app.                                                                                                                                                                                                                                                                                                                                                                       |
| Persistence without polluting reducers | `src/services/session/sessionListeners.ts`, `src/services/favorites/favoritesListeners.ts` | `createListenerMiddleware` separates the side effect (writing to storage) from the reducer, which stays pure and synchronous. One mechanism per effect: the logout thunk clears the slice and the cache, and it's the listeners that clear storage — so the 401, which never goes through the thunk, clears exactly the same thing. The two `__tests__/*Listeners.test.ts` files make assertions about storage, not about the store: emptying the body of any of the four effects fails a test.                                                                                                                                                                                                                                |
| Favorites by id                        | `src/services/favorites/selectors.ts`, `src/services/favorites/favoritesSlice.ts`          | Only a list of ids is persisted, not the products. Verified live: a product already seen in the catalog (and therefore in the RTK Query cache) shows up in Favorites without triggering any new request; an id without that product in cache does trigger one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| MSW                                    | `src/mocks/`                                                                               | The same handlers feed both tests and dev: a single source of truth for the API contract. How that contract reaches the app in each environment changed during implementation — see ADR-005.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| List performance                       | `src/features/catalog/screens/ProductListScreen.tsx`                                       | `getItemLayout` with a fixed height (no measuring each row, scroll-to-index is O(1)) and a stable `keyExtractor`, both in the screen; the row itself (`components/ProductCard.tsx`) is wrapped in `React.memo`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Testing strategy                       | `src/features/catalog/__tests__/ProductListScreen.test.tsx`                                | Real integration against MSW — without hand-mocking the store or the network — covering loading → data → search → empty → error → retry, plus pull-to-refresh and infinite scroll verified by request count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Scaling to many screens                | `eslint.config.js`                                                                         | The rules "a feature doesn't import from another feature" and "`services/` doesn't import from `features/`" are enforced by `import/no-restricted-paths`, which resolves every import to a file before comparing it, so the alias and the relative path fail equally. It's not code review discipline.                                                                                                                                                                                                                                                                                                                                                                                                                         |

## ADRs

Substantive decisions and their tradeoffs. All five were written in the original design; two
changed during implementation, and here they stand with what actually happened.

**ADR-001 — Bare RN CLI instead of Expo.**
Expo would have been faster and more stable to stand up. Bare was chosen to be able to talk about
autolinking, Podfile, Gradle, and New Architecture in an RN interview. Accepted cost: a more
fragile setup (see ADR-002 and the MSW note in ADR-005, both symptoms of that cost).

**ADR-002 — A pinned toolchain instead of the newest version of each piece.**
_Revised after implementation._ The original plan fixed TypeScript 5.x, ESLint 10, and Jest 30.
The RN 0.87.1 template instead ships **TypeScript 6.0.3, ESLint 8.57.1, and Jest 29.7.0**, and
those versions were accepted instead of forcing the plan's: forcing pins against what the
template itself resolves as compatible would have been exactly the fragility this decision was
meant to avoid. The substance still holds: **not** TypeScript 7.x (the Go port), because its
compatibility with `typescript-eslint` and RN's types wasn't settled at the time of deciding.

**ADR-003 — AsyncStorage instead of Keychain for the token.**
`react-native-keychain` is the right call in production (Keychain on iOS,
EncryptedSharedPreferences on Android). AsyncStorage was chosen to minimize native dependencies
and reduce the risk of the build breaking during development. The cost is stated plainly:
**AsyncStorage is not encrypted**. The token sits as plain text in the app's sandbox; on a
jailbroken or rooted device, or reading an unencrypted backup, it's readable. It sits behind a
`Storage` interface (`src/services/storage/types.ts`) so that changing it means replacing one
file, not rewriting the app.

**ADR-004 — RTK Query instead of TanStack Query.**
Both are valid. RTK Query wins here because the project already uses Redux Toolkit for client
state, and a single library for network cache and client state is less conceptual surface to
explain. TanStack Query would be the better choice if global state were minimal or nonexistent.

**ADR-005 — MSW as the single source of truth for the contract, with an interception mechanism
that turned out different from what was planned.**
_Revised after implementation._ The original idea was for `msw/native` to intercept at the
network level in development, the same way `msw/node` does in tests. This was tested, not
assumed: on React Native 0.87.1, `msw/native`'s `FetchInterceptor` returns an empty body against
the native `fetch`, which produces a `SyntaxError: JSON Parse error: Unexpected end of input` on
every request. It's a transport problem, not something an additional polyfill fixes.

What was left standing: in **tests**, `msw/node` really does intercept at the network level, just
as planned. In **development**, the entrypoint (`index.js`) installs a ~20-line shim over
`globalThis.fetch` that routes to the **same handlers** the tests use — same contract, same
`src/mocks/handlers/`, a different hook-in mechanism depending on the environment.

The property that does hold, and the one worth claiming, is this: **zero mocking code lives in
`src/features/` or `src/services/`** — verifiable with a grep — and deleting `src/mocks/` plus
the few lines that start it in `index.js` touches nothing else. That independence is at the
source code level, not the bundle level: without extra help, a production build would drag in the
~50 fixture products and the `msw` dependency (measured: 1,565,061 bytes with those modules
included). `metro.config.js` resolves those modules to an empty stub outside `dev` mode, and the
production bundle dropped to ~897,000 bytes without them.

## What's not here and why

Deliberate scope decisions, not oversights:

- **No real backend, database, or real authentication.** The goal is to demonstrate the
  frontend; a real backend would be a second surface to maintain without adding anything to
  what's meant to be shown.
- **No dark mode / dynamic theming, no i18n, no complex animations, no push notifications.**
  Each one is a full feature on its own, and none of them is what's being demonstrated here.
- **No Detox or any automated E2E in the repo.** Live behavior verification (infinite scroll,
  search, pull-to-refresh, the Performance Lab counters) was done manually against a simulator,
  with Maestro used as a capture tool, not as a suite that runs in CI.
- **No native build in CI.** CI runs lint, typecheck, and tests over JS/TS; it doesn't build the
  app for iOS or Android. Building on every push would add CI minutes and a macOS runner without
  changing the coverage of what's meant to be demonstrated.
- **Partial and deliberate test coverage.** What has logic gets tested (reducers, selectors,
  persistence listeners, hooks, screen integration against MSW); pure presentation components
  don't have a dedicated test. The `coverageThreshold` in `jest.config.js` is set just below what
  the suite measures today — 98.19 / 96.87 / 90.82 / 98.12 — so it fails if a test is deleted or
  code is added without coverage. A loose threshold doesn't defend anything. The denominator is
  also a decision: `collectCoverageFrom` counts `features/`, `services/`, and `utils/`, and
  leaves out `src/app`, `src/navigation`, `src/components/ui`, `src/theme`, `src/mocks`, and
  `src/test`. Several of those are exercised anyway by the screen tests; what they don't do is
  count toward the percentage.
