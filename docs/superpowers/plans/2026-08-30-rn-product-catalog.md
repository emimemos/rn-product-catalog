# rn-product-catalog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native product-catalog app with auth, search, infinite pagination, and favorites, where every technical decision is defensible in an interview.

**Architecture:** Feature-based organization on top of bare RN CLI. RTK Query owns server state and the slices own client state. MSW intercepts at the network level, so the app makes real HTTP calls both in dev and in tests and contains no mocking branch. Each feature injects its endpoints into a single `baseApi`.

**Tech Stack:** React Native 0.87.1 (bare, New Architecture), React 19.2.3, TypeScript 5.x strict, Redux Toolkit 2.12 + RTK Query, React Navigation 7, MSW 2.15, Jest 30 + @testing-library/react-native 14, ESLint 10 + Prettier, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-30-rn-product-catalog-design.md`

> **This document is the plan as it was written before implementation, and is kept
> as a record.** The implementation corrected it on several points: the order of
> `addCase`/`addMatcher` in RTK, the `index.js` startup, the mock of
> `react-native-safe-area-context`, the claim about memoization in `FlatList`
> (refuted upon measuring it), and the `filtersReset` action, which was removed
> for having no control that triggers it. The code and the README are the source
> of truth about the current state; the corresponding ADR explains each change.

## Global Constraints

- React Native **0.87.1** (bare CLI, no Expo). Documented fallback: **0.86.3** if the native build fails. The decision is made in Task 1, not afterward.
- TypeScript **5.x** (the one from the template). **Not TypeScript 7.x** — see ADR-002.
- `strict: true` plus `noUncheckedIndexedAccess` and `noImplicitOverride`.
- **Zero `any` in `src/`.** Where needed, it's `unknown` with narrowing.
- Path alias `@/*` → `src/*`, configured in `tsconfig.json`, `babel.config.js`, and `jest.config.js`.
- **Dependency rule:** a feature can import from `components/ui`, `services`, `theme`, `utils`, and `navigation/types`. A feature **never** imports from another feature. Enforced with ESLint (`no-restricted-imports` over `@/features/**` inside `src/features/**`); within a feature itself, relative imports are used.
- `favorites` references products only by `id` and resolves the data from the RTK Query cache.
- The same MSW handlers feed the app in dev and the tests — a single source of truth for the API contract.
- No large UI snapshots. No native build in CI.
- Each task closes with `npm run lint && npm run typecheck && npm test` green and a commit. **Nothing is assumed without running the command.**
- Commit messages in Conventional Commits format.

### Deliberate additions to the spec's tree

Spec §3.1 doesn't list these; they're added with justification and documented in `CLAUDE.md`:

| File                                | Why                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/services/api/types.ts`         | The API contract is consumed by features **and** mocks. It lives in the API layer so no feature depends on another, nor on another feature's mocks.      |
| `src/services/api/config.ts`        | `API_BASE_URL` shared between `baseApi` and the MSW handlers.                                                                                            |
| `src/services/api/sessionEvents.ts` | A neutral `unauthorized` action creator, so `services` doesn't import from `features` when handling the 401.                                             |
| `src/app/listenerMiddleware.ts`     | Typed `createListenerMiddleware`; persistence is done per listener instead of inside the reducers (the reducers stay pure).                              |
| `src/services/api/productsApi.ts`   | `getProduct` is consumed by details (the `catalog` feature) and favorites (the `favorites` feature). In the shared layer, no feature depends on another. |
| `src/services/session/`             | Session state is consumed by `navigation`, `profile`, and the API layer. The `auth` feature keeps only the login screen.                                 |
| `src/services/favorites/`           | Favorites are consumed by the favorites screen and the product detail screen. Same criterion.                                                            |
| `src/utils/formatPrice.ts`          | Price formatting shared by catalog, detail, and favorites.                                                                                               |

---

## Task 1: Scaffolding and toolchain green

**Files:**

- Create: the entire RN 0.87.1 template at the repo root (`android/`, `ios/`, `index.js`, `app.json`, `package.json`, `Gemfile`)
- Create: `tsconfig.json`, `babel.config.js`, `jest.config.js`, `eslint.config.js`, `.prettierrc.js`, `.gitignore`
- Create: `.husky/pre-commit`, `.lintstagedrc.json`
- Create: `.github/workflows/ci.yml`
- Create: `src/utils/formatPrice.ts`
- Test: `src/utils/__tests__/formatPrice.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `formatPrice(cents: number): string`. npm scripts `lint`, `typecheck`, `test`, `ios`, `android`, `start`. Alias `@/*` resolvable from TS, Babel, and Jest.

- [ ] **Step 1: Generate the template outside the repo**

The RN CLI requires an empty directory, and this repo already has `docs/` and `.git`. It gets generated alongside and then copied over.

```bash
cd /Users/emilianomartino/Documents
npx @react-native-community/cli@latest init RnProductCatalog \
  --version 0.87.1 \
  --directory rn-product-catalog-scaffold \
  --install-pods false
```

- [ ] **Step 2: Copy the template into the repo without stepping on git or docs**

```bash
cd /Users/emilianomartino/Documents
rsync -a --exclude '.git' rn-product-catalog-scaffold/ rn-product-catalog/
rm -rf rn-product-catalog-scaffold
cd rn-product-catalog
npm install
```

Verify that `git status` doesn't show `docs/` deleted or `.git` touched.

- [ ] **Step 3: Add `.idea/` to `.gitignore`**

The repo already has an untracked `.idea/`. Add to the end of `.gitignore`:

```
# IDE
.idea/
*.iml
```

- [ ] **Step 4: Verify the iOS native build — version decision point**

```bash
cd ios && pod install && cd ..
npm run ios
```

Expected: the app launches on the simulator and shows the RN welcome screen.

**If it fails** (CocoaPods against Xcode 26.6, or Gradle against JDK 17): regenerate the template with `--version 0.86.3`, repeating Steps 1–2, and note the change in ADR-001 in the README. Do not move on to Task 2 with a broken build. No application code in this plan changes between 0.87.1 and 0.86.3.

- [ ] **Step 5: Verify the Android native build**

```bash
npm run android
```

Expected: the app launches on the emulator. Same fallback criterion as Step 4.

- [ ] **Step 6: Install the toolchain dependencies**

```bash
npm install --save-dev \
  babel-plugin-module-resolver \
  eslint-config-prettier \
  eslint-plugin-import \
  eslint-import-resolver-typescript \
  @testing-library/react-native \
  husky \
  lint-staged
```

- [ ] **Step 7: Configure TypeScript**

`tsconfig.json`:

```json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "index.js"],
  "exclude": ["node_modules", "android", "ios"]
}
```

- [ ] **Step 8: Configure the alias in Babel**

`babel.config.js`:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {'@': './src'},
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
  ],
};
```

> The alias is needed **twice**: `tsconfig.json` resolves it for the type checker and the editor; `babel.config.js` rewrites it at build time so Metro can find it. One doesn't replace the other. (An expected interview question.)

- [ ] **Step 9: Configure ESLint — verify the RN config's format first**

ESLint 10 only accepts flat config. Before writing the file, inspect what the package exports:

```bash
cat node_modules/@react-native/eslint-config/package.json | grep -A5 '"exports"'
node -e "const c=require('@react-native/eslint-config'); console.log(Array.isArray(c) ? 'FLAT' : 'ESLINTRC')"
```

**Branch A — prints `FLAT`:** use the config directly (see Step 10).

**Branch B — prints `ESLINTRC`:** install the bridge and wrap it:

```bash
npm install --save-dev @eslint/eslintrc @eslint/js
```

and in Step 10 replace the line `...reactNativeConfig,` with:

```js
const {FlatCompat} = require('@eslint/eslintrc');
const compat = new FlatCompat({baseDirectory: __dirname});
// ...inside the exported array:
...compat.extends('@react-native'),
```

- [ ] **Step 10: Write `eslint.config.js`**

```js
const reactNativeConfig = require('@react-native/eslint-config');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'vendor/**',
    ],
  },
  ...reactNativeConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {import: importPlugin},
    settings: {
      'import/resolver': {
        typescript: {project: './tsconfig.json'},
      },
    },
    rules: {
      'no-console': ['warn', {allow: ['error', 'warn']}],
      'import/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [{pattern: '@/**', group: 'internal'}],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {order: 'asc', caseInsensitive: true},
        },
      ],
    },
  },
  {
    // Dependency rule from spec §3.1, enforced by the linter.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message:
                "A feature doesn't import from another feature. Move shared code up to components/ui, services, or utils. Within a feature itself, use relative imports.",
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
];
```

- [ ] **Step 11: Write `.prettierrc.js`**

```js
module.exports = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: 'all',
};
```

- [ ] **Step 12: Configure Jest**

`jest.config.js`:

```js
module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {'^@/(.*)$': '<rootDir>/src/$1'},
  transformIgnorePatterns: [
    'node_modules/(?!(?:@?react-native|@react-navigation|msw|@mswjs|@bundled-es-modules|until-async|outvariant|strict-event-emitter|headers-polyfill)/)',
  ],
  collectCoverageFrom: [
    'src/features/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {statements: 70, branches: 60, functions: 65, lines: 70},
  },
};
```

- [ ] **Step 13: Create the test setup files (empty for now)**

`src/test/polyfills.ts`:

```ts
// MSW 2 needs the streams and encoding Web APIs, which Jest's `node`
// environment doesn't expose by default under the React Native preset.
import {ReadableStream, TransformStream} from 'node:stream/web';
import {TextDecoder, TextEncoder} from 'node:util';
import {BroadcastChannel} from 'node:worker_threads';

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
  BroadcastChannel,
});

export {};
```

`src/test/setup.ts`:

```ts
// The MSW server and the native library mocks are added in Task 4.
export {};
```

- [ ] **Step 14: Add the scripts to `package.json`**

In the `scripts` key, leave:

```json
{
  "android": "react-native run-android",
  "ios": "react-native run-ios",
  "start": "react-native start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "prepare": "husky"
}
```

- [ ] **Step 15: Write the failing `formatPrice` test**

`src/utils/__tests__/formatPrice.test.ts`:

```ts
import {formatPrice} from '../formatPrice';

describe('formatPrice', () => {
  it('formats cents as dollars with two decimals', () => {
    expect(formatPrice(1999)).toBe('$19.99');
  });

  it('pads the cents with a leading zero', () => {
    expect(formatPrice(1905)).toBe('$19.05');
  });

  it('formats an exact price with no cents', () => {
    expect(formatPrice(2000)).toBe('$20.00');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('adds a thousands separator', () => {
    expect(formatPrice(123456)).toBe('$1,234.56');
  });
});
```

- [ ] **Step 16: Run the test and verify it fails**

Run: `npx jest src/utils --no-coverage`
Expected: FAIL — `Cannot find module '../formatPrice'`.

- [ ] **Step 17: Implement `formatPrice`**

`src/utils/formatPrice.ts`:

```ts
/**
 * Prices travel over the API in cents (integers) so as not to drag along
 * floating-point errors. Formatting to a string is the UI's responsibility.
 */
export function formatPrice(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  const grouped = dollars.toLocaleString('en-US');
  return `$${grouped}.${String(remainder).padStart(2, '0')}`;
}
```

- [ ] **Step 18: Run the test and verify it passes**

Run: `npx jest src/utils --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 19: Configure husky and lint-staged**

```bash
npx husky init
```

`.husky/pre-commit`:

```sh
npx lint-staged
```

`.lintstagedrc.json`:

```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```

- [ ] **Step 20: Write the CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    name: Lint, typecheck, and tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage --ci
```

> No native build: it's slow, brittle, and doesn't add to what this project demonstrates. The decision is documented in the README (Task 16), not silently omitted.

- [ ] **Step 21: Run the full verification**

Run:

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all three green. `npm test` runs 5 tests. Coverage isn't enforced yet (there are no files in `features/` or `services/`); if `coverageThreshold` breaks, run `npm test` without `--coverage` until Task 3, and note it.

- [ ] **Step 22: Commit**

```bash
git add -A
git commit -m "chore: scaffold RN 0.87.1 with strict TS, alias, ESLint, Jest, and CI"
```

---

## Task 2: API contract and storage service

**Files:**

- Create: `src/services/api/types.ts`
- Create: `src/services/api/config.ts`
- Create: `src/services/storage/types.ts`
- Create: `src/services/storage/keys.ts`
- Create: `src/services/storage/asyncStorage.ts`
- Create: `src/services/storage/memoryStorage.ts`
- Create: `src/services/storage/index.ts`
- Test: `src/services/storage/__tests__/memoryStorage.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:

  - `CATEGORIES`, `Category`, `SortOption`, `Product`, `ProductsPage`, `ProductsQueryArgs`, `User`, `LoginRequest`, `LoginResponse` from `@/services/api/types`.
  - `API_BASE_URL: string` from `@/services/api/config`.
  - `interface Storage { getItem(key): Promise<string | null>; setItem(key, value): Promise<void>; removeItem(key): Promise<void> }`.
  - `storage: Storage` (default implementation, AsyncStorage) and `createMemoryStorage(): Storage` from `@/services/storage`.
  - `STORAGE_KEYS.accessToken`, `STORAGE_KEYS.user`, `STORAGE_KEYS.favorites`.

- [ ] **Step 1: Install AsyncStorage**

```bash
npm install @react-native-async-storage/async-storage
cd ios && pod install && cd ..
```

- [ ] **Step 2: Write the API contract**

`src/services/api/types.ts`:

```ts
export const CATEGORIES = [
  'audio',
  'wearables',
  'computers',
  'gaming',
  'home',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SortOption = 'name' | 'price_asc' | 'price_desc';

export interface Product {
  id: string;
  name: string;
  description: string;
  /** In cents, integer. See src/utils/formatPrice.ts. */
  priceCents: number;
  category: Category;
  rating: number;
  stock: number;
  imageUrl: string;
}

export interface ProductsPage {
  items: Product[];
  /** `null` when there are no more pages. */
  nextCursor: string | null;
  total: number;
}

/** Cache arguments for the products infiniteQuery. */
export interface ProductsQueryArgs {
  q: string;
  category: Category | 'all';
  sort: SortOption;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ApiErrorBody {
  message: string;
}
```

- [ ] **Step 3: Write the API config**

`src/services/api/config.ts`:

```ts
/**
 * Fictitious host: there's no real server behind it. MSW intercepts at the
 * network level both in dev and in tests, so the app makes real HTTP calls
 * against this URL and doesn't know it's mocked. The day a backend exists,
 * only this line changes.
 */
export const API_BASE_URL = 'http://localhost:3000/api';

export const PAGE_SIZE = 10;
```

- [ ] **Step 4: Write the storage interface and the keys**

`src/services/storage/types.ts`:

```ts
/**
 * Minimal facade over persistent storage. It exists so that replacing
 * AsyncStorage with react-native-keychain is a single-file change (ADR-003),
 * and so a memory implementation can be injected in tests.
 */
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

`src/services/storage/keys.ts`:

```ts
export const STORAGE_KEYS = {
  accessToken: '@catalog/accessToken',
  user: '@catalog/user',
  favorites: '@catalog/favorites',
} as const;
```

- [ ] **Step 5: Write the failing in-memory storage test**

`src/services/storage/__tests__/memoryStorage.test.ts`:

```ts
import {createMemoryStorage} from '../memoryStorage';

describe('createMemoryStorage', () => {
  it('returns null for a key that does not exist', async () => {
    const storage = createMemoryStorage();
    await expect(storage.getItem('missing')).resolves.toBeNull();
  });

  it('saves and reads a value', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await expect(storage.getItem('token')).resolves.toBe('abc');
  });

  it('overwrites an existing value', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.setItem('token', 'def');
    await expect(storage.getItem('token')).resolves.toBe('def');
  });

  it('deletes a value', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.removeItem('token');
    await expect(storage.getItem('token')).resolves.toBeNull();
  });

  it('isolates distinct instances', async () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage();
    await a.setItem('token', 'abc');
    await expect(b.getItem('token')).resolves.toBeNull();
  });
});
```

- [ ] **Step 6: Run the test and verify it fails**

Run: `npx jest src/services/storage --no-coverage`
Expected: FAIL — `Cannot find module '../memoryStorage'`.

- [ ] **Step 7: Implement the two `Storage` implementations**

`src/services/storage/memoryStorage.ts`:

```ts
import type {Storage} from './types';

/** Implementation for tests: no module-level effects, isolated per instance. */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}
```

`src/services/storage/asyncStorage.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {Storage} from './types';

/**
 * ADR-003: in production this should be react-native-keychain (Keychain on
 * iOS, EncryptedSharedPreferences on Android). AsyncStorage was chosen to
 * avoid adding native dependencies. The tradeoff is declared in the README;
 * the replacement affects only this file.
 */
export const asyncStorage: Storage = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};
```

`src/services/storage/index.ts`:

```ts
import {asyncStorage} from './asyncStorage';

import type {Storage} from './types';

export {createMemoryStorage} from './memoryStorage';
export {STORAGE_KEYS} from './keys';
export type {Storage} from './types';

export const storage: Storage = asyncStorage;
```

- [ ] **Step 8: Run the test and verify it passes**

Run: `npx jest src/services/storage --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 9: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: API contract and storage service behind an interface"
```

---

## Task 3: Mock database

**Files:**

- Create: `src/mocks/db.ts`
- Test: `src/mocks/__tests__/db.test.ts`

**Interfaces:**

- Consumes: `Category`, `Product`, `ProductsPage`, `SortOption` from `@/services/api/types`; `PAGE_SIZE` from `@/services/api/config`.
- Produces:

  - `PRODUCTS: Product[]` (50 deterministic products, 5 categories × 10).
  - `queryProducts(params: QueryProductsParams): ProductsPage`
  - `findProduct(id: string): Product | undefined`
  - `DEMO_USER: User`, `DEMO_PASSWORD: string`
  - `interface QueryProductsParams { q?: string; category?: Category | 'all'; sort?: SortOption; cursor?: string | null; limit?: number }`

- [ ] **Step 1: Write the failing dataset and search test**

`src/mocks/__tests__/db.test.ts`:

```ts
import {CATEGORIES} from '@/services/api/types';

import {findProduct, PRODUCTS, queryProducts} from '../db';

describe('PRODUCTS', () => {
  it('has 50 products', () => {
    expect(PRODUCTS).toHaveLength(50);
  });

  it('has unique ids', () => {
    const ids = new Set(PRODUCTS.map(p => p.id));
    expect(ids.size).toBe(PRODUCTS.length);
  });

  it('covers the 5 categories with 10 products each', () => {
    for (const category of CATEGORIES) {
      expect(PRODUCTS.filter(p => p.category === category)).toHaveLength(10);
    }
  });
});

describe('queryProducts', () => {
  it('returns the first page with the requested size', () => {
    const page = queryProducts({limit: 10});
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
    expect(page.nextCursor).not.toBeNull();
  });

  it('paginates by cursor without repeating items', () => {
    const first = queryProducts({limit: 10});
    const second = queryProducts({limit: 10, cursor: first.nextCursor});
    const firstIds = first.items.map(p => p.id);
    const secondIds = second.items.map(p => p.id);
    expect(secondIds).toHaveLength(10);
    expect(firstIds.some(id => secondIds.includes(id))).toBe(false);
  });

  it('returns a null nextCursor on the last page', () => {
    const page = queryProducts({limit: 50});
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toBeNull();
  });

  it('filters by category', () => {
    const page = queryProducts({category: 'audio', limit: 50});
    expect(page.total).toBe(10);
    expect(page.items.every(p => p.category === 'audio')).toBe(true);
  });

  it('searches by name case-insensitively', () => {
    const page = queryProducts({q: 'nimbus', limit: 50});
    expect(page.total).toBeGreaterThan(0);
    expect(
      page.items.every(
        p => /nimbus/i.test(p.name) || /nimbus/i.test(p.description),
      ),
    ).toBe(true);
  });

  it('returns an empty page when there are no matches', () => {
    const page = queryProducts({q: 'zzzznomatch', limit: 50});
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.nextCursor).toBeNull();
  });

  it('sorts by ascending price', () => {
    const {items} = queryProducts({sort: 'price_asc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('sorts by descending price', () => {
    const {items} = queryProducts({sort: 'price_desc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it('sorts by name alphabetically by default', () => {
    const {items} = queryProducts({limit: 50});
    const names = items.map(p => p.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
  });

  it('combines search, filter, and sort', () => {
    const page = queryProducts({
      q: 'a',
      category: 'gaming',
      sort: 'price_desc',
      limit: 50,
    });
    expect(page.items.every(p => p.category === 'gaming')).toBe(true);
    const prices = page.items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });
});

describe('findProduct', () => {
  it('finds a product by id', () => {
    const first = PRODUCTS[0];
    expect(first).toBeDefined();
    expect(findProduct(first!.id)).toEqual(first);
  });

  it('returns undefined for a nonexistent id', () => {
    expect(findProduct('does-not-exist')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/mocks --no-coverage`
Expected: FAIL — `Cannot find module '../db'`.

- [ ] **Step 3: Implement `db.ts`**

`src/mocks/db.ts`:

```ts
import {PAGE_SIZE} from '@/services/api/config';
import {CATEGORIES} from '@/services/api/types';
import type {
  Category,
  Product,
  ProductsPage,
  SortOption,
  User,
} from '@/services/api/types';

const BASE_NAMES: Record<Category, string> = {
  audio: 'Headphones',
  wearables: 'Smartwatch',
  computers: 'Laptop',
  gaming: 'Gamepad',
  home: 'Lamp',
};

const VARIANTS = [
  'Nimbus',
  'Orbit',
  'Vertex',
  'Lumen',
  'Atlas',
  'Nova',
  'Quartz',
  'Ember',
  'Solstice',
  'Zephyr',
] as const;

/**
 * Deterministic dataset: same data on every run and on every machine, so that
 * tests don't depend on a random seed and the demo is reproducible.
 */
export const PRODUCTS: Product[] = CATEGORIES.flatMap(
  (category, categoryIndex) =>
    VARIANTS.map((variant, variantIndex) => {
      const index = categoryIndex * VARIANTS.length + variantIndex;
      return {
        id: `p-${String(index + 1).padStart(3, '0')}`,
        name: `${BASE_NAMES[category]} ${variant}`,
        description: `${
          BASE_NAMES[category]
        } ${variant} from the ${category} line, ${
          2020 + (variantIndex % 6)
        } edition.`,
        priceCents: 1999 + index * 1500,
        category,
        rating: Number((3 + ((index * 7) % 21) / 10).toFixed(1)),
        stock: (index * 13) % 40,
        imageUrl: `https://picsum.photos/seed/${index + 1}/400/400`,
      };
    }),
);

export const DEMO_USER: User = {
  id: 'u-1',
  email: 'demo@catalog.dev',
  name: 'Demo User',
};

export const DEMO_PASSWORD = 'password123';

export interface QueryProductsParams {
  q?: string;
  category?: Category | 'all';
  sort?: SortOption;
  cursor?: string | null;
  limit?: number;
}

function compare(sort: SortOption): (a: Product, b: Product) => number {
  switch (sort) {
    case 'price_asc':
      return (a, b) => a.priceCents - b.priceCents;
    case 'price_desc':
      return (a, b) => b.priceCents - a.priceCents;
    case 'name':
      return (a, b) => a.name.localeCompare(b.name, 'en');
  }
}

/**
 * Cursor-based pagination (the id of the last item returned) instead of
 * offset-based: it's what a real backend does, and it avoids jumps when the
 * dataset changes between pages. If the cursor isn't found, it starts over
 * from the beginning.
 */
export function queryProducts(params: QueryProductsParams = {}): ProductsPage {
  const {
    q = '',
    category = 'all',
    sort = 'name',
    cursor = null,
    limit = PAGE_SIZE,
  } = params;

  const needle = q.trim().toLowerCase();
  const matching = PRODUCTS.filter(product => {
    const matchesCategory = category === 'all' || product.category === category;
    const matchesQuery =
      needle === '' ||
      product.name.toLowerCase().includes(needle) ||
      product.description.toLowerCase().includes(needle);
    return matchesCategory && matchesQuery;
  }).sort(compare(sort));

  const start =
    cursor === null
      ? 0
      : Math.max(matching.findIndex(p => p.id === cursor) + 1, 0);
  const items = matching.slice(start, start + limit);
  const last = items[items.length - 1];
  const hasMore = start + items.length < matching.length;

  return {
    items,
    nextCursor: hasMore && last ? last.id : null,
    total: matching.length,
  };
}

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find(product => product.id === id);
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx jest src/mocks --no-coverage`
Expected: PASS, 15 tests.

- [ ] **Step 5: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: mock database with search, filter, sort, and cursor pagination"
```

---

## Task 4: MSW handlers and startup in tests and in dev

**Files:**

- Create: `src/mocks/handlers/auth.ts`
- Create: `src/mocks/handlers/products.ts`
- Create: `src/mocks/handlers/index.ts`
- Create: `src/mocks/server.node.ts`
- Create: `src/mocks/server.native.ts`
- Create: `msw.polyfills.js`
- Modify: `src/test/setup.ts`
- Modify: `index.js`
- Test: `src/mocks/__tests__/handlers.test.ts`

**Interfaces:**

- Consumes: `queryProducts`, `findProduct`, `DEMO_USER`, `DEMO_PASSWORD` from `../db`; `API_BASE_URL`, `PAGE_SIZE` from `@/services/api/config`.
- Produces:

  - `handlers: RequestHandler[]` from `@/mocks/handlers`
  - `server` (msw/node) from `@/mocks/server.node`
  - `startMockServer(): Promise<void>` from `@/mocks/server.native`
  - Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/products`, `GET /api/products/:id`. `/products` query params: `q`, `category`, `sort`, `cursor`, `limit`, `fail`.
  - Token issued on login: `'demo-access-token'`.

- [ ] **Step 1: Install MSW and its RN polyfills**

```bash
npm install --save-dev msw@2.15
npm install react-native-url-polyfill fast-text-encoding
```

- [ ] **Step 2: Write the failing handlers test**

`src/mocks/__tests__/handlers.test.ts`:

```ts
import {API_BASE_URL} from '@/services/api/config';
import type {LoginResponse, Product, ProductsPage} from '@/services/api/types';

import {DEMO_PASSWORD, DEMO_USER} from '../db';

describe('auth handlers', () => {
  it('returns a token and user with valid credentials', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: DEMO_USER.email, password: DEMO_PASSWORD}),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as LoginResponse;
    expect(body.accessToken).toBe('demo-access-token');
    expect(body.user).toEqual(DEMO_USER);
  });

  it('returns 401 with invalid credentials', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: DEMO_USER.email, password: 'incorrecta'}),
    });
    expect(response.status).toBe(401);
  });

  it('GET /auth/me returns 401 without Authorization', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`);
    expect(response.status).toBe(401);
  });

  it('GET /auth/me returns the user with a valid token', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {Authorization: 'Bearer demo-access-token'},
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEMO_USER);
  });
});

describe('product handlers', () => {
  it('returns a page of products', async () => {
    const response = await fetch(`${API_BASE_URL}/products?limit=10`);
    expect(response.status).toBe(200);
    const page = (await response.json()) as ProductsPage;
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
  });

  it('respects the category filter', async () => {
    const response = await fetch(
      `${API_BASE_URL}/products?category=audio&limit=50`,
    );
    const page = (await response.json()) as ProductsPage;
    expect(page.total).toBe(10);
  });

  it('returns a product by id', async () => {
    const response = await fetch(`${API_BASE_URL}/products/p-001`);
    expect(response.status).toBe(200);
    const product = (await response.json()) as Product;
    expect(product.id).toBe('p-001');
  });

  it('returns 404 for a nonexistent product', async () => {
    const response = await fetch(`${API_BASE_URL}/products/no-existe`);
    expect(response.status).toBe(404);
  });

  it('injects a 500 with ?fail=1', async () => {
    const response = await fetch(`${API_BASE_URL}/products?fail=1`);
    expect(response.status).toBe(500);
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npx jest src/mocks/__tests__/handlers --no-coverage`
Expected: FAIL — the `fetch` isn't intercepted (connection error to `localhost:3000`) or `Cannot find module`.

- [ ] **Step 4: Write the auth handlers**

`src/mocks/handlers/auth.ts`:

```ts
import {delay, http, HttpResponse} from 'msw';

import {API_BASE_URL} from '@/services/api/config';
import type {
  ApiErrorBody,
  LoginRequest,
  LoginResponse,
  User,
} from '@/services/api/types';

import {DEMO_PASSWORD, DEMO_USER} from '../db';

export const ACCESS_TOKEN = 'demo-access-token';

/**
 * Artificial latency only outside of tests: in the demo it makes skeletons
 * and loading states visible; in Jest it would only make tests slower.
 */
const withLatency = process.env.NODE_ENV !== 'test';

async function maybeDelay(): Promise<void> {
  if (withLatency) {
    await delay(300 + Math.floor(Math.random() * 300));
  }
}

export const authHandlers = [
  http.post<never, LoginRequest>(
    `${API_BASE_URL}/auth/login`,
    async ({request}) => {
      const {email, password} = await request.json();
      await maybeDelay();

      if (
        email.trim().toLowerCase() !== DEMO_USER.email ||
        password !== DEMO_PASSWORD
      ) {
        return HttpResponse.json<ApiErrorBody>(
          {message: 'Invalid credentials'},
          {status: 401},
        );
      }

      return HttpResponse.json<LoginResponse>({
        accessToken: ACCESS_TOKEN,
        user: DEMO_USER,
      });
    },
  ),

  http.get(`${API_BASE_URL}/auth/me`, async ({request}) => {
    await maybeDelay();

    if (request.headers.get('Authorization') !== `Bearer ${ACCESS_TOKEN}`) {
      return HttpResponse.json<ApiErrorBody>(
        {message: 'Unauthorized'},
        {status: 401},
      );
    }

    return HttpResponse.json<User>(DEMO_USER);
  }),
];
```

- [ ] **Step 5: Write the product handlers**

`src/mocks/handlers/products.ts`:

```ts
import {delay, http, HttpResponse} from 'msw';

import {API_BASE_URL, PAGE_SIZE} from '@/services/api/config';
import {CATEGORIES} from '@/services/api/types';
import type {
  ApiErrorBody,
  Category,
  Product,
  ProductsPage,
  SortOption,
} from '@/services/api/types';

import {findProduct, queryProducts} from '../db';

const withLatency = process.env.NODE_ENV !== 'test';

async function maybeDelay(): Promise<void> {
  if (withLatency) {
    await delay(300 + Math.floor(Math.random() * 300));
  }
}

const SORT_OPTIONS: SortOption[] = ['name', 'price_asc', 'price_desc'];

function parseCategory(value: string | null): Category | 'all' {
  const found = CATEGORIES.find(category => category === value);
  return found ?? 'all';
}

function parseSort(value: string | null): SortOption {
  return SORT_OPTIONS.find(option => option === value) ?? 'name';
}

export const productHandlers = [
  http.get(`${API_BASE_URL}/products`, async ({request}) => {
    const url = new URL(request.url);
    await maybeDelay();

    // Failure injection to demonstrate error handling live.
    if (url.searchParams.get('fail') === '1') {
      return HttpResponse.json<ApiErrorBody>(
        {message: 'Injected failure'},
        {status: 500},
      );
    }

    const limitParam = Number(url.searchParams.get('limit'));
    const page = queryProducts({
      q: url.searchParams.get('q') ?? '',
      category: parseCategory(url.searchParams.get('category')),
      sort: parseSort(url.searchParams.get('sort')),
      cursor: url.searchParams.get('cursor'),
      limit:
        Number.isFinite(limitParam) && limitParam > 0 ? limitParam : PAGE_SIZE,
    });

    return HttpResponse.json<ProductsPage>(page);
  }),

  http.get<{id: string}>(`${API_BASE_URL}/products/:id`, async ({params}) => {
    await maybeDelay();
    const product = findProduct(params.id);

    if (!product) {
      return HttpResponse.json<ApiErrorBody>(
        {message: 'Product not found'},
        {status: 404},
      );
    }

    return HttpResponse.json<Product>(product);
  }),
];
```

- [ ] **Step 6: Write the handlers barrel**

`src/mocks/handlers/index.ts`:

```ts
import {authHandlers} from './auth';
import {productHandlers} from './products';

/**
 * Single source of truth for the API contract: the same handlers feed the
 * app in development (msw/native) and the tests (msw/node).
 */
export const handlers = [...authHandlers, ...productHandlers];

export {ACCESS_TOKEN} from './auth';
```

- [ ] **Step 7: Write the two server startups**

`src/mocks/server.node.ts`:

```ts
import {setupServer} from 'msw/node';

import {handlers} from './handlers';

export const server = setupServer(...handlers);
```

`src/mocks/server.native.ts`:

```ts
import {setupServer} from 'msw/native';

import {handlers} from './handlers';

export const server = setupServer(...handlers);

export async function startMockServer(): Promise<void> {
  // 'bypass': remote images are requested by the native Image module, not
  // JS's fetch, but any unhandled request must not break the demo.
  server.listen({onUnhandledRequest: 'bypass'});
}
```

- [ ] **Step 8: Wire MSW into the tests**

`src/test/setup.ts`:

```ts
import {server} from '@/mocks/server.node';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock'),
);

// 'error' forces every request in a test to be explicitly mocked: a new
// endpoint without a handler fails instead of hanging.
beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

> `react-native-safe-area-context` isn't installed yet (it arrives in Task 6). Until then, leave that `jest.mock` commented out and uncomment it in Task 6. If running this task breaks the mock, commenting it out is the right move, not deleting the file.

- [ ] **Step 9: Run the handlers test and verify it passes**

Run: `npx jest src/mocks/__tests__/handlers --no-coverage`
Expected: PASS, 9 tests.

**If it fails with `msw` module resolution errors:** `jest.config.js`'s `transformIgnorePatterns` (Task 1, Step 12) must include the package named in the error. Add it to the list and run again.

- [ ] **Step 10: Write the RN polyfills**

`msw.polyfills.js` (at the root):

```js
import 'fast-text-encoding';
import 'react-native-url-polyfill/auto';
```

- [ ] **Step 11: Start MSW in the app in dev**

`index.js`:

```js
import {AppRegistry} from 'react-native';

import {name as appName} from './app.json';
import App from './src/app/App';

async function enableMocking() {
  if (!__DEV__) {
    return;
  }
  await import('./msw.polyfills');
  const {startMockServer} = await import('./src/mocks/server.native');
  await startMockServer();
}

enableMocking().finally(() => {
  AppRegistry.registerComponent(appName, () => App);
});
```

> `src/app/App.tsx` doesn't exist yet: it's created in Task 5. Until then, leave `index.js` pointing at the template's `App.tsx` and change the import in Task 5.

- [ ] **Step 12: Verify interception on the device — ADR-005 decision point**

Temporarily add to the template's `App.tsx`, inside a `useEffect`:

```tsx
useEffect(() => {
  fetch('http://localhost:3000/api/products?limit=1')
    .then(r => r.json())
    .then(d => console.warn('MSW OK', d))
    .catch(e => console.warn('MSW FAILED', e));
}, []);
```

Run: `npm run ios`
Expected: `MSW OK` appears in the Metro console with a product.

**If `MSW FAILED` appears** (MSW's documentation marks the React Native integration as "potentially incomplete"): apply the fallback and note it in the README's ADR-005 —

1. MSW **stays as-is for the tests** (`msw/node` works fine under Jest). The value of "a single source of truth for the contract" is preserved.
2. For dev, replace `startMockServer` with a `fetch` shim that routes against the same `db.ts`, installed as an entrypoint side effect (outside `src/features` and `src/services`, so the app's code still contains no mocking branch):

```ts
// src/mocks/server.native.ts — fallback variant
import {API_BASE_URL} from '@/services/api/config';

import {handlers} from './handlers';

export async function startMockServer(): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (!url.startsWith(API_BASE_URL)) {
      return original(input, init);
    }
    const request = new Request(url, init);
    for (const handler of handlers) {
      const result = await handler.run({
        request,
        requestId: String(Date.now()),
      });
      if (result?.response) {
        return result.response;
      }
    }
    return original(input, init);
  };
}
```

Delete the temporary `useEffect` before committing, whichever of the two paths is taken.

- [ ] **Step 13: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: MSW handlers shared between the app in dev and the tests"
```

---

## Task 5: Store, baseApi, and typed hooks

**Files:**

- Create: `src/services/api/sessionEvents.ts`
- Create: `src/services/api/baseApi.ts`
- Create: `src/app/listenerMiddleware.ts`
- Create: `src/app/store.ts`
- Create: `src/app/hooks.ts`
- Create: `src/app/App.tsx`
- Create: `src/test/renderWithProviders.tsx`
- Modify: `index.js` (point at `src/app/App`)
- Test: `src/services/api/__tests__/baseApi.test.ts`

**Interfaces:**

- Consumes: `API_BASE_URL` from `@/services/api/config`; `handlers` from `@/mocks/handlers`.
- Produces:

  - `unauthorized` (payload-less action creator) from `@/services/api/sessionEvents`
  - `baseApi` (with `injectEndpoints`, `tagTypes: ['Product', 'User']`, `reducerPath: 'api'`) from `@/services/api/baseApi`
  - `listenerMiddleware`, `startAppListening` from `@/app/listenerMiddleware`
  - `makeStore(preloadedState?: Partial<RootState>): AppStore`, `store`, `RootState`, `AppDispatch`, `AppStore` from `@/app/store`
  - `useAppDispatch()`, `useAppSelector` from `@/app/hooks`
  - `renderWithProviders(ui, {preloadedState?, store?})` → `{store, ...RenderResult}` from `@/test/renderWithProviders`

- [ ] **Step 1: Install Redux**

```bash
npm install @reduxjs/toolkit react-redux
```

- [ ] **Step 2: Write the neutral session event**

`src/services/api/sessionEvents.ts`:

```ts
import {createAction} from '@reduxjs/toolkit';

/**
 * The services layer can't import from features (dependency rule from spec
 * §3.1), but it needs to signal that the session expired upon receiving a
 * 401. This neutral action creator inverts the dependency: services
 * dispatches it, sessionSlice listens for it.
 */
export const unauthorized = createAction('session/unauthorized');
```

- [ ] **Step 3: Write the `baseApi`**

`src/services/api/baseApi.ts`:

```ts
import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import {API_BASE_URL} from './config';
import {unauthorized} from './sessionEvents';

/**
 * Only the slice of state that's needed is typed instead of importing
 * RootState: store.ts imports baseApi, so importing RootState here would be
 * a cycle.
 */
interface StateWithSession {
  session: {accessToken: string | null};
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, {getState}) => {
    const token = (getState() as StateWithSession).session.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(unauthorized());
  }
  return result;
};

/**
 * A single API for the whole app. Each feature adds its endpoints with
 * `baseApi.injectEndpoints`, so the cache and the tags are shared without the
 * features knowing about each other.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Product', 'User'],
  endpoints: () => ({}),
});
```

- [ ] **Step 4: Write the typed listener middleware**

`src/app/listenerMiddleware.ts`:

```ts
import {createListenerMiddleware} from '@reduxjs/toolkit';

import type {AppDispatch, RootState} from './store';

export const listenerMiddleware = createListenerMiddleware();

/**
 * `withTypes` avoids repeating the generics in every listener. The
 * RootState/AppDispatch import is type-only, so it doesn't create a runtime
 * cycle.
 */
export const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

export type AppStartListening = typeof startAppListening;
```

- [ ] **Step 5: Write the store**

`src/app/store.ts`:

```ts
import {combineReducers, configureStore} from '@reduxjs/toolkit';

import {baseApi} from '@/services/api/baseApi';

import {listenerMiddleware} from './listenerMiddleware';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware()
        .prepend(listenerMiddleware.middleware)
        .concat(baseApi.middleware),
  });
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
```

> Slices get added to `rootReducer` in the following tasks: `auth` (Task 7), `catalog` (Task 10), `favorites` (Task 13).

- [ ] **Step 6: Write the typed hooks**

`src/app/hooks.ts`:

```ts
import {useDispatch, useSelector} from 'react-redux';

import type {AppDispatch, RootState} from './store';

/** Raw `useDispatch`/`useSelector` are never used in the app: always these. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

- [ ] **Step 7: Write the composition `App.tsx`**

`src/app/App.tsx`:

```tsx
import React from 'react';
import {Provider} from 'react-redux';

import {store} from './store';

export default function App() {
  return <Provider store={store}>{null}</Provider>;
}
```

> The navigation tree arrives in Task 9. This file is the provider composition point and grows there.

- [ ] **Step 8: Point `index.js` at `src/app/App`**

In `index.js`, change the root component import to `import App from './src/app/App';` and delete the template's `App.tsx` at the root if it exists.

- [ ] **Step 9: Write the test helper**

`src/test/renderWithProviders.tsx`:

```tsx
import {render} from '@testing-library/react-native';
import React from 'react';
import type {PropsWithChildren, ReactElement} from 'react';
import {Provider} from 'react-redux';

import {makeStore} from '@/app/store';
import type {AppStore, RootState} from '@/app/store';

interface ExtendedRenderOptions {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

/**
 * A fresh store per test: the RTK Query cache is global state, and sharing
 * it across tests makes them dependent on execution order.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = makeStore(preloadedState),
  }: ExtendedRenderOptions = {},
) {
  function Wrapper({children}: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {store, ...render(ui, {wrapper: Wrapper})};
}
```

> The `NavigationContainer` is added to this wrapper in Task 9, once it exists.

- [ ] **Step 10: Write the store test**

`src/services/api/__tests__/baseApi.test.ts`:

```ts
import {makeStore} from '@/app/store';

import {baseApi} from '../baseApi';

describe('store', () => {
  it('mounts the API reducer under the `api` key', () => {
    const store = makeStore();
    expect(store.getState()).toHaveProperty(baseApi.reducerPath);
  });

  it('creates independent stores', () => {
    expect(makeStore()).not.toBe(makeStore());
  });
});
```

> The cases that exercise the `Authorization` header and the 401 need the
> `session` slice, which arrives in Task 7. They're added there (Task 7, Step
> 10), not here.

- [ ] **Step 11: Run the test and verify it passes**

Run: `npx jest src/services/api --no-coverage`
Expected: PASS, 2 tests.

- [ ] **Step 12: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: Redux store, baseApi with auth and 401 handling, and typed hooks"
```

---

## Task 6: Theme tokens and UI components

**Files:**

- Create: `src/theme/tokens.ts`
- Create: `src/components/ui/Screen.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/TextField.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/ErrorView.tsx`
- Create: `src/components/ui/Skeleton.tsx`
- Create: `src/components/ui/index.ts`
- Modify: `src/test/setup.ts` (uncomment the safe-area-context mock)
- Test: `src/components/ui/__tests__/Button.test.tsx`

**Interfaces:**

- Consumes: nothing from previous tasks.
- Produces from `@/components/ui`:

  - `<Screen>{children}</Screen>` — `{children: ReactNode; scroll?: boolean}`
  - `<Button title label onPress disabled loading testID />` — `{label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'ghost'; testID?: string}`
  - `<TextField />` — `{label: string; value: string; onChangeText: (t: string) => void; error?: string; ...TextInputProps}`
  - `<EmptyState />` — `{title: string; message?: string}`
  - `<ErrorView />` — `{message: string; onRetry?: () => void}`
  - `<Skeleton />` — `{height: number; width?: number | string; style?: ViewStyle}`
  - `tokens` from `@/theme/tokens` with `colors`, `spacing`, `radius`, `typography`.

- [ ] **Step 1: Install the layout dependencies**

```bash
npm install react-native-safe-area-context
cd ios && pod install && cd ..
```

- [ ] **Step 2: Uncomment the safe-area-context mock**

In `src/test/setup.ts`, enable the `jest.mock('react-native-safe-area-context', ...)` that was left commented out in Task 4, Step 8.

- [ ] **Step 3: Write the tokens**

`src/theme/tokens.ts`:

```ts
/**
 * Constants, not runtime theming. Dark mode is a declared non-goal of the
 * spec: adding it would mean a ThemeProvider and a hook, not changing this.
 */
export const colors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  border: '#E2E5EA',
  text: '#111418',
  textMuted: '#6B7280',
  primary: '#2563EB',
  primaryText: '#FFFFFF',
  danger: '#DC2626',
  favorite: '#EF4444',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  full: 999,
} as const;

export const typography = {
  title: {fontSize: 24, fontWeight: '700'},
  heading: {fontSize: 18, fontWeight: '600'},
  body: {fontSize: 15, fontWeight: '400'},
  caption: {fontSize: 13, fontWeight: '400'},
} as const;

export const tokens = {colors, spacing, radius, typography};
```

- [ ] **Step 4: Write `Screen`**

`src/components/ui/Screen.tsx`:

```tsx
import React from 'react';
import type {ReactNode} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors, spacing} from '@/theme/tokens';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
}

export function Screen({children, scroll = false}: ScreenProps) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Container
        style={styles.content}
        contentContainerStyle={scroll ? styles.scroll : undefined}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {flex: 1},
  scroll: {padding: spacing.md},
});
```

- [ ] **Step 5: Write the failing `Button` test**

`src/components/ui/__tests__/Button.test.tsx`:

```tsx
import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {Button} from '../Button';

describe('Button', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Sign in" onPress={onPress} />);
    fireEvent.press(screen.getByText('Sign in'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Sign in" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Sign in'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows an indicator and hides the label while loading', () => {
    render(
      <Button label="Sign in" onPress={jest.fn()} loading testID="submit" />,
    );
    expect(screen.queryByText('Sign in')).toBeNull();
    expect(screen.getByTestId('submit')).toBeDisabled();
  });
});
```

- [ ] **Step 6: Run the test and verify it fails**

Run: `npx jest src/components --no-coverage`
Expected: FAIL — `Cannot find module '../Button'`.

- [ ] **Step 7: Write `Button`**

`src/components/ui/Button.tsx`:

```tsx
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text} from 'react-native';

import {colors, radius, spacing, typography} from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  testID?: string;
}

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{disabled: isDisabled, busy: loading}}
      disabled={isDisabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.ghost,
        (pressed || isDisabled) && styles.dimmed,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryText : colors.primary}
        />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primary: {backgroundColor: colors.primary},
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dimmed: {opacity: 0.6},
  label: {...typography.body, fontWeight: '600', color: colors.primaryText},
  ghostLabel: {color: colors.primary},
});
```

- [ ] **Step 8: Run the test and verify it passes**

Run: `npx jest src/components --no-coverage`
Expected: PASS, 3 tests.

- [ ] **Step 9: Write `TextField`**

`src/components/ui/TextField.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import type {TextInputProps} from 'react-native';

import {colors, radius, spacing, typography} from '@/theme/tokens';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  error,
  ...rest
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error != null && styles.inputError]}
      />
      {error != null && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: spacing.xs},
  label: {...typography.caption, color: colors.textMuted},
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  inputError: {borderColor: colors.danger},
  error: {...typography.caption, color: colors.danger},
});
```

- [ ] **Step 10: Write `EmptyState`, `ErrorView`, and `Skeleton`**

`src/components/ui/EmptyState.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, spacing, typography} from '@/theme/tokens';

interface EmptyStateProps {
  title: string;
  message?: string;
}

export function EmptyState({title, message}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message != null && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: spacing.xl, alignItems: 'center', gap: spacing.sm},
  title: {...typography.heading, color: colors.text},
  message: {...typography.body, color: colors.textMuted, textAlign: 'center'},
});
```

`src/components/ui/ErrorView.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, spacing, typography} from '@/theme/tokens';

import {Button} from './Button';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({message, onRetry}: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry != null && (
        <Button
          label="Retry"
          onPress={onRetry}
          variant="ghost"
          testID="retry"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: spacing.xl, alignItems: 'center', gap: spacing.md},
  message: {...typography.body, color: colors.danger, textAlign: 'center'},
});
```

`src/components/ui/Skeleton.tsx`:

```tsx
import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {DimensionValue, ViewStyle} from 'react-native';

import {colors, radius} from '@/theme/tokens';

interface SkeletonProps {
  height: number;
  width?: DimensionValue;
  style?: ViewStyle;
}

export function Skeleton({height, width = '100%', style}: SkeletonProps) {
  return (
    <View
      accessibilityRole="progressbar"
      style={[styles.base, {height, width}, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {backgroundColor: colors.surface, borderRadius: radius.sm},
});
```

`src/components/ui/index.ts`:

```ts
export {Button} from './Button';
export {EmptyState} from './EmptyState';
export {ErrorView} from './ErrorView';
export {Screen} from './Screen';
export {Skeleton} from './Skeleton';
export {TextField} from './TextField';
```

- [ ] **Step 11: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: design tokens and shared UI components"
```

---

## Task 7: Session — slice, api, and persistence

**Files:**

- Create: `src/services/session/sessionApi.ts`
- Create: `src/services/session/sessionSlice.ts`
- Create: `src/services/session/sessionListeners.ts`
- Create: `src/services/session/useSession.ts`
- Create: `src/services/session/index.ts`
- Modify: `src/app/store.ts` (mount the `session` reducer and register the listeners)
- Test: `src/services/session/__tests__/sessionSlice.test.ts`
- Test: `src/services/api/__tests__/baseApi.test.ts` (add the two cases deferred from Task 5)

**Interfaces:**

- Consumes: `baseApi` and `unauthorized` from `@/services/api/*`; `storage`, `STORAGE_KEYS`, `Storage` from `@/services/storage`; `LoginRequest`, `LoginResponse`, `User` from `@/services/api/types`; `AppStartListening` from `@/app/listenerMiddleware`.
- Produces:
  - `sessionApi` with `useLoginMutation()` and `useMeQuery()`; `sessionApi.endpoints.login.matchFulfilled`
  - `sessionReducer` (the slice's default export), `signedOut`, `sessionRestored`, `sessionMissing` actions
  - `restoreSession(deps?: {storage?: Storage})` — a thunk that hydrates the session from storage
  - `signOut()` — a thunk that clears the slice, storage, and the RTK Query cache
  - `SessionState = {status: 'bootstrapping' | 'signedOut' | 'signedIn'; accessToken: string | null; user: User | null}`
  - `registerSessionListeners(startAppListening: AppStartListening): void`
  - `useSession()` → `{status, user, signIn, signOut, isSigningIn, error}`

> **Why the session lives in `services/` and not in `features/auth/`:** session
> state is consumed by `navigation` (to decide Auth vs. App), the `profile`
> feature (user data and logout), and the API layer (the 401). If it lived
> inside the `auth` feature, those consumers would have to import from
> another feature, which is exactly what the dependency rule forbids. The
> `auth` feature keeps what's genuinely its own: the login screen (Task 8).
> It's spec §3.1's rule doing its job — it forces an explicit decision about
> what belongs to a feature and what's cross-cutting.

- [ ] **Step 1: Write the failing slice test**

`src/services/session/__tests__/sessionSlice.test.ts`:

```ts
import {unauthorized} from '@/services/api/sessionEvents';
import {createMemoryStorage, STORAGE_KEYS} from '@/services/storage';
import type {User} from '@/services/api/types';

import {sessionApi} from '../sessionApi';
import sessionReducer, {
  restoreSession,
  sessionMissing,
  sessionRestored,
  signedOut,
} from '../sessionSlice';
import type {SessionState} from '../sessionSlice';

const USER: User = {id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'};

const initial: SessionState = {
  status: 'bootstrapping',
  accessToken: null,
  user: null,
};

describe('sessionSlice', () => {
  it('starts in bootstrapping', () => {
    expect(sessionReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('moves to signedIn when restoring a session', () => {
    const state = sessionReducer(
      initial,
      sessionRestored({accessToken: 'tok', user: USER}),
    );
    expect(state).toEqual({status: 'signedIn', accessToken: 'tok', user: USER});
  });

  it('moves to signedOut when there is no saved session', () => {
    expect(sessionReducer(initial, sessionMissing()).status).toBe('signedOut');
  });

  it('moves to signedIn when the login resolves', () => {
    // `matchFulfilled` is a predicate, not an action creator: its
    // `toString()` returns the function's code, not the type. The literal
    // type that RTK Query emits for a mutation under `reducerPath: 'api'`
    // is used instead.
    const action = {
      type: 'api/executeMutation/fulfilled',
      payload: {accessToken: 'tok', user: USER},
      meta: {
        arg: {endpointName: 'login'},
        requestId: 'r1',
        requestStatus: 'fulfilled',
      },
    };
    const state = sessionReducer(initial, action);
    expect(state.status).toBe('signedIn');
    expect(state.accessToken).toBe('tok');
  });

  it('clears the token and user on signedOut', () => {
    const signedIn: SessionState = {
      status: 'signedIn',
      accessToken: 'tok',
      user: USER,
    };
    expect(sessionReducer(signedIn, signedOut())).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });

  it('clears the session when the API responds 401', () => {
    const signedIn: SessionState = {
      status: 'signedIn',
      accessToken: 'tok',
      user: USER,
    };
    expect(sessionReducer(signedIn, unauthorized())).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });
});

describe('restoreSession', () => {
  it('restores the saved session', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.accessToken, 'tok');
    await storage.setItem(STORAGE_KEYS.user, JSON.stringify(USER));

    const dispatched: string[] = [];
    const thunk = restoreSession({storage});
    await thunk(
      action => {
        dispatched.push(
          typeof action === 'object' && action !== null && 'type' in action
            ? String(action.type)
            : '',
        );
        return action;
      },
      () => ({}),
      undefined,
    );

    expect(dispatched).toContain(sessionRestored.type);
  });

  it('marks the session as missing when there is no token', async () => {
    const storage = createMemoryStorage();
    const dispatched: string[] = [];
    const thunk = restoreSession({storage});
    await thunk(
      action => {
        dispatched.push(
          typeof action === 'object' && action !== null && 'type' in action
            ? String(action.type)
            : '',
        );
        return action;
      },
      () => ({}),
      undefined,
    );

    expect(dispatched).toContain(sessionMissing.type);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/services/session --no-coverage`
Expected: FAIL — `Cannot find module '../sessionApi'`.

- [ ] **Step 3: Write `sessionApi`**

`src/services/session/sessionApi.ts`:

```ts
import {baseApi} from '@/services/api/baseApi';
import type {LoginRequest, LoginResponse, User} from '@/services/api/types';

export const sessionApi = baseApi.injectEndpoints({
  endpoints: build => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: body => ({url: '/auth/login', method: 'POST', body}),
    }),
    me: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
  }),
});

export const {useLoginMutation, useMeQuery} = sessionApi;
```

- [ ] **Step 4: Write `sessionSlice`**

`src/services/session/sessionSlice.ts`:

```ts
import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {baseApi} from '@/services/api/baseApi';
import {unauthorized} from '@/services/api/sessionEvents';
import type {User} from '@/services/api/types';
import {storage as defaultStorage, STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';

import {sessionApi} from './sessionApi';

export interface SessionState {
  status: 'bootstrapping' | 'signedOut' | 'signedIn';
  accessToken: string | null;
  user: User | null;
}

const initialState: SessionState = {
  status: 'bootstrapping',
  accessToken: null,
  user: null,
};

function clear(state: SessionState): void {
  state.status = 'signedOut';
  state.accessToken = null;
  state.user = null;
}

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionRestored(
      state,
      action: PayloadAction<{accessToken: string; user: User}>,
    ) {
      state.status = 'signedIn';
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    sessionMissing: clear,
    signedOut: clear,
  },
  extraReducers: builder => {
    // RTK requires every `addCase` to precede any `addMatcher`: reversing
    // the order throws at runtime while building the slice.
    builder
      .addCase(unauthorized, clear)
      // A successful login doesn't need its own action: the slice reacts to
      // the RTK Query mutation's result. A single source of truth.
      .addMatcher(
        sessionApi.endpoints.login.matchFulfilled,
        (state, action) => {
          state.status = 'signedIn';
          state.accessToken = action.payload.accessToken;
          state.user = action.payload.user;
        },
      );
  },
});

export const {sessionMissing, sessionRestored, signedOut} =
  sessionSlice.actions;
export default sessionSlice.reducer;

/**
 * Session bootstrap. `storage` is injected so it can be tested without
 * AsyncStorage. It's written as a hand-rolled thunk (not createAsyncThunk)
 * because there are no pending/rejected states worth caring about: either
 * there's a session or there isn't.
 */
export function restoreSession({
  storage = defaultStorage,
}: {storage?: Storage} = {}) {
  return async (dispatch: (action: unknown) => unknown): Promise<void> => {
    const [token, rawUser] = await Promise.all([
      storage.getItem(STORAGE_KEYS.accessToken),
      storage.getItem(STORAGE_KEYS.user),
    ]);

    if (token == null || rawUser == null) {
      dispatch(sessionMissing());
      return;
    }

    try {
      dispatch(
        sessionRestored({
          accessToken: token,
          user: JSON.parse(rawUser) as User,
        }),
      );
    } catch {
      dispatch(sessionMissing());
    }
  };
}

/** Logout: clears the slice, storage, and **the entire** RTK Query cache. */
export function signOut({storage = defaultStorage}: {storage?: Storage} = {}) {
  return async (dispatch: (action: unknown) => unknown): Promise<void> => {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.accessToken),
      storage.removeItem(STORAGE_KEYS.user),
    ]);
    dispatch(signedOut());
    dispatch(baseApi.util.resetApiState());
  };
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npx jest src/services/session --no-coverage`
Expected: PASS, 8 tests.

- [ ] **Step 6: Write the persistence listeners**

`src/services/session/sessionListeners.ts`:

```ts
import {unauthorized} from '@/services/api/sessionEvents';
import {storage, STORAGE_KEYS} from '@/services/storage';

import type {AppStartListening} from '@/app/listenerMiddleware';

import {sessionApi} from './sessionApi';
import {signedOut} from './sessionSlice';

/**
 * Persistence lives in a listener and not inside the reducer: reducers must
 * be pure and synchronous, and writing to AsyncStorage is neither.
 */
export function registerSessionListeners(
  startAppListening: AppStartListening,
): void {
  startAppListening({
    matcher: sessionApi.endpoints.login.matchFulfilled,
    effect: async action => {
      await Promise.all([
        storage.setItem(STORAGE_KEYS.accessToken, action.payload.accessToken),
        storage.setItem(STORAGE_KEYS.user, JSON.stringify(action.payload.user)),
      ]);
    },
  });

  startAppListening({
    matcher: action => signedOut.match(action) || unauthorized.match(action),
    effect: async () => {
      await Promise.all([
        storage.removeItem(STORAGE_KEYS.accessToken),
        storage.removeItem(STORAGE_KEYS.user),
      ]);
    },
  });
}
```

- [ ] **Step 7: Mount the reducer and the listeners on the store**

In `src/app/store.ts`, add `import {registerSessionListeners, sessionReducer} from '@/services/session';`, add `session: sessionReducer` to `rootReducer`, and at the end of the file:

```ts
registerSessionListeners(startAppListening);
```

importing `startAppListening` from `./listenerMiddleware`. Registration happens once at module level, not per store: `startAppListening` is tied to the middleware, which is shared.

- [ ] **Step 8: Write the `useSession` hook**

`src/services/session/useSession.ts`:

```ts
import {useCallback} from 'react';

import {useAppDispatch, useAppSelector} from '@/app/hooks';

import {useLoginMutation} from './sessionApi';
import {signOut as signOutThunk} from './sessionSlice';

export function useSession() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(state => state.session.status);
  const user = useAppSelector(state => state.session.user);
  const [login, {isLoading: isSigningIn, error}] = useLoginMutation();

  const signIn = useCallback(
    (email: string, password: string) => login({email, password}).unwrap(),
    [login],
  );

  const signOut = useCallback(() => {
    void dispatch(signOutThunk());
  }, [dispatch]);

  return {status, user, signIn, signOut, isSigningIn, error};
}
```

- [ ] **Step 9: Write the module barrel**

`src/services/session/index.ts`:

```ts
export {default as sessionReducer} from './sessionSlice';
export {
  restoreSession,
  sessionMissing,
  sessionRestored,
  signedOut,
  signOut,
} from './sessionSlice';
export type {SessionState} from './sessionSlice';
export {sessionApi, useLoginMutation, useMeQuery} from './sessionApi';
export {registerSessionListeners} from './sessionListeners';
export {useSession} from './useSession';
```

- [ ] **Step 10: Bring the two deferred cases into the baseApi test**

Add to `src/services/api/__tests__/baseApi.test.ts` the two cases Task 5 left pending, which now compile because the `session` slice exists:

```ts
import {ACCESS_TOKEN} from '@/mocks/handlers';

import {unauthorized} from '../sessionEvents';

const probeApi = baseApi.injectEndpoints({
  endpoints: build => ({
    probeMe: build.query<{id: string}, void>({query: () => '/auth/me'}),
  }),
  overrideExisting: true,
});

describe('baseApi', () => {
  it('injects the Authorization header from the store', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: ACCESS_TOKEN, user: null},
    });
    const result = await store.dispatch(probeApi.endpoints.probeMe.initiate());
    expect(result.data).toBeDefined();
  });

  it('clears the session when the response is 401', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: 'invalid-token', user: null},
    });
    await store.dispatch(probeApi.endpoints.probeMe.initiate());
    // `unauthorized` is dispatched by the baseQuery wrapper; the slice listens for it.
    expect(store.getState().session.status).toBe('signedOut');
    expect(unauthorized.type).toBe('session/unauthorized');
  });
});
```

- [ ] **Step 11: Run the tests and verify they pass**

Run: `npx jest src/services/session src/services/api --no-coverage`
Expected: PASS, 12 tests.

- [ ] **Step 12: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: session with slice, RTK Query, and listener-based persistence"
```

---

## Task 8: LoginScreen

**Files:**

- Create: `src/features/auth/screens/LoginScreen.tsx`
- Test: `src/features/auth/__tests__/LoginScreen.test.tsx`

**Interfaces:**

- Consumes: `useSession` from `@/services/session`; `Button`, `Screen`, `TextField` from `@/components/ui`; `DEMO_PASSWORD`, `DEMO_USER` from `@/mocks/db` (only under `__DEV__`).
- Produces: `<LoginScreen />` — no props. testIDs: `login-email`, `login-password`, `login-submit`, `login-error`.

- [ ] **Step 1: Write the failing test**

`src/features/auth/__tests__/LoginScreen.test.tsx`:

```tsx
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import React from 'react';

import {server} from '@/mocks/server.node';
import {API_BASE_URL} from '@/services/api/config';
import {renderWithProviders} from '@/test/renderWithProviders';

import {LoginScreen} from '../screens/LoginScreen';

function fillAndSubmit(email: string, password: string) {
  fireEvent.changeText(screen.getByTestId('login-email'), email);
  fireEvent.changeText(screen.getByTestId('login-password'), password);
  fireEvent.press(screen.getByTestId('login-submit'));
}

describe('LoginScreen', () => {
  it('shows a format error when the email is invalid', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('no-es-un-email', 'password123');
    expect(await screen.findByText('Enter a valid email')).toBeVisible();
  });

  it('shows an error when the password is too short', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', '123');
    expect(
      await screen.findByText('Password must be at least 8 characters'),
    ).toBeVisible();
  });

  it('leaves the state at signedIn after a successful login', async () => {
    const {store} = renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    await waitFor(() =>
      expect(store.getState().session.status).toBe('signedIn'),
    );
    expect(store.getState().session.accessToken).toBe('demo-access-token');
  });

  it('shows an invalid credentials message on a 401', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'wrongpass1');
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Incorrect email or password',
    );
  });

  it('distinguishes the network error from the credentials error', async () => {
    server.use(
      http.post(`${API_BASE_URL}/auth/login`, () => HttpResponse.error()),
    );
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      "We couldn't connect. Check your connection and try again",
    );
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/features/auth/__tests__/LoginScreen --no-coverage`
Expected: FAIL — `Cannot find module '../screens/LoginScreen'`.

- [ ] **Step 3: Implement `LoginScreen`**

`src/features/auth/screens/LoginScreen.tsx`:

```tsx
import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Button, Screen, TextField} from '@/components/ui';
import {DEMO_PASSWORD, DEMO_USER} from '@/mocks/db';
import {colors, spacing, typography} from '@/theme/tokens';

import {useSession} from '@/services/session';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return errors;
}

/**
 * The network error and the credentials error are distinguished by the shape
 * of fetchBaseQuery's error: a 401 carries `status: 401`; a network failure
 * carries `status: 'FETCH_ERROR'`. Showing "invalid credentials" for a
 * network problem is one of the most common UX bugs in mobile apps.
 */
function messageFor(error: unknown): string | null {
  if (error == null || typeof error !== 'object' || !('status' in error)) {
    return null;
  }
  const {status} = error as {status: unknown};
  if (status === 401) {
    return 'Incorrect email or password';
  }
  return "We couldn't connect. Check your connection and try again";
}

export function LoginScreen() {
  const {signIn, isSigningIn, error} = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const onSubmit = useCallback(() => {
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    // Session state is updated by sessionSlice when the mutation resolves;
    // here we just ignore the rejection, which is already reflected in `error`.
    signIn(email.trim(), password).catch(() => {});
  }, [email, password, signIn]);

  const serverError = messageFor(error);

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text style={styles.title}>Catalog</Text>

        <TextField
          testID="login-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextField
          testID="login-password"
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          textContentType="password"
        />

        {serverError != null && (
          <Text testID="login-error" style={styles.serverError}>
            {serverError}
          </Text>
        )}

        <Button
          testID="login-submit"
          label="Sign in"
          onPress={onSubmit}
          loading={isSigningIn}
        />

        {__DEV__ && (
          <Text style={styles.hint}>
            Demo: {DEMO_USER.email} / {DEMO_PASSWORD}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {gap: spacing.md},
  title: {...typography.title, color: colors.text, marginBottom: spacing.sm},
  serverError: {...typography.body, color: colors.danger},
  hint: {...typography.caption, color: colors.textMuted, textAlign: 'center'},
});
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx jest src/features/auth/__tests__/LoginScreen --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 5: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: login screen with validation and distinct error states"
```

---

## Task 9: Navigation and session bootstrap

**Files:**

- Create: `src/navigation/types.ts`
- Create: `src/navigation/AuthNavigator.tsx`
- Create: `src/navigation/CatalogStack.tsx`
- Create: `src/navigation/AppTabs.tsx`
- Create: `src/navigation/RootNavigator.tsx`
- Create: `src/features/catalog/screens/ProductListScreen.tsx` (placeholder)
- Create: `src/features/catalog/screens/ProductDetailScreen.tsx` (placeholder)
- Create: `src/features/favorites/screens/FavoritesScreen.tsx` (placeholder)
- Create: `src/features/profile/screens/ProfileScreen.tsx` (placeholder)
- Modify: `src/app/App.tsx`
- Modify: `src/test/renderWithProviders.tsx` (wrap in `NavigationContainer`)
- Test: `src/navigation/__tests__/RootNavigator.test.tsx`

**Interfaces:**

- Consumes: `useAppDispatch`, `useAppSelector`; `restoreSession` from `@/services/session`; `LoginScreen`.
- Produces from `@/navigation/types`:
  - `AuthStackParamList = {Login: undefined}`
  - `CatalogStackParamList = {ProductList: undefined; ProductDetail: {productId: string}}`
  - `AppTabParamList = {CatalogTab: NavigatorScreenParams<CatalogStackParamList>; FavoritesTab: undefined; ProfileTab: undefined}`
  - `RootStackParamList = {Auth: NavigatorScreenParams<AuthStackParamList>; App: NavigatorScreenParams<AppTabParamList>}`
  - `ProductListScreenProps`, `ProductDetailScreenProps` (`NativeStackScreenProps<CatalogStackParamList, ...>`)
  - global declaration of `ReactNavigation.RootParamList`
- Produces: `<RootNavigator />` with no props.

- [ ] **Step 1: Install React Navigation**

```bash
npm install @react-navigation/native@7 @react-navigation/native-stack@7 @react-navigation/bottom-tabs@7 react-native-screens
cd ios && pod install && cd ..
```

- [ ] **Step 2: Write the navigation types**

`src/navigation/types.ts`:

```ts
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
};

export type CatalogStackParamList = {
  ProductList: undefined;
  ProductDetail: {productId: string};
};

export type AppTabParamList = {
  CatalogTab: NavigatorScreenParams<CatalogStackParamList>;
  FavoritesTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

export type ProductListScreenProps = NativeStackScreenProps<
  CatalogStackParamList,
  'ProductList'
>;
export type ProductDetailScreenProps = NativeStackScreenProps<
  CatalogStackParamList,
  'ProductDetail'
>;
export type FavoritesScreenProps = BottomTabScreenProps<
  AppTabParamList,
  'FavoritesTab'
>;

/**
 * Registering the root ParamList globally makes `navigation.navigate()` and
 * `useNavigation()` type-safe throughout the app without importing types in
 * every file. The cost is that there can only be one root ParamList per app.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

- [ ] **Step 3: Write the placeholder screens**

The four with the same shape; they get replaced in Tasks 12–15. Example for `src/features/catalog/screens/ProductListScreen.tsx`:

```tsx
import React from 'react';
import {Text} from 'react-native';

import {Screen} from '@/components/ui';

export function ProductListScreen() {
  return (
    <Screen>
      <Text>Catalog</Text>
    </Screen>
  );
}
```

Repeat with `ProductDetailScreen` (text `Details`), `FavoritesScreen` (text `Favorites`), and `ProfileScreen` (text `Profile`), each at the path listed in **Files**.

- [ ] **Step 4: Write the navigators**

`src/navigation/AuthNavigator.tsx`:

```tsx
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

import {LoginScreen} from '@/features/auth/screens/LoginScreen';

import type {AuthStackParamList} from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
```

`src/navigation/CatalogStack.tsx`:

```tsx
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

import {ProductDetailScreen} from '@/features/catalog/screens/ProductDetailScreen';
import {ProductListScreen} from '@/features/catalog/screens/ProductListScreen';

import type {CatalogStackParamList} from './types';

const Stack = createNativeStackNavigator<CatalogStackParamList>();

export function CatalogStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{title: 'Catalog'}}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{title: 'Details'}}
      />
    </Stack.Navigator>
  );
}
```

`src/navigation/AppTabs.tsx`:

```tsx
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React from 'react';

import {FavoritesScreen} from '@/features/favorites/screens/FavoritesScreen';
import {ProfileScreen} from '@/features/profile/screens/ProfileScreen';
import {colors} from '@/theme/tokens';

import {CatalogStack} from './CatalogStack';
import type {AppTabParamList} from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{tabBarActiveTintColor: colors.primary}}>
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{title: 'Catalog', headerShown: false}}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{title: 'Favorites'}}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Write the `RootNavigator` with bootstrap**

`src/navigation/RootNavigator.tsx`:

```tsx
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import {restoreSession} from '@/services/session';
import {colors} from '@/theme/tokens';

import {AppTabs} from './AppTabs';
import {AuthNavigator} from './AuthNavigator';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(state => state.session.status);

  useEffect(() => {
    void dispatch(restoreSession());
  }, [dispatch]);

  // Splash while storage is being read: mounting the navigator before
  // knowing whether there's a session would cause a flash of the login
  // screen on every launch.
  if (status === 'bootstrapping') {
    return (
      <View testID="splash" style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {status === 'signedIn' ? (
        <Stack.Screen name="App" component={AppTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
```

> The two screen groups are mutually exclusive by conditional instead of by `navigate`: this way there's no way to get back to login with the back gesture while logged in, and the auth stack unmounts entirely on entry.

- [ ] **Step 6: Compose `App.tsx`**

`src/app/App.tsx`:

```tsx
import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {StatusBar} from 'react-native';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {RootNavigator} from '@/navigation/RootNavigator';

import {store} from './store';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
```

- [ ] **Step 7: Wrap the test helper in `NavigationContainer`**

In `src/test/renderWithProviders.tsx`, change the `Wrapper` to:

```tsx
import {NavigationContainer} from '@react-navigation/native';
// ...
function Wrapper({children}: PropsWithChildren) {
  return (
    <Provider store={store}>
      <NavigationContainer>{children}</NavigationContainer>
    </Provider>
  );
}
```

- [ ] **Step 8: Write the `RootNavigator` test**

`src/navigation/__tests__/RootNavigator.test.tsx`:

```tsx
import {screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {STORAGE_KEYS, storage} from '@/services/storage';
import {renderWithProviders} from '@/test/renderWithProviders';

import {RootNavigator} from '../RootNavigator';

describe('RootNavigator', () => {
  afterEach(async () => {
    await storage.removeItem(STORAGE_KEYS.accessToken);
    await storage.removeItem(STORAGE_KEYS.user);
  });

  it('shows the splash screen before the bootstrap resolves', () => {
    renderWithProviders(<RootNavigator />);
    expect(screen.getByTestId('splash')).toBeVisible();
  });

  it('goes to login when there is no saved session', async () => {
    renderWithProviders(<RootNavigator />);
    expect(await screen.findByTestId('login-submit')).toBeVisible();
  });

  it('enters the app directly when there is a saved session', async () => {
    await storage.setItem(STORAGE_KEYS.accessToken, 'demo-access-token');
    await storage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'}),
    );

    renderWithProviders(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('Catalog')).toBeVisible());
  });
});
```

- [ ] **Step 9: Run the tests**

Run: `npx jest src/navigation --no-coverage`
Expected: PASS, 3 tests.

**If it fails with `react-native-screens` errors:** add to `src/test/setup.ts`:

```ts
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return {...actual, enableScreens: jest.fn()};
});
```

- [ ] **Step 10: Verify on the simulator**

Run: `npm run ios`
Expected: it launches into the splash screen, falls through to login, and after signing in with the demo credentials the tabs appear.

- [ ] **Step 11: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: typed navigation with session bootstrap and tabs"
```

---

## Task 10: Catalog feature — api, slice, and selectors

**Files:**

- Create: `src/features/catalog/catalogApi.ts`
- Create: `src/services/api/productsApi.ts`
- Create: `src/features/catalog/catalogSlice.ts`
- Create: `src/features/catalog/selectors.ts`
- Modify: `src/app/store.ts` (mount the `catalog` reducer)
- Test: `src/features/catalog/__tests__/catalogSlice.test.ts`
- Test: `src/features/catalog/__tests__/selectors.test.ts`
- Test: `src/features/catalog/__tests__/catalogApi.test.ts`
- Test: `src/services/api/__tests__/productsApi.test.ts`

**Interfaces:**

- Consumes: `baseApi`; `PAGE_SIZE`; `Product`, `ProductsPage`, `ProductsQueryArgs`, `Category`, `SortOption`; `RootState`.
- Produces:

  - `catalogApi` with `useGetProductsInfiniteQuery(args: ProductsQueryArgs)`
  - `productsApi` with `useGetProductQuery(id: string)` from `@/services/api/productsApi`
  - `catalogReducer` (default), actions `queryChanged(string)`, `categoryChanged(Category | 'all')`, `sortChanged(SortOption)`, `filtersReset()`
  - `CatalogState = {query: string; category: Category | 'all'; sort: SortOption}`
  - `selectProductsQueryArgs(state): ProductsQueryArgs` (memoized with `createSelector`)
  - `selectHasActiveFilters(state): boolean`

- [ ] **Step 1: Write the failing slice test**

`src/features/catalog/__tests__/catalogSlice.test.ts`:

```ts
import catalogReducer, {
  categoryChanged,
  filtersReset,
  queryChanged,
  sortChanged,
} from '../catalogSlice';
import type {CatalogState} from '../catalogSlice';

const initial: CatalogState = {query: '', category: 'all', sort: 'name'};

describe('catalogSlice', () => {
  it('has empty filters by default', () => {
    expect(catalogReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('updates the query', () => {
    expect(catalogReducer(initial, queryChanged('nimbus')).query).toBe(
      'nimbus',
    );
  });

  it('updates the category', () => {
    expect(catalogReducer(initial, categoryChanged('audio')).category).toBe(
      'audio',
    );
  });

  it('updates the sort', () => {
    expect(catalogReducer(initial, sortChanged('price_desc')).sort).toBe(
      'price_desc',
    );
  });

  it('resets all filters', () => {
    const dirty: CatalogState = {
      query: 'x',
      category: 'gaming',
      sort: 'price_asc',
    };
    expect(catalogReducer(dirty, filtersReset())).toEqual(initial);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx jest src/features/catalog --no-coverage`
Expected: FAIL — `Cannot find module '../catalogSlice'`.

- [ ] **Step 3: Implement the slice**

`src/features/catalog/catalogSlice.ts`:

```ts
import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import type {Category, SortOption} from '@/services/api/types';

/**
 * Client state only. Products are server state and live in the RTK Query
 * cache: duplicating them here would mean two sources of truth.
 */
export interface CatalogState {
  query: string;
  category: Category | 'all';
  sort: SortOption;
}

const initialState: CatalogState = {
  query: '',
  category: 'all',
  sort: 'name',
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    queryChanged(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    categoryChanged(state, action: PayloadAction<Category | 'all'>) {
      state.category = action.payload;
    },
    sortChanged(state, action: PayloadAction<SortOption>) {
      state.sort = action.payload;
    },
    filtersReset() {
      return initialState;
    },
  },
});

export const {categoryChanged, filtersReset, queryChanged, sortChanged} =
  catalogSlice.actions;
export default catalogSlice.reducer;
```

- [ ] **Step 4: Mount the reducer on the store**

In `src/app/store.ts`: `import catalogReducer from '@/features/catalog/catalogSlice';` and add `catalog: catalogReducer` to `rootReducer`.

- [ ] **Step 5: Run the slice test**

Run: `npx jest src/features/catalog/__tests__/catalogSlice --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 6: Write the failing selectors test**

`src/features/catalog/__tests__/selectors.test.ts`:

```ts
import {makeStore} from '@/app/store';

import {categoryChanged, queryChanged} from '../catalogSlice';
import {selectHasActiveFilters, selectProductsQueryArgs} from '../selectors';

describe('selectProductsQueryArgs', () => {
  it('returns the same reference if the relevant state has not changed', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    const second = selectProductsQueryArgs(store.getState());
    expect(second).toBe(first);
  });

  it('keeps returning the same reference after a dispatch that does not touch the catalog', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch({type: 'noise/irrelevant'});
    expect(selectProductsQueryArgs(store.getState())).toBe(first);
  });

  it('returns a new reference when a filter changes', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch(categoryChanged('audio'));
    const second = selectProductsQueryArgs(store.getState());
    expect(second).not.toBe(first);
    expect(second.category).toBe('audio');
  });
});

describe('selectHasActiveFilters', () => {
  it('is false with the default filters', () => {
    expect(selectHasActiveFilters(makeStore().getState())).toBe(false);
  });

  it('is true when there is a search', () => {
    const store = makeStore();
    store.dispatch(queryChanged('nimbus'));
    expect(selectHasActiveFilters(store.getState())).toBe(true);
  });
});
```

> The second case is the one that gives it value: without `createSelector`, an inline selector that builds `{q, category, sort}` would return a new object on **every** dispatch in the app and would re-render the list even when nothing about the catalog had changed.

- [ ] **Step 7: Run and verify it fails**

Run: `npx jest src/features/catalog/__tests__/selectors --no-coverage`
Expected: FAIL — `Cannot find module '../selectors'`.

- [ ] **Step 8: Implement the selectors**

`src/features/catalog/selectors.ts`:

```ts
import {createSelector} from '@reduxjs/toolkit';

import type {RootState} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

const selectCatalog = (state: RootState) => state.catalog;

/**
 * Level 2 of the memoization demo (spec §5): memoization outside of React.
 * This selector builds a new object; without createSelector the identity
 * would change on every call and `useGetProductsInfiniteQuery(args)` would
 * re-subscribe the hook on every render.
 */
export const selectProductsQueryArgs = createSelector(
  [selectCatalog],
  (catalog): ProductsQueryArgs => ({
    q: catalog.query,
    category: catalog.category,
    sort: catalog.sort,
  }),
);

export const selectHasActiveFilters = createSelector(
  [selectCatalog],
  catalog =>
    catalog.query.trim() !== '' ||
    catalog.category !== 'all' ||
    catalog.sort !== 'name',
);
```

- [ ] **Step 9: Run the selectors test**

Run: `npx jest src/features/catalog/__tests__/selectors --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 10: Write the failing infiniteQuery test**

`src/features/catalog/__tests__/catalogApi.test.ts`:

```ts
import {makeStore} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

import {catalogApi} from '../catalogApi';

const ARGS: ProductsQueryArgs = {q: '', category: 'all', sort: 'name'};

describe('catalogApi', () => {
  it('fetches the first page', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(ARGS),
    );
    expect(result.data?.pages).toHaveLength(1);
    expect(result.data?.pages[0]?.items).toHaveLength(10);
  });

  it('accumulates pages when requesting the next one', async () => {
    const store = makeStore();
    await store.dispatch(catalogApi.endpoints.getProducts.initiate(ARGS));
    const result = await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(ARGS, {direction: 'forward'}),
    );
    expect(result.data?.pages).toHaveLength(2);
    const ids =
      result.data?.pages.flatMap(page => page.items.map(item => item.id)) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('caches pages per filter combination', async () => {
    const store = makeStore();
    await store.dispatch(catalogApi.endpoints.getProducts.initiate(ARGS));
    await store.dispatch(
      catalogApi.endpoints.getProducts.initiate({...ARGS, category: 'audio'}),
    );
    const entries = Object.keys(store.getState().api.queries).filter(key =>
      key.startsWith('getProducts'),
    );
    expect(entries).toHaveLength(2);
  });
});
```

- [ ] **Step 11: Run and verify it fails**

Run: `npx jest src/features/catalog/__tests__/catalogApi --no-coverage`
Expected: FAIL — `Cannot find module '../catalogApi'`.

- [ ] **Step 12: Implement `catalogApi`**

`src/features/catalog/catalogApi.ts`:

```ts
import {PAGE_SIZE} from '@/services/api/config';
import {baseApi} from '@/services/api/baseApi';
import type {ProductsPage, ProductsQueryArgs} from '@/services/api/types';

/** The cursor is the id of the last product on the previous page; `null` = first. */
type PageParam = string | null;

export const catalogApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getProducts: build.infiniteQuery<
      ProductsPage,
      ProductsQueryArgs,
      PageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: null,
        // Returning `undefined` cuts off pagination: it's what turns off `hasNextPage`.
        getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
      },
      query: ({queryArg, pageParam}) => ({
        url: '/products',
        params: {
          q: queryArg.q,
          category: queryArg.category,
          sort: queryArg.sort,
          limit: PAGE_SIZE,
          ...(pageParam != null ? {cursor: pageParam} : {}),
        },
      }),
      providesTags: ['Product'],
    }),
  }),
});

export const {useGetProductsInfiniteQuery} = catalogApi;
```

- [ ] **Step 13: Run the api test**

Run: `npx jest src/features/catalog --no-coverage`
Expected: PASS, 13 tests.

- [ ] **Step 14: Write the failing `productsApi` test**

`src/services/api/__tests__/productsApi.test.ts`:

```ts
import {makeStore} from '@/app/store';

import {productsApi} from '../productsApi';

describe('productsApi', () => {
  it('fetches a product by id', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      productsApi.endpoints.getProduct.initiate('p-001'),
    );
    expect(result.data?.id).toBe('p-001');
    expect(result.data?.name).toBe('Headphones Nimbus');
  });

  it('exposes the error when the product does not exist', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      productsApi.endpoints.getProduct.initiate('does-not-exist'),
    );
    expect(result.error).toBeDefined();
  });
});
```

Run: `npx jest src/services/api/__tests__/productsApi --no-coverage`
Expected: FAIL — `Cannot find module '../productsApi'`.

- [ ] **Step 15: Implement `productsApi`**

`src/services/api/productsApi.ts`:

```ts
import {baseApi} from './baseApi';
import type {Product} from './types';

/**
 * `getProduct` is cross-cutting: it's consumed by the detail screen (the
 * `catalog` feature) and the favorites screen (the `favorites` feature). If
 * it lived inside `catalogApi`, favorites would have to import from another
 * feature, which is exactly what the dependency rule forbids. That's why the
 * endpoint is born in the shared API layer.
 */
export const productsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getProduct: build.query<Product, string>({
      query: id => `/products/${id}`,
      providesTags: (_result, _error, id) => [{type: 'Product', id}],
    }),
  }),
});

export const {useGetProductQuery} = productsApi;
```

Run: `npx jest src/services/api/__tests__/productsApi --no-coverage`
Expected: PASS, 2 tests.

- [ ] **Step 16: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: catalogApi with infiniteQuery, productsApi, filters slice, and selectors"
```

---

## Task 11: Debounce, SearchBar, and CategoryFilter

**Files:**

- Create: `src/features/catalog/hooks/useDebouncedValue.ts`
- Create: `src/features/catalog/components/SearchBar.tsx`
- Create: `src/features/catalog/components/CategoryFilter.tsx`
- Create: `src/features/catalog/components/SortControl.tsx`
- Test: `src/features/catalog/__tests__/useDebouncedValue.test.ts`
- Test: `src/features/catalog/__tests__/SearchBar.test.tsx`

**Interfaces:**

- Consumes: `queryChanged`, `categoryChanged`, `sortChanged`; `useAppDispatch`, `useAppSelector`; `CATEGORIES`.
- Produces:

  - `useDebouncedValue<T>(value: T, delayMs: number): T`
  - `<SearchBar />` — no props; testID `search-input`
  - `<CategoryFilter />` — no props; testID per category `category-<name>` and `category-all`
  - `<SortControl />` — no props; testID `sort-<option>`

- [ ] **Step 1: Write the failing hook test**

`src/features/catalog/__tests__/useDebouncedValue.test.ts`:

```ts
import {act, renderHook} from '@testing-library/react-native';

import {useDebouncedValue} from '../hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value immediately', () => {
    const {result} = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('does not update before the delay elapses', () => {
    const {rerender, result} = renderHook(
      ({value}) => useDebouncedValue(value, 300),
      {
        initialProps: {value: 'a'},
      },
    );
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
  });

  it('updates once the delay has elapsed', () => {
    const {rerender, result} = renderHook(
      ({value}) => useDebouncedValue(value, 300),
      {
        initialProps: {value: 'a'},
      },
    );
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('collapses several rapid changes into a single update', () => {
    const {rerender, result} = renderHook(
      ({value}) => useDebouncedValue(value, 300),
      {
        initialProps: {value: 'a'},
      },
    );
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({value: 'c'});
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({value: 'd'});
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('d');
  });

  it('clears the timer on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    const {unmount} = renderHook(() => useDebouncedValue('a', 300));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx jest src/features/catalog/__tests__/useDebouncedValue --no-coverage`
Expected: FAIL — `Cannot find module '../hooks/useDebouncedValue'`.

- [ ] **Step 3: Implement the hook**

`src/features/catalog/hooks/useDebouncedValue.ts`:

```ts
import {useEffect, useState} from 'react';

/**
 * Delays propagating `value` until it stays still for `delayMs`.
 * The effect's `return` is the important part: without it, every keystroke
 * would leave a live timer and the value would update several times (and
 * after unmounting).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx jest src/features/catalog/__tests__/useDebouncedValue --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing `SearchBar` test**

`src/features/catalog/__tests__/SearchBar.test.tsx`:

```tsx
import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {SearchBar} from '../components/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not dispatch the query before the debounce', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(store.getState().catalog.query).toBe('');
  });

  it('dispatches the query once the debounce has elapsed', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(store.getState().catalog.query).toBe('nimbus');
  });

  it('reflects the typed text immediately in the input', () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByTestId('search-input');
    fireEvent.changeText(input, 'nimbus');
    expect(input.props.value).toBe('nimbus');
  });
});
```

> The third case documents the decision: the input is **locally controlled** and only the debounced value goes to the store. If the input read from the store, every keystroke would trigger a render of the entire list.

- [ ] **Step 6: Run and verify it fails**

Run: `npx jest src/features/catalog/__tests__/SearchBar --no-coverage`
Expected: FAIL — `Cannot find module '../components/SearchBar'`.

- [ ] **Step 7: Implement `SearchBar`**

`src/features/catalog/components/SearchBar.tsx`:

```tsx
import React, {useEffect, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';

import {useAppDispatch} from '@/app/hooks';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {queryChanged} from '../catalogSlice';
import {useDebouncedValue} from '../hooks/useDebouncedValue';

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchBar() {
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    dispatch(queryChanged(debounced));
  }, [debounced, dispatch]);

  return (
    <View style={styles.container}>
      <TextInput
        testID="search-input"
        accessibilityLabel="Search products"
        placeholder="Search products"
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {paddingHorizontal: spacing.md, paddingTop: spacing.sm},
  input: {
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
});
```

- [ ] **Step 8: Run the test and verify it passes**

Run: `npx jest src/features/catalog/__tests__/SearchBar --no-coverage`
Expected: PASS, 3 tests.

- [ ] **Step 9: Implement `CategoryFilter`**

`src/features/catalog/components/CategoryFilter.tsx`:

```tsx
import React, {useCallback} from 'react';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import {CATEGORIES} from '@/services/api/types';
import type {Category} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {categoryChanged} from '../catalogSlice';

const OPTIONS: Array<Category | 'all'> = ['all', ...CATEGORIES];

const LABELS: Record<Category | 'all', string> = {
  all: 'All',
  audio: 'Audio',
  wearables: 'Wearables',
  computers: 'Computers',
  gaming: 'Gaming',
  home: 'Home',
};

export function CategoryFilter() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.catalog.category);

  const onSelect = useCallback(
    (category: Category | 'all') => dispatch(categoryChanged(category)),
    [dispatch],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {OPTIONS.map(option => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            testID={`category-${option}`}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={() => onSelect(option)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  chipActive: {backgroundColor: colors.primary},
  label: {...typography.caption, color: colors.textMuted},
  labelActive: {color: colors.primaryText, fontWeight: '600'},
});
```

- [ ] **Step 10: Implement `SortControl`**

`src/features/catalog/components/SortControl.tsx`:

```tsx
import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import type {SortOption} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {sortChanged} from '../catalogSlice';

const OPTIONS: Array<{value: SortOption; label: string}> = [
  {value: 'name', label: 'Name'},
  {value: 'price_asc', label: 'Price ↑'},
  {value: 'price_desc', label: 'Price ↓'},
];

export function SortControl() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.catalog.sort);

  const onSelect = useCallback(
    (value: SortOption) => dispatch(sortChanged(value)),
    [dispatch],
  );

  return (
    <View style={styles.row}>
      {OPTIONS.map(option => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            testID={`sort-${option.value}`}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {borderColor: colors.primary, backgroundColor: colors.surface},
  label: {...typography.caption, color: colors.textMuted},
  labelActive: {color: colors.primary, fontWeight: '600'},
});
```

- [ ] **Step 11: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: debounced search, category filter, and sort control"
```

---

## Task 12: ProductCard and ProductListScreen

**Files:**

- Create: `src/features/catalog/components/ProductCard.tsx`
- Create: `src/features/catalog/components/ProductListSkeleton.tsx`
- Replace: `src/features/catalog/screens/ProductListScreen.tsx` (was a placeholder)
- Test: `src/features/catalog/__tests__/ProductListScreen.test.tsx`

**Interfaces:**

- Consumes: `useGetProductsInfiniteQuery`; `selectProductsQueryArgs`, `selectHasActiveFilters`; `SearchBar`, `CategoryFilter`, `SortControl`; `EmptyState`, `ErrorView`, `Screen`, `Skeleton`; `formatPrice`; `ProductListScreenProps`.
- Produces:

  - `PRODUCT_CARD_HEIGHT = 96` (exported, used by `getItemLayout`)
  - `<ProductCard product onPress />` — `{product: Product; onPress: (id: string) => void}`; memoized with `React.memo`; testID `product-card-<id>`
  - `<ProductListScreen navigation />`; testIDs `product-list`, `list-skeleton`

- [ ] **Step 1: Write the failing screen test**

`src/features/catalog/__tests__/ProductListScreen.test.tsx`:

```tsx
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import React from 'react';

import {server} from '@/mocks/server.node';
import {API_BASE_URL} from '@/services/api/config';
import {renderWithProviders} from '@/test/renderWithProviders';

import {ProductListScreen} from '../screens/ProductListScreen';

const navigation = {navigate: jest.fn()} as never;

function renderScreen() {
  return renderWithProviders(
    <ProductListScreen
      navigation={navigation}
      route={{key: 'k', name: 'ProductList'} as never}
    />,
  );
}

describe('ProductListScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    renderScreen();
    expect(screen.getByTestId('list-skeleton')).toBeVisible();
  });

  it('shows the first page of products', async () => {
    renderScreen();
    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(screen.queryByTestId('list-skeleton')).toBeNull();
  });

  it('filters the list when searching', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-list')).toBeVisible(),
    );
    // First page under the default sort, before any filtering.
    expect(screen.getByText('Gamepad Atlas')).toBeVisible();

    fireEvent.changeText(screen.getByTestId('search-input'), 'Headphones');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();

    expect(await screen.findByText('Headphones Atlas')).toBeVisible();
    expect(screen.queryByText('Gamepad Atlas')).toBeNull();
  });

  it('shows the empty state when there are no matches', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-list')).toBeVisible(),
    );

    fireEvent.changeText(screen.getByTestId('search-input'), 'zzzznomatch');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();

    expect(await screen.findByText('No results')).toBeVisible();
  });

  it('shows the error with retry when the API fails', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products`, () =>
        HttpResponse.json({message: 'Boom'}, {status: 500}),
      ),
    );
    renderScreen();
    expect(await screen.findByTestId('retry')).toBeVisible();
  });

  it('navigates to the detail screen when a product is tapped', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('product-card-p-035'));
    expect(navigation.navigate).toHaveBeenCalledWith('ProductDetail', {
      productId: 'p-035',
    });
  });
});
```

> `Gamepad Atlas` is the first item on the default sorted page because
> "Gamepad" sorts first alphabetically among the five category base names in
> the deterministic dataset from Task 3; `Headphones Atlas` is what the
> filtered case lands on. `p-035` is that same Gamepad Atlas item's id. If
> the dataset changes, these tests fail on purpose.

- [ ] **Step 2: Run and verify it fails**

Run: `npx jest src/features/catalog/__tests__/ProductListScreen --no-coverage`
Expected: FAIL — the placeholder screen doesn't export any of this.

- [ ] **Step 3: Implement `ProductCard`**

`src/features/catalog/components/ProductCard.tsx`:

```tsx
import React, {memo, useCallback} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import type {Product} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

/** Fixed height: it's what enables `getItemLayout` on the FlatList. */
export const PRODUCT_CARD_HEIGHT = 96;

interface ProductCardProps {
  product: Product;
  onPress: (id: string) => void;
}

function ProductCardComponent({product, onPress}: ProductCardProps) {
  const handlePress = useCallback(
    () => onPress(product.id),
    [onPress, product.id],
  );

  return (
    <Pressable
      testID={`product-card-${product.id}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.container}>
      <Image source={{uri: product.imageUrl}} style={styles.image} />
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.meta}>
          {product.category} · ★ {product.rating}
        </Text>
        <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
      </View>
    </Pressable>
  );
}

/**
 * What makes `React.memo` effective here is that the row's props keep their
 * identity: above all `onPress`, which arrives memoized from the screen.
 * Measured by instrumenting this component: `useCallback` on `renderItem`
 * doesn't change how many times the row renders (10 vs. 10 while typing in
 * the search box, 0 vs. 0 forcing parent re-renders without changing the
 * data), because `FlatList` already wraps each row in a `CellRenderer` that
 * is a `PureComponent`.
 */
export const ProductCard = memo(ProductCardComponent);
```

- [ ] **Step 4: Implement the list skeleton**

`src/features/catalog/components/ProductListSkeleton.tsx`:

```tsx
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Skeleton} from '@/components/ui';
import {spacing} from '@/theme/tokens';

import {PRODUCT_CARD_HEIGHT} from './ProductCard';

const PLACEHOLDER_COUNT = 6;

export function ProductListSkeleton() {
  return (
    <View testID="list-skeleton" style={styles.container}>
      {Array.from({length: PLACEHOLDER_COUNT}, (_, index) => (
        <Skeleton key={index} height={PRODUCT_CARD_HEIGHT - spacing.md} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: spacing.md, gap: spacing.md},
});
```

- [ ] **Step 5: Implement `ProductListScreen`**

`src/features/catalog/screens/ProductListScreen.tsx`:

```tsx
import React, {useCallback, useMemo} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, View} from 'react-native';
import type {ListRenderItem} from 'react-native';

import {useAppSelector} from '@/app/hooks';
import {EmptyState, ErrorView, Screen} from '@/components/ui';
import type {Product} from '@/services/api/types';
import {colors, spacing} from '@/theme/tokens';
import type {ProductListScreenProps} from '@/navigation/types';

import {useGetProductsInfiniteQuery} from '../catalogApi';
import {CategoryFilter} from '../components/CategoryFilter';
import {ProductCard, PRODUCT_CARD_HEIGHT} from '../components/ProductCard';
import {ProductListSkeleton} from '../components/ProductListSkeleton';
import {SearchBar} from '../components/SearchBar';
import {SortControl} from '../components/SortControl';
import {selectHasActiveFilters, selectProductsQueryArgs} from '../selectors';

export function ProductListScreen({navigation}: ProductListScreenProps) {
  const queryArgs = useAppSelector(selectProductsQueryArgs);
  const hasFilters = useAppSelector(selectHasActiveFilters);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = useGetProductsInfiniteQuery(queryArgs);

  /**
   * Level 1 of the memoization demo (spec §5): flattening the pages is O(n)
   * and runs on every render of the parent —including every keystroke in
   * the search box— if it isn't memoized. The dependency is `data?.pages`,
   * not `data`.
   */
  const products = useMemo<Product[]>(
    () => data?.pages.flatMap(page => page.items) ?? [],
    [data?.pages],
  );

  const onPressProduct = useCallback(
    (productId: string) => navigation.navigate('ProductDetail', {productId}),
    [navigation],
  );

  const renderItem = useCallback<ListRenderItem<Product>>(
    ({item}) => <ProductCard product={item} onPress={onPressProduct} />,
    [onPressProduct],
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // A known fixed height: it keeps the FlatList from measuring every row
  // and makes scrolling to an index O(1).
  const getItemLayout = useCallback(
    (_data: ArrayLike<Product> | null | undefined, index: number) => ({
      length: PRODUCT_CARD_HEIGHT,
      offset: PRODUCT_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const header = (
    <>
      <SearchBar />
      <CategoryFilter />
      <SortControl />
    </>
  );

  if (error != null) {
    return (
      <Screen>
        {header}
        <ErrorView
          message="We couldn't load the catalog."
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      {isLoading ? (
        <ProductListSkeleton />
      ) : (
        <FlatList
          testID="product-list"
          data={products}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshing={isFetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          contentContainerStyle={
            products.length === 0 ? styles.emptyContainer : styles.list
          }
          ListEmptyComponent={
            <EmptyState
              title="No results"
              message={
                hasFilters
                  ? 'Try another search or clear the filters.'
                  : 'There are no products yet.'
              }
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {paddingHorizontal: spacing.md},
  emptyContainer: {flexGrow: 1, justifyContent: 'center'},
  footer: {paddingVertical: spacing.md},
});
```

- [ ] **Step 6: Run the test and verify it passes**

Run: `npx jest src/features/catalog/__tests__/ProductListScreen --no-coverage`
Expected: PASS, 6 tests.

- [ ] **Step 7: Verify on the simulator**

Run: `npm run ios`
Expected: the list loads with a skeleton, search filters it, scrolling brings in more pages, and pull to refresh works.

- [ ] **Step 8: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: product list with infinite pagination, filters, and memoization"
```

---

## Task 13: Favorites

**Files:**

- Create: `src/services/favorites/favoritesSlice.ts`
- Create: `src/services/favorites/selectors.ts`
- Create: `src/services/favorites/favoritesListeners.ts`
- Create: `src/services/favorites/index.ts`
- Create: `src/components/ui/FavoriteButton.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/app/store.ts` (`favorites` reducer + listeners + hydration)
- Replace: `src/features/favorites/screens/FavoritesScreen.tsx` (was a placeholder)
- Test: `src/services/favorites/__tests__/favoritesSlice.test.ts`
- Test: `src/features/favorites/__tests__/FavoritesScreen.test.tsx`

**Interfaces:**

- Consumes: `storage`, `STORAGE_KEYS`; `AppStartListening`; `useGetProductQuery` from `@/services/api/productsApi`.
- Produces from `@/services/favorites`:
  - `favoritesReducer` (the slice's default), `favoriteToggled(id: string)`, `favoritesRestored(ids: string[])`
  - `FavoritesState = {ids: string[]}`
  - `selectFavoriteIds(state): string[]`, `makeSelectIsFavorite(id)` / `selectIsFavorite(state, id): boolean`
  - `registerFavoritesListeners(startAppListening): void`
  - `restoreFavorites({storage?}): thunk`
- Produces: `<FavoriteButton productId />` from `@/components/ui`; testID `favorite-<id>`.

> **Why the slice lives in `services/` and not in `features/favorites/`:**
> favorites state is consumed by the favorites screen **and** the product
> detail screen (the `catalog` feature). Leaving it inside the feature would
> force a feature→feature import, which the dependency rule forbids.
> Cross-cutting state moves up to the shared layer; the `favorites` feature
> ends up being just its screen. It's exactly the mechanism spec §3.1
> describes ("if two features need the same thing, move it up").

- [ ] **Step 1: Write the failing slice test**

`src/services/favorites/__tests__/favoritesSlice.test.ts`:

```ts
import {createMemoryStorage, STORAGE_KEYS} from '@/services/storage';

import favoritesReducer, {
  favoriteToggled,
  favoritesRestored,
  restoreFavorites,
} from '../favoritesSlice';
import type {FavoritesState} from '../favoritesSlice';

const empty: FavoritesState = {ids: []};

describe('favoritesSlice', () => {
  it('starts empty', () => {
    expect(favoritesReducer(undefined, {type: '@@INIT'})).toEqual(empty);
  });

  it('adds an id that was not there', () => {
    expect(favoritesReducer(empty, favoriteToggled('p-001')).ids).toEqual([
      'p-001',
    ]);
  });

  it('removes an id that was already there', () => {
    const state: FavoritesState = {ids: ['p-001', 'p-002']};
    expect(favoritesReducer(state, favoriteToggled('p-001')).ids).toEqual([
      'p-002',
    ]);
  });

  it('does not duplicate ids', () => {
    let state = favoritesReducer(empty, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-002'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    expect(state.ids).toEqual(['p-002', 'p-001']);
  });

  it('replaces the list on restore', () => {
    const state: FavoritesState = {ids: ['p-009']};
    expect(
      favoritesReducer(state, favoritesRestored(['p-001', 'p-002'])).ids,
    ).toEqual(['p-001', 'p-002']);
  });
});

describe('restoreFavorites', () => {
  it('hydrates from storage', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-003']));

    const dispatched: unknown[] = [];
    await restoreFavorites({storage})(action => {
      dispatched.push(action);
      return action;
    });

    expect(dispatched).toContainEqual(favoritesRestored(['p-003']));
  });

  it('does not break if storage has invalid JSON', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, 'not-json');

    const dispatched: unknown[] = [];
    await restoreFavorites({storage})(action => {
      dispatched.push(action);
      return action;
    });

    expect(dispatched).toContainEqual(favoritesRestored([]));
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx jest src/services/favorites --no-coverage`
Expected: FAIL — `Cannot find module '../favoritesSlice'`.

- [ ] **Step 3: Implement the slice**

`src/services/favorites/favoritesSlice.ts`:

```ts
import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {storage as defaultStorage, STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';

/** Ids only: product data is resolved from the RTK Query cache. */
export interface FavoritesState {
  ids: string[];
}

const initialState: FavoritesState = {ids: []};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    favoriteToggled(state, action: PayloadAction<string>) {
      const index = state.ids.indexOf(action.payload);
      if (index === -1) {
        state.ids.push(action.payload);
      } else {
        state.ids.splice(index, 1);
      }
    },
    favoritesRestored(state, action: PayloadAction<string[]>) {
      state.ids = action.payload;
    },
  },
});

export const {favoriteToggled, favoritesRestored} = favoritesSlice.actions;
export default favoritesSlice.reducer;

export function restoreFavorites({
  storage = defaultStorage,
}: {storage?: Storage} = {}) {
  return async (dispatch: (action: unknown) => unknown): Promise<void> => {
    const raw = await storage.getItem(STORAGE_KEYS.favorites);
    if (raw == null) {
      dispatch(favoritesRestored([]));
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const ids = Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
      dispatch(favoritesRestored(ids));
    } catch {
      // Corrupt storage must not break the app's startup.
      dispatch(favoritesRestored([]));
    }
  };
}
```

- [ ] **Step 4: Write the selectors, listeners, and barrel**

`src/services/favorites/selectors.ts`:

```ts
import type {RootState} from '@/app/store';

export const selectFavoriteIds = (state: RootState): string[] =>
  state.favorites.ids;

/**
 * A parameterized selector: it returns a boolean (a primitive), so
 * createSelector isn't needed — `useSelector` compares with `===` and a
 * boolean never changes identity without changing value. Memoizing it would
 * be pure overhead. (Spec §5, counterpoint: knowing when *not* to memoize.)
 */
export const selectIsFavorite = (
  state: RootState,
  productId: string,
): boolean => state.favorites.ids.includes(productId);
```

`src/services/favorites/favoritesListeners.ts`:

```ts
import type {AppStartListening} from '@/app/listenerMiddleware';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {favoriteToggled} from './favoritesSlice';

export function registerFavoritesListeners(
  startAppListening: AppStartListening,
): void {
  startAppListening({
    actionCreator: favoriteToggled,
    effect: async (_action, api) => {
      const {ids} = api.getState().favorites;
      await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(ids));
    },
  });
}
```

`src/services/favorites/index.ts`:

```ts
export {default as favoritesReducer} from './favoritesSlice';
export {
  favoriteToggled,
  favoritesRestored,
  restoreFavorites,
} from './favoritesSlice';
export type {FavoritesState} from './favoritesSlice';
export {registerFavoritesListeners} from './favoritesListeners';
export {selectFavoriteIds, selectIsFavorite} from './selectors';
```

- [ ] **Step 5: Mount on the store and hydrate**

In `src/app/store.ts`: add `favorites: favoritesReducer` to `rootReducer`, call `registerFavoritesListeners(startAppListening)` alongside the auth ones. In `src/navigation/RootNavigator.tsx`, inside the existing `useEffect`, add `void dispatch(restoreFavorites());`.

- [ ] **Step 6: Run the slice test**

Run: `npx jest src/services/favorites --no-coverage`
Expected: PASS, 7 tests.

- [ ] **Step 7: Implement `FavoriteButton`**

`src/components/ui/FavoriteButton.tsx`:

```tsx
import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import {favoriteToggled, selectIsFavorite} from '@/services/favorites';
import {colors, radius, spacing} from '@/theme/tokens';

interface FavoriteButtonProps {
  productId: string;
}

export function FavoriteButton({productId}: FavoriteButtonProps) {
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector(state =>
    selectIsFavorite(state, productId),
  );

  const onPress = useCallback(() => {
    dispatch(favoriteToggled(productId));
  }, [dispatch, productId]);

  return (
    <Pressable
      testID={`favorite-${productId}`}
      accessibilityRole="button"
      accessibilityLabel={
        isFavorite ? 'Remove from favorites' : 'Add to favorites'
      }
      accessibilityState={{selected: isFavorite}}
      onPress={onPress}
      style={styles.button}>
      <Text style={[styles.icon, isFavorite && styles.iconActive]}>
        {isFavorite ? '♥' : '♡'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {padding: spacing.sm, borderRadius: radius.full},
  icon: {fontSize: 24, color: colors.textMuted},
  iconActive: {color: colors.favorite},
});
```

Add `export {FavoriteButton} from './FavoriteButton';` to `src/components/ui/index.ts`.

- [ ] **Step 8: Write the failing `FavoritesScreen` test**

`src/features/favorites/__tests__/FavoritesScreen.test.tsx`:

```tsx
import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {FavoritesScreen} from '../screens/FavoritesScreen';

describe('FavoritesScreen', () => {
  it('shows the empty state with no favorites', () => {
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getByText('No favorites yet')).toBeVisible();
  });

  it('shows favorite products resolved from the API', async () => {
    renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    expect(await screen.findByText('Headphones Nimbus')).toBeVisible();
  });

  it('removes a product from the list when unmarked', async () => {
    const {store} = renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });
});
```

- [ ] **Step 9: Implement `FavoritesScreen`**

`src/features/favorites/screens/FavoritesScreen.tsx`:

```tsx
import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';

import {useAppSelector} from '@/app/hooks';
import {EmptyState, FavoriteButton, Screen, Skeleton} from '@/components/ui';
import {useGetProductQuery} from '@/services/api/productsApi';
import {selectFavoriteIds} from '@/services/favorites';
import {colors, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

/**
 * Each row resolves its product by id. If it's already in the RTK Query
 * cache (because it was seen in the catalog) it renders instantly with no
 * request; if not, it's fetched. Storing only ids keeps favorites and the
 * catalog from getting out of sync.
 */
function FavoriteRow({productId}: {productId: string}) {
  const {data: product, isLoading} = useGetProductQuery(productId);

  if (isLoading || product == null) {
    return <Skeleton height={64} />;
  }

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
      </View>
      <FavoriteButton productId={product.id} />
    </View>
  );
}

export function FavoritesScreen() {
  const ids = useAppSelector(selectFavoriteIds);

  if (ids.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No favorites yet"
          message="Tap the heart on a product to save it here."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        testID="favorites-list"
        data={ids}
        keyExtractor={id => id}
        renderItem={({item}) => <FavoriteRow productId={item} />}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {padding: spacing.md, gap: spacing.sm},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  info: {flex: 1, gap: spacing.xs},
  name: {...typography.body, color: colors.text, fontWeight: '600'},
  price: {...typography.caption, color: colors.textMuted},
});
```

- [ ] **Step 10: Run the tests**

Run: `npx jest src/services src/features/favorites --no-coverage`
Expected: PASS. The `FavoritesScreen` test gives 3 green cases.

- [ ] **Step 11: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: favorites persisted by id, resolved from the RTK Query cache"
```

---

## Task 14: ProductDetailScreen

**Files:**

- Replace: `src/features/catalog/screens/ProductDetailScreen.tsx` (was a placeholder)
- Test: `src/features/catalog/__tests__/ProductDetailScreen.test.tsx`

**Interfaces:**

- Consumes: `useGetProductQuery` from `@/services/api/productsApi`; `FavoriteButton`, `ErrorView`, `Screen`, `Skeleton`; `formatPrice`; `ProductDetailScreenProps`.
- Produces: `<ProductDetailScreen route navigation />`; testIDs `detail-skeleton`, `detail-name`, `detail-stock`.

- [ ] **Step 1: Write the failing test**

`src/features/catalog/__tests__/ProductDetailScreen.test.tsx`:

```tsx
import {fireEvent, screen} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import React from 'react';

import {server} from '@/mocks/server.node';
import {API_BASE_URL} from '@/services/api/config';
import {productsApi} from '@/services/api/productsApi';
import {renderWithProviders} from '@/test/renderWithProviders';

import {ProductDetailScreen} from '../screens/ProductDetailScreen';

function renderDetail(
  productId: string,
  store?: ReturnType<typeof renderWithProviders>['store'],
) {
  return renderWithProviders(
    <ProductDetailScreen
      route={{key: 'k', name: 'ProductDetail', params: {productId}} as never}
      navigation={{setOptions: jest.fn()} as never}
    />,
    store ? {store} : undefined,
  );
}

describe('ProductDetailScreen', () => {
  it('shows the skeleton while loading', () => {
    renderDetail('p-001');
    expect(screen.getByTestId('detail-skeleton')).toBeVisible();
  });

  it('shows the product data', async () => {
    renderDetail('p-001');
    expect(await screen.findByTestId('detail-name')).toHaveTextContent(
      'Headphones Nimbus',
    );
    expect(screen.getByText('$19.99')).toBeVisible();
  });

  it('renders instantly if the product is already in the cache', async () => {
    const {store} = renderWithProviders(<></>);
    await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));

    renderDetail('p-001', store);
    // Without going through the skeleton: the data was already there.
    expect(screen.queryByTestId('detail-skeleton')).toBeNull();
    expect(screen.getByTestId('detail-name')).toHaveTextContent(
      'Headphones Nimbus',
    );
  });

  it('toggles the favorite', async () => {
    const {store} = renderDetail('p-001');
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual(['p-001']);
    fireEvent.press(screen.getByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });

  it('shows an error with retry if the product does not exist', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/:id`, () =>
        HttpResponse.json({message: 'Not found'}, {status: 404}),
      ),
    );
    renderDetail('p-999');
    expect(await screen.findByTestId('retry')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx jest src/features/catalog/__tests__/ProductDetailScreen --no-coverage`
Expected: FAIL — the placeholder doesn't export this.

- [ ] **Step 3: Implement the screen**

`src/features/catalog/screens/ProductDetailScreen.tsx`:

```tsx
import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

import {ErrorView, FavoriteButton, Screen, Skeleton} from '@/components/ui';
import {useGetProductQuery} from '@/services/api/productsApi';
import {colors, radius, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';
import type {ProductDetailScreenProps} from '@/navigation/types';

export function ProductDetailScreen({route}: ProductDetailScreenProps) {
  const {productId} = route.params;

  /**
   * If the product is already in the cache (it was seen in the list),
   * `data` comes populated on the first render and RTK Query revalidates in
   * the background. It's the behavior that makes navigation feel instant.
   */
  const {
    data: product,
    error,
    isLoading,
    refetch,
  } = useGetProductQuery(productId);

  if (isLoading) {
    return (
      <Screen scroll>
        <View testID="detail-skeleton" style={styles.skeleton}>
          <Skeleton height={240} />
          <Skeleton height={24} width="70%" />
          <Skeleton height={18} width="40%" />
        </View>
      </Screen>
    );
  }

  if (error != null || product == null) {
    return (
      <Screen>
        <ErrorView
          message="We couldn't load the product."
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  // Deliberately NOT memoized calculation (spec §5, counterpoint): it's a
  // comparison and a string concatenation over data that's already in
  // memory. Wrapping it in useMemo would cost more than recomputing it —the
  // hook stores the dependency array and compares it on every render— and
  // would add noise when reading it. Memoization is justified by measured
  // cost, not by reflex.
  const availability =
    product.stock > 0 ? `${product.stock} in stock` : 'Out of stock';

  return (
    <Screen scroll>
      <Image source={{uri: product.imageUrl}} style={styles.image} />

      <View style={styles.header}>
        <Text testID="detail-name" style={styles.name}>
          {product.name}
        </Text>
        <FavoriteButton productId={product.id} />
      </View>

      <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
      <Text testID="detail-stock" style={styles.meta}>
        {product.category} · ★ {product.rating} · {availability}
      </Text>
      <Text style={styles.description}>{product.description}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeleton: {gap: spacing.md},
  image: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  name: {...typography.title, color: colors.text, flex: 1},
  price: {...typography.heading, color: colors.primary, marginTop: spacing.xs},
  meta: {...typography.caption, color: colors.textMuted, marginTop: spacing.xs},
  description: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
    lineHeight: 22,
  },
});
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx jest src/features/catalog/__tests__/ProductDetailScreen --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 5: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: product detail on top of the RTK Query cache with favorite toggle"
```

---

## Task 15: Profile and Performance Lab

**Files:**

- Replace: `src/features/profile/screens/ProfileScreen.tsx` (was a placeholder)
- Create: `src/features/profile/screens/PerformanceLabScreen.tsx`
- Create: `src/navigation/ProfileStack.tsx`
- Modify: `src/navigation/types.ts` (add `ProfileStackParamList`)
- Modify: `src/navigation/AppTabs.tsx` (use `ProfileStack`)
- Test: `src/features/profile/__tests__/ProfileScreen.test.tsx`
- Test: `src/features/profile/__tests__/PerformanceLabScreen.test.tsx`

**Interfaces:**

- Consumes: `useSession` from `@/services/session`; `Button`, `Screen`.
- Produces:

  - `ProfileStackParamList = {Profile: undefined; PerformanceLab: undefined}`
  - `<ProfileScreen navigation />`; testIDs `profile-email`, `profile-logout`, `profile-open-lab`
  - `<PerformanceLabScreen />`; testIDs `lab-input`, `lab-render-count-plain-<i>`, `lab-render-count-memo-<i>`, `lab-parent-renders`

- [ ] **Step 1: Add the profile stack to the types**

In `src/navigation/types.ts`, add:

```ts
export type ProfileStackParamList = {
  Profile: undefined;
  PerformanceLab: undefined;
};

export type ProfileScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  'Profile'
>;
```

and change `AppTabParamList` so `ProfileTab` is `NavigatorScreenParams<ProfileStackParamList>`.

- [ ] **Step 2: Write the failing profile test**

`src/features/profile/__tests__/ProfileScreen.test.tsx`:

```tsx
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {productsApi} from '@/services/api/productsApi';
import {renderWithProviders} from '@/test/renderWithProviders';

import {ProfileScreen} from '../screens/ProfileScreen';

const navigation = {navigate: jest.fn()} as never;

const signedIn = {
  session: {
    status: 'signedIn' as const,
    accessToken: 'demo-access-token',
    user: {id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'},
  },
};

function renderProfile() {
  return renderWithProviders(
    <ProfileScreen
      navigation={navigation}
      route={{key: 'k', name: 'Profile'} as never}
    />,
    {preloadedState: signedIn},
  );
}

describe('ProfileScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the user data', () => {
    renderProfile();
    expect(screen.getByTestId('profile-email')).toHaveTextContent(
      'demo@catalog.dev',
    );
    expect(screen.getByText('Demo User')).toBeVisible();
  });

  it('signs out and clears the API cache', async () => {
    const {store} = renderProfile();
    // Actually populate the cache: otherwise the final assertion would pass trivially.
    await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));
    expect(Object.keys(store.getState().api.queries).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('profile-logout'));

    await waitFor(() =>
      expect(store.getState().session.status).toBe('signedOut'),
    );
    expect(store.getState().session.accessToken).toBeNull();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });

  it('navigates to the Performance Lab', () => {
    renderProfile();
    fireEvent.press(screen.getByTestId('profile-open-lab'));
    expect(navigation.navigate).toHaveBeenCalledWith('PerformanceLab');
  });
});
```

- [ ] **Step 3: Run and verify it fails**

Run: `npx jest src/features/profile --no-coverage`
Expected: FAIL — the placeholder doesn't expose those testIDs.

- [ ] **Step 4: Implement `ProfileScreen`**

`src/features/profile/screens/ProfileScreen.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Button, Screen} from '@/components/ui';
import {useSession} from '@/services/session';
import {colors, spacing, typography} from '@/theme/tokens';
import type {ProfileScreenProps} from '@/navigation/types';

export function ProfileScreen({navigation}: ProfileScreenProps) {
  const {user, signOut} = useSession();

  return (
    <Screen scroll>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
        <Text testID="profile-email" style={styles.email}>
          {user?.email ?? '—'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          testID="profile-open-lab"
          label="Performance Lab"
          variant="ghost"
          onPress={() => navigation.navigate('PerformanceLab')}
        />
        <Button testID="profile-logout" label="Sign out" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {gap: spacing.xs, paddingVertical: spacing.lg},
  name: {...typography.title, color: colors.text},
  email: {...typography.body, color: colors.textMuted},
  actions: {gap: spacing.md},
});
```

- [ ] **Step 5: Run the profile test**

Run: `npx jest src/features/profile/__tests__/ProfileScreen --no-coverage`
Expected: PASS, 3 tests.

- [ ] **Step 6: Write the failing Performance Lab test**

`src/features/profile/__tests__/PerformanceLabScreen.test.tsx`:

```tsx
import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {PerformanceLabScreen} from '../screens/PerformanceLabScreen';

describe('PerformanceLabScreen', () => {
  it('starts with every row at 1 render', () => {
    render(<PerformanceLabScreen />);
    expect(screen.getByTestId('lab-render-count-plain-0')).toHaveTextContent(
      '1',
    );
    expect(screen.getByTestId('lab-render-count-memo-0')).toHaveTextContent(
      '1',
    );
  });

  it('re-renders the non-memoized rows when typing, and not the memoized ones', () => {
    render(<PerformanceLabScreen />);
    fireEvent.changeText(screen.getByTestId('lab-input'), 'a');
    fireEvent.changeText(screen.getByTestId('lab-input'), 'ab');

    expect(screen.getByTestId('lab-render-count-plain-0')).toHaveTextContent(
      '3',
    );
    expect(screen.getByTestId('lab-render-count-memo-0')).toHaveTextContent(
      '1',
    );
  });

  it('counts the parent renders', () => {
    render(<PerformanceLabScreen />);
    fireEvent.changeText(screen.getByTestId('lab-input'), 'a');
    expect(screen.getByTestId('lab-parent-renders')).toHaveTextContent('2');
  });
});
```

> This test is the proof that the demo **measures** something, not that it
> looks nice. If someone breaks the memoization, the test fails.

- [ ] **Step 7: Run and verify it fails**

Run: `npx jest src/features/profile/__tests__/PerformanceLabScreen --no-coverage`
Expected: FAIL — `Cannot find module '../screens/PerformanceLabScreen'`.

- [ ] **Step 8: Implement `PerformanceLabScreen`**

`src/features/profile/screens/PerformanceLabScreen.tsx`:

```tsx
import React, {memo, useCallback, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {Screen} from '@/components/ui';
import {colors, radius, spacing, typography} from '@/theme/tokens';

const ROWS = Array.from({length: 8}, (_, index) => ({
  id: index,
  label: `Row ${index + 1}`,
}));

interface RowProps {
  label: string;
  index: number;
  variant: 'plain' | 'memo';
  onPress: (index: number) => void;
}

/**
 * The counter lives in a ref that's incremented during render. It's impure
 * on purpose: it's the only way to count renders without triggering another
 * render. Under StrictMode's double render the numbers would double —
 * that's worth knowing and saying before it gets asked.
 */
function Row({label, index, variant, onPress}: RowProps) {
  const renders = useRef(0);
  renders.current += 1;

  return (
    <View style={styles.row} onTouchEnd={() => onPress(index)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        testID={`lab-render-count-${variant}-${index}`}
        style={styles.badge}>
        {renders.current}
      </Text>
    </View>
  );
}

const MemoRow = memo(Row);

export function PerformanceLabScreen() {
  const [text, setText] = useState('');
  const parentRenders = useRef(0);
  parentRenders.current += 1;

  // Left column: handler recreated on every render. `Row` isn't memoized,
  // so it always re-renders.
  const onPressPlain = (index: number) => {
    void index;
  };

  // Right column: stable handler + memoized row. The row list is also
  // memoized so its identity doesn't change.
  const onPressMemo = useCallback((index: number) => {
    void index;
  }, []);

  const memoRows = useMemo(() => ROWS, []);

  return (
    <Screen>
      <View style={styles.header}>
        <TextInput
          testID="lab-input"
          placeholder="Type to force parent re-renders"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <Text style={styles.caption}>
          Parent renders:{' '}
          <Text testID="lab-parent-renders" style={styles.badgeInline}>
            {parentRenders.current}
          </Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.columns} horizontal={false}>
        <View style={styles.columnsRow}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Not memoized</Text>
            {ROWS.map(row => (
              <Row
                key={row.id}
                index={row.id}
                label={row.label}
                variant="plain"
                onPress={onPressPlain}
              />
            ))}
          </View>

          <View style={styles.column}>
            <Text style={styles.columnTitle}>Memoized</Text>
            {memoRows.map(row => (
              <MemoRow
                key={row.id}
                index={row.id}
                label={row.label}
                variant="memo"
                onPress={onPressMemo}
              />
            ))}
          </View>
        </View>

        <Text style={styles.explainer}>
          Every keystroke re-renders this screen. The left column re-renders its
          8 rows because `onPress` changes identity; the right one renders none
          because `React.memo` + `useCallback` keep the props stable. With 8
          rows the difference is irrelevant: the point is that with 800 it stops
          being irrelevant, and that memoizing without measuring is guessing.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {padding: spacing.md, gap: spacing.sm},
  input: {
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  caption: {...typography.caption, color: colors.textMuted},
  columns: {padding: spacing.md, gap: spacing.lg},
  columnsRow: {flexDirection: 'row', gap: spacing.md},
  column: {flex: 1, gap: spacing.sm},
  columnTitle: {...typography.heading, color: colors.text},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  rowLabel: {...typography.caption, color: colors.text},
  badge: {...typography.caption, color: colors.primary, fontWeight: '700'},
  badgeInline: {color: colors.primary, fontWeight: '700'},
  explainer: {...typography.caption, color: colors.textMuted, lineHeight: 19},
});
```

- [ ] **Step 9: Run the test and verify it passes**

Run: `npx jest src/features/profile --no-coverage`
Expected: PASS, 6 tests.

- [ ] **Step 10: Mount the profile stack**

`src/navigation/ProfileStack.tsx`:

```tsx
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

import {PerformanceLabScreen} from '@/features/profile/screens/PerformanceLabScreen';
import {ProfileScreen} from '@/features/profile/screens/ProfileScreen';

import type {ProfileStackParamList} from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
      <Stack.Screen
        name="PerformanceLab"
        component={PerformanceLabScreen}
        options={{title: 'Performance Lab'}}
      />
    </Stack.Navigator>
  );
}
```

In `src/navigation/AppTabs.tsx`, replace the tab's `component={ProfileScreen}` with `component={ProfileStack}` with `options={{title: 'Profile', headerShown: false}}`.

- [ ] **Step 11: Verify on the simulator**

Run: `npm run ios`
Expected: in Profile → Performance Lab, typing bumps the left column's counters while the right one stays at 1.

- [ ] **Step 12: Full verification and commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: profile with logout and Performance Lab with render counter"
```

---

## Task 16: Documentation and final verification

**Files:**

- Create: `CLAUDE.md`
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-08-30-rn-product-catalog-design.md` (status → implemented)

**Interfaces:**

- Consumes: everything above.
- Produces: documentation. No new code.

- [ ] **Step 1: Write `CLAUDE.md`**

Required sections, in this order:

1. **Commands** — `npm run lint`, `typecheck`, `test`, `ios`, `android`, `start`; how to run a single test.
2. **Architecture map** — the real `src/` tree (generated with `find src -type d | sort`, not from memory) with one line per folder.
3. **Dependency rule** — features don't import from features; what moved up to `services/` and why (`session`, `favorites`, `productsApi`); that the rule is enforced in `eslint.config.js`.
4. **Server state vs. client state** — RTK Query owns products and the user; the slices own session, filters, and favorites. Don't duplicate.
5. **Conventions** — named exports except `App`; tests in `__tests__/` alongside the code; `testID` in kebab-case; imports ordered by `import/order`.
6. **Testing strategy** — what's tested and what isn't; `renderWithProviders`; no large snapshots; MSW with `onUnhandledRequest: 'error'`.
7. **Gotchas** — the alias is needed in tsconfig **and** babel **and** jest; MSW on RN needs `msw/native` + polyfills (and the actual outcome of Task 4's Step 12); `noUncheckedIndexedAccess` forces checking index accesses; New Architecture is active by default.
8. **Decisions** — a link to the README's ADR section.

- [ ] **Step 2: Write `README.md`**

Required sections:

1. CI badge (`![CI](https://github.com/<user>/rn-product-catalog/actions/workflows/ci.yml/badge.svg)`).
2. **What it is** — two paragraphs.
3. **Setup from a clean clone** — `npm ci`, `cd ios && pod install`, `npm run ios` / `npm run android`, version requirements (Node 20, JDK 17, Xcode).
4. **Demo credentials** — `demo@catalog.dev` / `password123`.
5. **Screenshots** — login, catalog, detail, favorites, Performance Lab. Take them from the simulator and save them to `docs/screenshots/`.
6. **Interview notes** — the table from Step 3.
7. **ADRs** — the five from spec §12, updated with what actually happened (RN's final version, MSW's outcome on RN).
8. **What's missing and why** — the non-goals from spec §1: no real backend, no dark mode, no i18n, no Detox, no native build in CI, partial and deliberate coverage.

- [ ] **Step 3: Write the interview notes table**

Each row points to a concrete file. Verify that each path exists before closing out the task.

| Topic                                 | Where it is                                                             | Short answer                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New Architecture                      | `android/gradle.properties`, `ios/Podfile`                              | Fabric + TurboModules active by default since RN 0.76; C++ renderer, no asynchronous bridge.                                                                                                                                                                                                             |
| Memoization level 1                   | `src/features/catalog/screens/ProductListScreen.tsx`                    | Measured: `useCallback` on `renderItem` doesn't change how many times the row renders (10 vs. 10 while searching, 0 vs. 0 without changing the data), because `FlatList` already wraps it in a `PureComponent`. What carries the weight is the memoized `onPress` handler, which keeps the props stable. |
| Memoization level 2                   | `src/features/catalog/selectors.ts`                                     | `createSelector`: a selector that returns a new object re-renders on every dispatch.                                                                                                                                                                                                                     |
| Memoization level 3                   | `src/features/profile/screens/PerformanceLabScreen.tsx`                 | Per-row render counter: the difference is seen, not explained.                                                                                                                                                                                                                                           |
| When NOT to memoize                   | `src/features/catalog/screens/ProductDetailScreen.tsx`                  | A cheap calculation without `useMemo`, with the reason in a comment.                                                                                                                                                                                                                                     |
| Custom hook with cleanup              | `src/features/catalog/hooks/useDebouncedValue.ts`                       | The `useEffect`'s `return` is what avoids dangling timers.                                                                                                                                                                                                                                               |
| RTK Query vs. Context                 | `src/services/api/baseApi.ts`, `src/features/catalog/catalogApi.ts`     | Cache, tags, dedupe, and loading states for free; Context isn't a caching system.                                                                                                                                                                                                                        |
| Server state vs. client state         | `src/features/catalog/catalogSlice.ts`                                  | The slice stores filters, not products.                                                                                                                                                                                                                                                                  |
| Infinite pagination                   | `src/features/catalog/catalogApi.ts`                                    | `infiniteQuery` with a cursor; `getNextPageParam` returns `undefined` to cut it off.                                                                                                                                                                                                                     |
| Typed navigation                      | `src/navigation/types.ts`                                               | `ParamList` + `declare global` on `ReactNavigation.RootParamList`.                                                                                                                                                                                                                                       |
| 401 handling                          | `src/services/api/baseApi.ts`, `src/services/api/sessionEvents.ts`      | A baseQuery wrapper that dispatches a neutral event; keeps services from depending on features.                                                                                                                                                                                                          |
| Token security                        | `src/services/storage/asyncStorage.ts`                                  | AsyncStorage isn't encrypted; in production, Keychain. It's behind an interface so swapping it is a single-file change (ADR-003).                                                                                                                                                                        |
| Persistence without dirtying reducers | `src/services/session/`, `src/services/favorites/favoritesListeners.ts` | `createListenerMiddleware`: the reducers stay pure and synchronous.                                                                                                                                                                                                                                      |
| MSW                                   | `src/mocks/`                                                            | Intercepts at the network level: zero mocking code in the app, the same handlers in dev and in tests.                                                                                                                                                                                                    |
| List performance                      | `src/features/catalog/components/ProductCard.tsx`                       | `getItemLayout` with a fixed height, stable `keyExtractor`, memoized rows.                                                                                                                                                                                                                               |
| Testing strategy                      | `src/features/catalog/__tests__/ProductListScreen.test.tsx`             | Real integration against MSW, without mocking the store or the network by hand.                                                                                                                                                                                                                          |
| Scaling to 40 screens                 | `eslint.config.js`                                                      | The dependency rule between features is enforced by the linter, not by discipline.                                                                                                                                                                                                                       |

- [ ] **Step 4: Take the screenshots**

```bash
npm run ios
```

With the app running, capture each screen (`Cmd+S` on the simulator) and save them to `docs/screenshots/` with the names `login.png`, `catalog.png`, `detail.png`, `favorites.png`, `performance-lab.png`. Reference them from the README.

- [ ] **Step 5: Verify coverage against the threshold**

Run: `npm test -- --coverage`
Expected: PASS, with `coverageThreshold` not breaking.

If it breaks, the action is **to add a missing test**, not to lower the threshold. If the threshold is genuinely unrealistic for a presentation file, exclude it from `collectCoverageFrom` with a comment saying why.

- [ ] **Step 6: Full verification from a clean clone**

```bash
cd /tmp && rm -rf catalog-verify
git clone /Users/emilianomartino/Documents/rn-product-catalog catalog-verify
cd catalog-verify && npm ci && npm run lint && npm run typecheck && npm test -- --coverage
```

Expected: all four commands green with no extra manual step. If something's missing, the README is incomplete: fix it and repeat.

- [ ] **Step 7: Mark the spec as implemented**

In `docs/superpowers/specs/2026-08-30-rn-product-catalog-design.md`, change `**Status:** approved (pending implementation plan)` to `**Status:** implemented — see docs/superpowers/plans/2026-08-30-rn-product-catalog.md`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs: CLAUDE.md, README with interview notes and screenshots"
```

- [ ] **Step 9: Publish to GitHub**

```bash
gh repo create rn-product-catalog --public --source=. --remote=origin --push
```

Verify that the CI workflow runs and comes out green: `gh run watch`. The README's badge should show `passing`.

---

## Plan self-review

**Spec coverage:** all 13 sections have a task. §1 criteria → Tasks 1 and 16; §2 stack → Task 1; §3 architecture → Tasks 5–15; §4.1 auth → 7–8; §4.2 catalog → 10–12; §4.3 detail → 14; §4.4 favorites → 13; §4.5 profile and lab → 15; §5 memoization (3 levels + counterpoint) → 10, 12, 14, 15; §6 mocked backend → 3–4; §7 testing → distributed, with the 6 files from the spec's table covered; §8 types → 1; §9 lint → 1; §10 CI → 1; §11 docs → 16; §12 ADRs → 16 Step 2.

**Known debt the plan corrects along the way:** the dependency rule forces two moves that the spec's tree didn't anticipate —`getProduct` to `services/api/productsApi.ts` (Task 13) and session state to `services/session/` (Task 15)—. Both are planned, not improvised, and are interview material in their own right.
