# CLAUDE.md

Orientation guide for working in this repo: commands, structure, rules, and gotchas already
stepped on. The substantive decisions (why this library and not another) are in the README,
ADRs section; this one covers the operational side.

## Commands

```bash
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm test            # jest
npm run ios         # react-native run-ios
npm run android     # react-native run-android
npm start           # react-native start (just the bundler, doesn't install anything)
```

A single test, by file or by name:

```bash
npx jest src/features/catalog/__tests__/ProductListScreen.test.tsx
npx jest -t "shows the error with retry when the API fails"
```

Coverage (uses the `coverageThreshold` from `jest.config.js`):

```bash
npm test -- --coverage
```

## Architecture map

Real tree (`find src -type d | sort`), one line per folder:

```
src/app                     configureStore, listenerMiddleware, typed hooks, and App composition
src/components/ui           pure UI primitives (Button, TextField, Screen, Skeleton, EmptyState,
                             ErrorView) plus FavoriteButton, which dispatches to Redux — not a pure primitive
src/features/auth           LoginScreen and the demo credentials constants
src/features/catalog        catalogApi (infiniteQuery), catalogSlice (UI only: query/category/sort),
                             selectors, list/filter/sort components, useDebouncedValue, the two
                             screens (list and detail)
src/features/favorites      FavoritesScreen; favorites state lives in services/favorites
src/features/profile        ProfileScreen (logout) and PerformanceLabScreen (memoization demo)
src/mocks                   in-memory "backend": db.ts, MSW handlers, bootstrap for RN and for Jest
src/navigation              RootNavigator (auth vs. app), AuthNavigator, AppTabs, CatalogStack,
                             ProfileStack, and the typed ParamLists
src/services/api            baseApi (fetchBaseQuery with 401 handling), config, productsApi,
                             sessionEvents (neutral action to invert the dependency toward session)
src/services/favorites      slice + persistence listener + favorites-by-id selectors
src/services/session        slice + api (login) + persistence listener + useSession hook
src/services/storage        Storage interface, AsyncStorage implementation, and an in-memory one for tests
src/test                    Jest polyfills, global MSW/RN setup, renderWithProviders
src/theme                   design tokens (color, spacing, typography, radii)
src/utils                   formatPrice and stateless utilities
```

Every folder under `features/` and `services/` has its `__tests__/` next to the code it tests.

## Dependency rule

A feature doesn't import from another feature. Whatever two or more features need to share moves
up a level:

- To `components/ui` if it's reusable presentation.
- To `services/` if it's state, network logic, or persistence. `session`, `favorites`, and
  `productsApi` live there instead of in `features/auth`, `features/favorites`, and
  `features/catalog` because more than one screen needs them (`ProductDetailScreen` and
  `FavoritesScreen` share `productsApi`; `ProfileScreen` and `RootNavigator` share `session`).
- To `utils/` if it's a pure, stateless function.

`services/` also doesn't import from `features/`. When `baseApi` needs to signal that a session
has expired (401), it doesn't import `sessionSlice`: it dispatches a neutral action creator
(`src/services/api/sessionEvents.ts`) that `sessionSlice` listens to. The dependency ends up
inverted.

This isn't discipline, it's an ESLint rule (`eslint.config.js`, the `import/no-restricted-paths`
block): crossing from one feature to another, or from `services/` to `features/`, is a lint
error, not a code-review convention. The rule resolves every import to a file on disk before
comparing it against the zone, so `@/features/other/x`, `../other/x`, and
`../../features/other/x` all fail equally — important, because the convention further below asks
for relative imports within your own feature. Features are read off disk when the config loads,
so a new folder under `src/features/` gets protected on its own.

Three ways to break it, all three a lint error: adding
`import {DEMO_EMAIL} from '@/features/auth/demoCredentials';` to
`src/services/api/config.ts`; the same import in `src/features/catalog/selectors.ts`; and that
same import written as `'../auth/demoCredentials'`. `npx eslint <file>` rejects all three with the
zone's message.

It's what lets the architecture scale to more screens without depending on someone remembering
the rule.

## Server state vs. client state

RTK Query (`baseApi`, `catalogApi`/`productsApi`, `sessionApi`) owns everything that comes from
the network: catalog, product detail, login. It has its own cache, tags, deduplication, and
loading states; none of this is duplicated in a slice.

The Redux slices (`catalogSlice`, `favoritesSlice`, `sessionSlice`) store only client state:
`catalogSlice` stores the chosen search/category/sort order, not the products; `favoritesSlice`
stores a list of ids, not the favorite products themselves (those get resolved by reading the RTK
Query cache — see the "Favorites by id" note in the README); `sessionSlice` stores the token, the
authentication state, and the user data that came back in the login response.

There's no session revalidation endpoint: on startup, `restoreSession` trusts the stored token
and drops straight into the app. If it no longer works, the first authenticated request returns
a 401 and the `baseQuery` wrapper dispatches `unauthorized`, which clears session and favorites.
Validation is lazy on purpose — there's no blocking request on every startup — and the cost is
that a stale token gets discovered on the first screen with data, not on the splash screen.

## Conventions

- Named exports everywhere, with two exceptions: `App` (needs a default export for
  `AppRegistry`) and each slice's reducer, which is exported as default following RTK convention
  — that same slice's actions are named exports.
- Tests in `__tests__/` next to the code they test, not in a global `__tests__` directory.
- `testID` in kebab-case (`product-card-${id}`, `login-submit`, `lab-render-count-memo-0`).
- Imports ordered by `import/order`: builtins/external, then internal (`@/...`), then relative,
  with a blank line between groups and alphabetized within each one. The linter enforces it, no
  need to order them by hand if `eslint --fix` runs on pre-commit.

## Testing strategy

Few tests, chosen by behavior: what has logic gets tested (reducers, selectors, hooks, screen
integration against MSW); pure presentation doesn't. There are no large UI snapshots — they're
brittle and don't defend anything a behavior test doesn't defend better.

`src/test/renderWithProviders.tsx` wraps things in a fresh Redux store and a
`NavigationContainer` so that setup doesn't get repeated in every file. MSW runs with
`onUnhandledRequest: 'error'` in tests (`src/test/setup.ts`): an unmocked request fails the test
instead of hanging it or silently returning the wrong data.

## Gotchas

- **The `@/` alias needs to exist in three files, not one.** `tsconfig.json` (`paths`),
  `babel.config.js` (`babel-plugin-module-resolver`), and `jest.config.js`
  (`moduleNameMapper`) resolve the alias in three different tools (TypeScript, Metro/Babel,
  Jest) that don't read each other's config. Adding a new alias without touching all three
  silently breaks one of the three chains depending on which command runs.

- **MSW on React Native needed four toolchain fixes, and in the end doesn't intercept at the
  native level.** `msw/native` was tested, not ruled out on suspicion: on RN 0.87.1 its
  `FetchInterceptor` returns an empty body against native `fetch` (`SyntaxError: JSON Parse
error: Unexpected end of input`), a transport problem that no additional polyfill fixes. Along
  the way, four pieces of toolchain turned out to be necessary anyway:
  `@babel/plugin-transform-class-static-block` (Metro doesn't bundle without it),
  `web-streams-polyfill`, a `BroadcastChannel` stub, and registering
  `AppRegistry.registerComponent` synchronously in `index.js` instead of waiting on a promise
  (otherwise the app doesn't cold-start, with or without MSW). The result: in tests, `msw/node`
  really does intercept; in dev, the entrypoint installs a ~20-line shim over `globalThis.fetch`
  that routes to the same handlers. See ADR-005 in the README for the property that does hold up
  with this.

- **`jest.config.js` maps `msw/node`, `immer`, and `react-redux` to their CJS builds by hand,
  instead of using `customExportConditions: ['react-native']`.** That global condition does
  resolve these three packages, but it also changes which build gets resolved for React
  Navigation, `react-native-screens`, `react-native-safe-area-context`, and
  `use-sync-external-store` — packages that deliberately want the `react-native` condition from
  their `exports`. A targeted mapper fails loudly ("module not found") if the path it points to
  stops existing; a global condition change can silently resolve the wrong package. The three
  mappers also each document which package is being routed around and why (see the comments in
  the file).

- **RTK Query schedules a `requestAnimationFrame` for its auto-batching, and RN's Jest preset
  implements it as a real `setTimeout(0)`.** That can fire after a test has already finished and
  its store was discarded, producing updates outside `act()` intermittently.
  `src/test/setup.ts` replaces that timer with a `queueMicrotask`, only in the test environment
  — the production config isn't touched to accommodate this.

- **`noUncheckedIndexedAccess` forces checking any indexed access** (`array[i]`, `record[key]`)
  before using it, because TypeScript types it as `T | undefined` instead of `T`. There's no
  non-null assertion `!` in `src/` to dodge it: wherever the access can fail, it's handled with
  an `if`, a default value, or explicit narrowing.

- **New Architecture (Fabric + TurboModules) is active by default**, it's not a flag that was
  turned on by hand. The explicit evidence is in `android/gradle.properties`
  (`newArchEnabled=true`); on iOS there's no line in the `Podfile` that mentions it, because RN
  0.87.1 turns it on inside `react_native_pods.rb`. The renderer is C++ and there's no async
  bridge in between.

- **The production bundle must not be able to import `src/mocks/`.** `metro.config.js` resolves
  `./msw.polyfills` and `./src/mocks/server.native` to an empty module when `context.dev` is
  false, so even if something did end up importing those paths in a release build, it doesn't
  drag MSW or the ~50 fixture products into the bundle. Measured: 1,565,061 bytes with those
  modules included by hand versus ~897,000 bytes with the stub active. The demo credentials
  (`src/features/auth/demoCredentials.ts`) are the feature's own copy, not an import from
  `src/mocks/db.ts`, with a test that compares them so they don't diverge: that way, the day
  `src/mocks/` gets deleted, the app still compiles.

- **`overrides.picomatch` in `package.json` exists so the lockfile is portable.** Without it,
  `npm ci` fails on Linux with `EUSAGE` even though it works on macOS. The cause: `fdir` declares
  `picomatch ^3 || ^4` as a _peer_, while Jest needs `^2`, and npm resolves that conflict with
  different hoisting depending on which platform-optional binaries it installs
  (`unrs-resolver` ships one per operating system). The resulting tree stops matching the lock
  generated on another platform. Pinning a single `picomatch@^4.0.7` removes the ambiguity: one
  package at the root, the same tree on any system. Jest works fine with v4 — the full suite
  confirms it. If Jest ever raises its range, the override can be removed and re-verified with
  `npm ci` on Linux.

## Decisions

The substantive tradeoffs — why bare RN and not Expo, why AsyncStorage and not Keychain, what
actually happened with MSW on RN, which versions ended up pinned and why — are in the README,
**ADRs** section.
