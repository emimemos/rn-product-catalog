# rn-product-catalog — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una app React Native de catálogo de productos con auth, búsqueda, paginado infinito y favoritos, donde cada decisión técnica sea defendible en una entrevista.

**Architecture:** Organización feature-based sobre RN CLI bare. RTK Query es dueño del estado del servidor y los slices del estado del cliente. MSW intercepta a nivel de red, así que la app hace HTTP real tanto en dev como en tests y no contiene ninguna rama de mocking. Cada feature inyecta sus endpoints en un `baseApi` único.

**Tech Stack:** React Native 0.87.1 (bare, New Architecture), React 19.2.3, TypeScript 5.x strict, Redux Toolkit 2.12 + RTK Query, React Navigation 7, MSW 2.15, Jest 30 + @testing-library/react-native 14, ESLint 10 + Prettier, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-30-rn-product-catalog-design.md`

## Global Constraints

- React Native **0.87.1** (CLI bare, no Expo). Fallback documentado: **0.86.3** si el build nativo falla. La decisión se toma en la Task 1, no después.
- TypeScript **5.x** (el del template). **No TypeScript 7.x** — ver ADR-002.
- `strict: true` más `noUncheckedIndexedAccess` y `noImplicitOverride`.
- **Cero `any` en `src/`.** Si hace falta, es `unknown` con narrowing.
- Path alias `@/*` → `src/*`, configurado en `tsconfig.json`, `babel.config.js` y `jest.config.js`.
- **Regla de dependencias:** una feature puede importar de `components/ui`, `services`, `theme`, `utils` y `navigation/types`. Una feature **nunca** importa de otra feature. Se enforcea con ESLint (`no-restricted-imports` sobre `@/features/**` dentro de `src/features/**`); dentro de la propia feature se usan imports relativos.
- `favorites` referencia productos solo por `id` y resuelve los datos desde el cache de RTK Query.
- Los mismos handlers de MSW alimentan la app en dev y los tests — una sola fuente de verdad del contrato de API.
- Sin snapshots de UI grandes. Sin build nativo en CI.
- Cada task cierra con `npm run lint && npm run typecheck && npm test` en verde y un commit. **Nada se da por hecho sin correr el comando.**
- Mensajes de commit en formato Conventional Commits.

### Adiciones deliberadas al árbol del spec

El spec §3.1 no las lista; se agregan con justificación y se documentan en `CLAUDE.md`:

| Archivo | Por qué |
|---|---|
| `src/services/api/types.ts` | El contrato de la API lo consumen features **y** mocks. Vive en la capa de API para que ninguna feature dependa de otra ni los mocks de una feature. |
| `src/services/api/config.ts` | `API_BASE_URL` compartida entre `baseApi` y los handlers de MSW. |
| `src/services/api/sessionEvents.ts` | `unauthorized` action creator neutral, para que `services` no importe de `features` al manejar el 401. |
| `src/app/listenerMiddleware.ts` | `createListenerMiddleware` tipado; la persistencia se hace por listener en vez de dentro de los reducers (los reducers quedan puros). |
| `src/services/api/productsApi.ts` | `getProduct` lo consumen el detalle (feature `catalog`) y favoritos (feature `favorites`). En la capa compartida, ninguna feature depende de otra. |
| `src/services/session/` | El estado de sesión lo consumen `navigation`, `profile` y la capa de API. La feature `auth` conserva solo la pantalla de login. |
| `src/services/favorites/` | Los favoritos los consumen la pantalla de favoritos y el detalle de producto. Mismo criterio. |
| `src/utils/formatPrice.ts` | Formateo de precio compartido por catálogo, detalle y favoritos. |

---

## Task 1: Scaffolding y toolchain en verde

**Files:**
- Create: todo el template de RN 0.87.1 en la raíz del repo (`android/`, `ios/`, `index.js`, `app.json`, `package.json`, `Gemfile`)
- Create: `tsconfig.json`, `babel.config.js`, `jest.config.js`, `eslint.config.js`, `.prettierrc.js`, `.gitignore`
- Create: `.husky/pre-commit`, `.lintstagedrc.json`
- Create: `.github/workflows/ci.yml`
- Create: `src/utils/formatPrice.ts`
- Test: `src/utils/__tests__/formatPrice.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `formatPrice(cents: number): string`. Scripts npm `lint`, `typecheck`, `test`, `ios`, `android`, `start`. Alias `@/*` resoluble desde TS, Babel y Jest.

- [ ] **Step 1: Generar el template fuera del repo**

El CLI de RN exige un directorio vacío, y este repo ya tiene `docs/` y `.git`. Se genera al lado y se copia.

```bash
cd /Users/emilianomartino/Documents
npx @react-native-community/cli@latest init RnProductCatalog \
  --version 0.87.1 \
  --directory rn-product-catalog-scaffold \
  --install-pods false
```

- [ ] **Step 2: Copiar el template al repo sin pisar git ni docs**

```bash
cd /Users/emilianomartino/Documents
rsync -a --exclude '.git' rn-product-catalog-scaffold/ rn-product-catalog/
rm -rf rn-product-catalog-scaffold
cd rn-product-catalog
npm install
```

Verificar que `git status` no muestre `docs/` borrado ni `.git` tocado.

- [ ] **Step 3: Añadir `.idea/` al `.gitignore`**

El repo ya tiene `.idea/` sin trackear. Agregar al final de `.gitignore`:

```
# IDE
.idea/
*.iml
```

- [ ] **Step 4: Verificar el build nativo de iOS — punto de decisión de versión**

```bash
cd ios && pod install && cd ..
npm run ios
```

Expected: la app arranca en el simulador y muestra la pantalla de bienvenida de RN.

**Si falla** (CocoaPods contra Xcode 26.6, o Gradle contra JDK 17): regenerar el template con `--version 0.86.3` repitiendo los Steps 1–2 y anotar el cambio en el ADR-001 del README. No se avanza a la Task 2 con el build roto. Ningún código de aplicación de este plan cambia entre 0.87.1 y 0.86.3.

- [ ] **Step 5: Verificar el build nativo de Android**

```bash
npm run android
```

Expected: la app arranca en el emulador. Mismo criterio de fallback que el Step 4.

- [ ] **Step 6: Instalar las dependencias del toolchain**

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

- [ ] **Step 7: Configurar TypeScript**

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

- [ ] **Step 8: Configurar el alias en Babel**

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

> El alias hace falta **dos veces**: `tsconfig.json` lo resuelve para el type checker y el editor; `babel.config.js` lo reescribe en tiempo de build para que Metro lo encuentre. Uno no reemplaza al otro. (Pregunta esperable en entrevista.)

- [ ] **Step 9: Configurar ESLint — verificar primero el formato del config de RN**

ESLint 10 solo acepta flat config. Antes de escribir el archivo, inspeccionar qué exporta el paquete:

```bash
cat node_modules/@react-native/eslint-config/package.json | grep -A5 '"exports"'
node -e "const c=require('@react-native/eslint-config'); console.log(Array.isArray(c) ? 'FLAT' : 'ESLINTRC')"
```

**Rama A — imprime `FLAT`:** usar el config directamente (ver Step 10).

**Rama B — imprime `ESLINTRC`:** instalar el puente y envolverlo:

```bash
npm install --save-dev @eslint/eslintrc @eslint/js
```

y reemplazar en el Step 10 la línea `...reactNativeConfig,` por:

```js
const {FlatCompat} = require('@eslint/eslintrc');
const compat = new FlatCompat({baseDirectory: __dirname});
// ...dentro del array exportado:
...compat.extends('@react-native'),
```

- [ ] **Step 10: Escribir `eslint.config.js`**

```js
const reactNativeConfig = require('@react-native/eslint-config');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  {ignores: ['node_modules/**', 'android/**', 'ios/**', 'coverage/**', 'vendor/**']},
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
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{pattern: '@/**', group: 'internal'}],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {order: 'asc', caseInsensitive: true},
        },
      ],
    },
  },
  {
    // Regla de dependencias del spec §3.1, enforceada por el linter.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message:
                'Una feature no importa de otra feature. Subí lo compartido a components/ui, services o utils. Dentro de la propia feature usá imports relativos.',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
];
```

- [ ] **Step 11: Escribir `.prettierrc.js`**

```js
module.exports = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: 'all',
};
```

- [ ] **Step 12: Configurar Jest**

`jest.config.js`:

```js
module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEach: undefined,
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

Borrar la clave `setupFilesAfterEach: undefined` (está solo para marcar que no se usa) — el archivo final no debe tenerla.

- [ ] **Step 13: Crear los archivos de setup de tests (vacíos por ahora)**

`src/test/polyfills.ts`:

```ts
// MSW 2 necesita las Web APIs de streams y encoding, que el entorno `node` de
// Jest no expone por defecto bajo el preset de React Native.
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
// El servidor de MSW y los mocks de librerías nativas se agregan en la Task 4.
export {};
```

- [ ] **Step 14: Añadir los scripts a `package.json`**

En la clave `scripts`, dejar:

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

- [ ] **Step 15: Escribir el test que falla de `formatPrice`**

`src/utils/__tests__/formatPrice.test.ts`:

```ts
import {formatPrice} from '../formatPrice';

describe('formatPrice', () => {
  it('formatea centavos como dólares con dos decimales', () => {
    expect(formatPrice(1999)).toBe('$19.99');
  });

  it('rellena los centavos con cero a la izquierda', () => {
    expect(formatPrice(1905)).toBe('$19.05');
  });

  it('formatea un precio exacto sin centavos', () => {
    expect(formatPrice(2000)).toBe('$20.00');
  });

  it('formatea cero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('agrega separador de miles', () => {
    expect(formatPrice(123456)).toBe('$1,234.56');
  });
});
```

- [ ] **Step 16: Correr el test y verificar que falla**

Run: `npx jest src/utils --no-coverage`
Expected: FAIL — `Cannot find module '../formatPrice'`.

- [ ] **Step 17: Implementar `formatPrice`**

`src/utils/formatPrice.ts`:

```ts
/**
 * Los precios viajan en centavos (enteros) por la API para no arrastrar errores
 * de punto flotante. El formateo a string es responsabilidad de la UI.
 */
export function formatPrice(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  const grouped = dollars.toLocaleString('en-US');
  return `$${grouped}.${String(remainder).padStart(2, '0')}`;
}
```

- [ ] **Step 18: Correr el test y verificar que pasa**

Run: `npx jest src/utils --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 19: Configurar husky y lint-staged**

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

- [ ] **Step 20: Escribir el workflow de CI**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    name: Lint, typecheck y tests
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

> Sin build nativo: es lento, frágil y no aporta a lo que este proyecto demuestra. La decisión se documenta en el README (Task 16), no se omite en silencio.

- [ ] **Step 21: Correr la verificación completa**

Run:
```bash
npm run lint && npm run typecheck && npm test
```
Expected: los tres en verde. `npm test` corre 5 tests. La cobertura todavía no se exige (no hay archivos en `features/` ni `services/`); si `coverageThreshold` rompe, correr `npm test` sin `--coverage` hasta la Task 3 y anotarlo.

- [ ] **Step 22: Commit**

```bash
git add -A
git commit -m "chore: scaffolding RN 0.87.1 con TS strict, alias, ESLint, Jest y CI"
```

---

## Task 2: Contrato de API y servicio de storage

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
- Consumes: nada.
- Produces:
  - `CATEGORIES`, `Category`, `SortOption`, `Product`, `ProductsPage`, `ProductsQueryArgs`, `User`, `LoginRequest`, `LoginResponse` desde `@/services/api/types`.
  - `API_BASE_URL: string` desde `@/services/api/config`.
  - `interface Storage { getItem(key): Promise<string | null>; setItem(key, value): Promise<void>; removeItem(key): Promise<void> }`.
  - `storage: Storage` (implementación por defecto, AsyncStorage) y `createMemoryStorage(): Storage` desde `@/services/storage`.
  - `STORAGE_KEYS.accessToken`, `STORAGE_KEYS.user`, `STORAGE_KEYS.favorites`.

- [ ] **Step 1: Instalar AsyncStorage**

```bash
npm install @react-native-async-storage/async-storage
cd ios && pod install && cd ..
```

- [ ] **Step 2: Escribir el contrato de la API**

`src/services/api/types.ts`:

```ts
export const CATEGORIES = ['audio', 'wearables', 'computers', 'gaming', 'home'] as const;

export type Category = (typeof CATEGORIES)[number];

export type SortOption = 'name' | 'price_asc' | 'price_desc';

export interface Product {
  id: string;
  name: string;
  description: string;
  /** En centavos, entero. Ver src/utils/formatPrice.ts. */
  priceCents: number;
  category: Category;
  rating: number;
  stock: number;
  imageUrl: string;
}

export interface ProductsPage {
  items: Product[];
  /** `null` cuando no hay más páginas. */
  nextCursor: string | null;
  total: number;
}

/** Argumentos de cache de la infiniteQuery de productos. */
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

- [ ] **Step 3: Escribir la config de la API**

`src/services/api/config.ts`:

```ts
/**
 * Host ficticio: no existe ningún servidor detrás. MSW intercepta a nivel de red
 * tanto en dev como en tests, así que la app hace HTTP real contra esta URL y no
 * sabe que está mockeada. El día que exista un backend, cambia solo esta línea.
 */
export const API_BASE_URL = 'http://localhost:3000/api';

export const PAGE_SIZE = 10;
```

- [ ] **Step 4: Escribir la interfaz de storage y las claves**

`src/services/storage/types.ts`:

```ts
/**
 * Fachada mínima sobre el almacenamiento persistente. Existe para que el
 * reemplazo de AsyncStorage por react-native-keychain sea un solo archivo
 * (ADR-003) y para poder inyectar una implementación en memoria en los tests.
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

- [ ] **Step 5: Escribir el test que falla del storage en memoria**

`src/services/storage/__tests__/memoryStorage.test.ts`:

```ts
import {createMemoryStorage} from '../memoryStorage';

describe('createMemoryStorage', () => {
  it('devuelve null para una clave que no existe', async () => {
    const storage = createMemoryStorage();
    await expect(storage.getItem('ausente')).resolves.toBeNull();
  });

  it('guarda y lee un valor', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await expect(storage.getItem('token')).resolves.toBe('abc');
  });

  it('sobrescribe un valor existente', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.setItem('token', 'def');
    await expect(storage.getItem('token')).resolves.toBe('def');
  });

  it('borra un valor', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.removeItem('token');
    await expect(storage.getItem('token')).resolves.toBeNull();
  });

  it('aísla instancias distintas', async () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage();
    await a.setItem('token', 'abc');
    await expect(b.getItem('token')).resolves.toBeNull();
  });
});
```

- [ ] **Step 6: Correr el test y verificar que falla**

Run: `npx jest src/services/storage --no-coverage`
Expected: FAIL — `Cannot find module '../memoryStorage'`.

- [ ] **Step 7: Implementar las dos implementaciones de `Storage`**

`src/services/storage/memoryStorage.ts`:

```ts
import type {Storage} from './types';

/** Implementación para tests: sin efectos de módulo, aislada por instancia. */
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
 * ADR-003: en producción esto debería ser react-native-keychain (Keychain en iOS,
 * EncryptedSharedPreferences en Android). Se eligió AsyncStorage para no sumar
 * dependencias nativas. El tradeoff está declarado en el README; el reemplazo
 * afecta únicamente a este archivo.
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

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `npx jest src/services/storage --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 9: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: contrato de API y servicio de storage detrás de una interfaz"
```

---

## Task 3: Base de datos mock

**Files:**
- Create: `src/mocks/db.ts`
- Test: `src/mocks/__tests__/db.test.ts`

**Interfaces:**
- Consumes: `Category`, `Product`, `ProductsPage`, `SortOption` de `@/services/api/types`; `PAGE_SIZE` de `@/services/api/config`.
- Produces:
  - `PRODUCTS: Product[]` (50 productos deterministas, 5 categorías × 10).
  - `queryProducts(params: QueryProductsParams): ProductsPage`
  - `findProduct(id: string): Product | undefined`
  - `DEMO_USER: User`, `DEMO_PASSWORD: string`
  - `interface QueryProductsParams { q?: string; category?: Category | 'all'; sort?: SortOption; cursor?: string | null; limit?: number }`

- [ ] **Step 1: Escribir el test que falla del dataset y la búsqueda**

`src/mocks/__tests__/db.test.ts`:

```ts
import {CATEGORIES} from '@/services/api/types';

import {findProduct, PRODUCTS, queryProducts} from '../db';

describe('PRODUCTS', () => {
  it('tiene 50 productos', () => {
    expect(PRODUCTS).toHaveLength(50);
  });

  it('tiene ids únicos', () => {
    const ids = new Set(PRODUCTS.map(p => p.id));
    expect(ids.size).toBe(PRODUCTS.length);
  });

  it('cubre las 5 categorías con 10 productos cada una', () => {
    for (const category of CATEGORIES) {
      expect(PRODUCTS.filter(p => p.category === category)).toHaveLength(10);
    }
  });
});

describe('queryProducts', () => {
  it('devuelve la primera página con el tamaño pedido', () => {
    const page = queryProducts({limit: 10});
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
    expect(page.nextCursor).not.toBeNull();
  });

  it('pagina por cursor sin repetir elementos', () => {
    const first = queryProducts({limit: 10});
    const second = queryProducts({limit: 10, cursor: first.nextCursor});
    const firstIds = first.items.map(p => p.id);
    const secondIds = second.items.map(p => p.id);
    expect(secondIds).toHaveLength(10);
    expect(firstIds.some(id => secondIds.includes(id))).toBe(false);
  });

  it('devuelve nextCursor null en la última página', () => {
    const page = queryProducts({limit: 50});
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toBeNull();
  });

  it('filtra por categoría', () => {
    const page = queryProducts({category: 'audio', limit: 50});
    expect(page.total).toBe(10);
    expect(page.items.every(p => p.category === 'audio')).toBe(true);
  });

  it('busca por nombre sin distinguir mayúsculas', () => {
    const page = queryProducts({q: 'nimbus', limit: 50});
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every(p => /nimbus/i.test(p.name) || /nimbus/i.test(p.description))).toBe(true);
  });

  it('devuelve una página vacía cuando no hay coincidencias', () => {
    const page = queryProducts({q: 'zzzznoexiste', limit: 50});
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.nextCursor).toBeNull();
  });

  it('ordena por precio ascendente', () => {
    const {items} = queryProducts({sort: 'price_asc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('ordena por precio descendente', () => {
    const {items} = queryProducts({sort: 'price_desc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it('ordena por nombre alfabéticamente por defecto', () => {
    const {items} = queryProducts({limit: 50});
    const names = items.map(p => p.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(names);
  });

  it('combina búsqueda, filtro y orden', () => {
    const page = queryProducts({q: 'a', category: 'gaming', sort: 'price_desc', limit: 50});
    expect(page.items.every(p => p.category === 'gaming')).toBe(true);
    const prices = page.items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });
});

describe('findProduct', () => {
  it('encuentra un producto por id', () => {
    const first = PRODUCTS[0];
    expect(first).toBeDefined();
    expect(findProduct(first!.id)).toEqual(first);
  });

  it('devuelve undefined para un id inexistente', () => {
    expect(findProduct('no-existe')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx jest src/mocks --no-coverage`
Expected: FAIL — `Cannot find module '../db'`.

- [ ] **Step 3: Implementar `db.ts`**

`src/mocks/db.ts`:

```ts
import {PAGE_SIZE} from '@/services/api/config';
import {CATEGORIES} from '@/services/api/types';
import type {Category, Product, ProductsPage, SortOption, User} from '@/services/api/types';

const BASE_NAMES: Record<Category, string> = {
  audio: 'Auriculares',
  wearables: 'Smartwatch',
  computers: 'Notebook',
  gaming: 'Gamepad',
  home: 'Lámpara',
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
 * Dataset determinista: mismos datos en cada corrida y en cada máquina, para que
 * los tests no dependan de un seed aleatorio y la demo sea reproducible.
 */
export const PRODUCTS: Product[] = CATEGORIES.flatMap((category, categoryIndex) =>
  VARIANTS.map((variant, variantIndex) => {
    const index = categoryIndex * VARIANTS.length + variantIndex;
    return {
      id: `p-${String(index + 1).padStart(3, '0')}`,
      name: `${BASE_NAMES[category]} ${variant}`,
      description: `${BASE_NAMES[category]} ${variant} de la línea ${category}, edición ${2020 + (variantIndex % 6)}.`,
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
      return (a, b) => a.name.localeCompare(b.name, 'es');
  }
}

/**
 * Paginado por cursor (el id del último elemento devuelto) en vez de por offset:
 * es lo que hace un backend real y evita saltos cuando el dataset cambia entre
 * páginas. Si el cursor no se encuentra, se empieza desde el principio.
 */
export function queryProducts(params: QueryProductsParams = {}): ProductsPage {
  const {q = '', category = 'all', sort = 'name', cursor = null, limit = PAGE_SIZE} = params;

  const needle = q.trim().toLowerCase();
  const matching = PRODUCTS.filter(product => {
    const matchesCategory = category === 'all' || product.category === category;
    const matchesQuery =
      needle === '' ||
      product.name.toLowerCase().includes(needle) ||
      product.description.toLowerCase().includes(needle);
    return matchesCategory && matchesQuery;
  }).sort(compare(sort));

  const start = cursor === null ? 0 : Math.max(matching.findIndex(p => p.id === cursor) + 1, 0);
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

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx jest src/mocks --no-coverage`
Expected: PASS, 15 tests.

- [ ] **Step 5: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: base de datos mock con búsqueda, filtro, orden y paginado por cursor"
```

---

## Task 4: Handlers de MSW y arranque en tests y en dev

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
- Consumes: `queryProducts`, `findProduct`, `DEMO_USER`, `DEMO_PASSWORD` de `../db`; `API_BASE_URL`, `PAGE_SIZE` de `@/services/api/config`.
- Produces:
  - `handlers: RequestHandler[]` desde `@/mocks/handlers`
  - `server` (msw/node) desde `@/mocks/server.node`
  - `startMockServer(): Promise<void>` desde `@/mocks/server.native`
  - Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/products`, `GET /api/products/:id`. Query params de `/products`: `q`, `category`, `sort`, `cursor`, `limit`, `fail`.
  - Token emitido en login: `'demo-access-token'`.

- [ ] **Step 1: Instalar MSW y sus polyfills de RN**

```bash
npm install --save-dev msw@2.15
npm install react-native-url-polyfill fast-text-encoding
```

- [ ] **Step 2: Escribir el test que falla de los handlers**

`src/mocks/__tests__/handlers.test.ts`:

```ts
import {API_BASE_URL} from '@/services/api/config';
import type {LoginResponse, Product, ProductsPage} from '@/services/api/types';

import {DEMO_PASSWORD, DEMO_USER} from '../db';

describe('handlers de auth', () => {
  it('devuelve token y usuario con credenciales válidas', async () => {
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

  it('devuelve 401 con credenciales inválidas', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: DEMO_USER.email, password: 'incorrecta'}),
    });
    expect(response.status).toBe(401);
  });

  it('GET /auth/me devuelve 401 sin Authorization', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`);
    expect(response.status).toBe(401);
  });

  it('GET /auth/me devuelve el usuario con un token válido', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {Authorization: 'Bearer demo-access-token'},
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEMO_USER);
  });
});

describe('handlers de productos', () => {
  it('devuelve una página de productos', async () => {
    const response = await fetch(`${API_BASE_URL}/products?limit=10`);
    expect(response.status).toBe(200);
    const page = (await response.json()) as ProductsPage;
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
  });

  it('respeta el filtro de categoría', async () => {
    const response = await fetch(`${API_BASE_URL}/products?category=audio&limit=50`);
    const page = (await response.json()) as ProductsPage;
    expect(page.total).toBe(10);
  });

  it('devuelve un producto por id', async () => {
    const response = await fetch(`${API_BASE_URL}/products/p-001`);
    expect(response.status).toBe(200);
    const product = (await response.json()) as Product;
    expect(product.id).toBe('p-001');
  });

  it('devuelve 404 para un producto inexistente', async () => {
    const response = await fetch(`${API_BASE_URL}/products/no-existe`);
    expect(response.status).toBe(404);
  });

  it('inyecta un 500 con ?fail=1', async () => {
    const response = await fetch(`${API_BASE_URL}/products?fail=1`);
    expect(response.status).toBe(500);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npx jest src/mocks/__tests__/handlers --no-coverage`
Expected: FAIL — el `fetch` no está interceptado (error de conexión a `localhost:3000`) o `Cannot find module`.

- [ ] **Step 4: Escribir los handlers de auth**

`src/mocks/handlers/auth.ts`:

```ts
import {delay, http, HttpResponse} from 'msw';

import {API_BASE_URL} from '@/services/api/config';
import type {ApiErrorBody, LoginRequest, LoginResponse, User} from '@/services/api/types';

import {DEMO_PASSWORD, DEMO_USER} from '../db';

export const ACCESS_TOKEN = 'demo-access-token';

/**
 * Latencia artificial solo fuera de los tests: en la demo hace visibles los
 * skeletons y los estados de carga; en Jest solo haría los tests más lentos.
 */
const withLatency = process.env.NODE_ENV !== 'test';

async function maybeDelay(): Promise<void> {
  if (withLatency) {
    await delay(300 + Math.floor(Math.random() * 300));
  }
}

export const authHandlers = [
  http.post<never, LoginRequest>(`${API_BASE_URL}/auth/login`, async ({request}) => {
    const {email, password} = await request.json();
    await maybeDelay();

    if (email.trim().toLowerCase() !== DEMO_USER.email || password !== DEMO_PASSWORD) {
      return HttpResponse.json<ApiErrorBody>({message: 'Credenciales inválidas'}, {status: 401});
    }

    return HttpResponse.json<LoginResponse>({accessToken: ACCESS_TOKEN, user: DEMO_USER});
  }),

  http.get(`${API_BASE_URL}/auth/me`, async ({request}) => {
    await maybeDelay();

    if (request.headers.get('Authorization') !== `Bearer ${ACCESS_TOKEN}`) {
      return HttpResponse.json<ApiErrorBody>({message: 'No autorizado'}, {status: 401});
    }

    return HttpResponse.json<User>(DEMO_USER);
  }),
];
```

- [ ] **Step 5: Escribir los handlers de productos**

`src/mocks/handlers/products.ts`:

```ts
import {delay, http, HttpResponse} from 'msw';

import {API_BASE_URL, PAGE_SIZE} from '@/services/api/config';
import {CATEGORIES} from '@/services/api/types';
import type {ApiErrorBody, Category, Product, ProductsPage, SortOption} from '@/services/api/types';

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

    // Inyección de fallos para demostrar el manejo de errores en vivo.
    if (url.searchParams.get('fail') === '1') {
      return HttpResponse.json<ApiErrorBody>({message: 'Fallo inyectado'}, {status: 500});
    }

    const limitParam = Number(url.searchParams.get('limit'));
    const page = queryProducts({
      q: url.searchParams.get('q') ?? '',
      category: parseCategory(url.searchParams.get('category')),
      sort: parseSort(url.searchParams.get('sort')),
      cursor: url.searchParams.get('cursor'),
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : PAGE_SIZE,
    });

    return HttpResponse.json<ProductsPage>(page);
  }),

  http.get<{id: string}>(`${API_BASE_URL}/products/:id`, async ({params}) => {
    await maybeDelay();
    const product = findProduct(params.id);

    if (!product) {
      return HttpResponse.json<ApiErrorBody>({message: 'Producto no encontrado'}, {status: 404});
    }

    return HttpResponse.json<Product>(product);
  }),
];
```

- [ ] **Step 6: Escribir el barril de handlers**

`src/mocks/handlers/index.ts`:

```ts
import {authHandlers} from './auth';
import {productHandlers} from './products';

/**
 * Única fuente de verdad del contrato de API: los mismos handlers alimentan la
 * app en desarrollo (msw/native) y los tests (msw/node).
 */
export const handlers = [...authHandlers, ...productHandlers];

export {ACCESS_TOKEN} from './auth';
```

- [ ] **Step 7: Escribir los dos arranques del servidor**

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
  // 'bypass': las imágenes remotas las pide el módulo nativo de Image, no el
  // fetch de JS, pero cualquier request no manejada no debe romper la demo.
  server.listen({onUnhandledRequest: 'bypass'});
}
```

- [ ] **Step 8: Conectar MSW a los tests**

`src/test/setup.ts`:

```ts
import {server} from '@/mocks/server.node';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock'),
);

// 'error' obliga a que todo request de un test esté explícitamente mockeado:
// un endpoint nuevo sin handler falla en vez de colgarse.
beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

> `react-native-safe-area-context` todavía no está instalado (llega en la Task 6). Hasta entonces, dejar comentado ese `jest.mock` y descomentarlo en la Task 6. Si al correr esta task el mock rompe, comentarlo es la acción correcta, no borrar el archivo.

- [ ] **Step 9: Correr el test de handlers y verificar que pasa**

Run: `npx jest src/mocks/__tests__/handlers --no-coverage`
Expected: PASS, 9 tests.

**Si falla con errores de resolución de módulos de `msw`:** el `transformIgnorePatterns` de `jest.config.js` (Task 1, Step 12) debe incluir el paquete que aparece en el error. Agregarlo a la lista y volver a correr.

- [ ] **Step 10: Escribir los polyfills de RN**

`msw.polyfills.js` (en la raíz):

```js
import 'fast-text-encoding';
import 'react-native-url-polyfill/auto';
```

- [ ] **Step 11: Arrancar MSW en la app en dev**

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

> `src/app/App.tsx` todavía no existe: se crea en la Task 5. Hasta entonces, dejar `index.js` apuntando al `App.tsx` del template y cambiar el import en la Task 5.

- [ ] **Step 12: Verificar la intercepción en el dispositivo — punto de decisión de ADR-005**

Agregar temporalmente en el `App.tsx` del template, dentro de un `useEffect`:

```tsx
useEffect(() => {
  fetch('http://localhost:3000/api/products?limit=1')
    .then(r => r.json())
    .then(d => console.warn('MSW OK', d))
    .catch(e => console.warn('MSW FALLO', e));
}, []);
```

Run: `npm run ios`
Expected: en la consola de Metro aparece `MSW OK` con un producto.

**Si aparece `MSW FALLO`** (la documentación de MSW marca la integración con React Native como "potentially incomplete"): aplicar el fallback y anotarlo en el ADR-005 del README —

1. MSW **se mantiene tal cual para los tests** (`msw/node` funciona sin problemas bajo Jest). El valor de "una sola fuente de verdad del contrato" se conserva.
2. Para dev, reemplazar `startMockServer` por un shim de `fetch` que enruta contra el mismo `db.ts`, instalado como efecto del entrypoint (fuera de `src/features` y `src/services`, así el código de la app sigue sin ninguna rama de mocking):

```ts
// src/mocks/server.native.ts — variante de fallback
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
      const result = await handler.run({request, requestId: String(Date.now())});
      if (result?.response) {
        return result.response;
      }
    }
    return original(input, init);
  };
}
```

Borrar el `useEffect` temporal antes de commitear, en cualquiera de los dos caminos.

- [ ] **Step 13: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: handlers MSW compartidos entre la app en dev y los tests"
```

---

## Task 5: Store, baseApi y hooks tipados

**Files:**
- Create: `src/services/api/sessionEvents.ts`
- Create: `src/services/api/baseApi.ts`
- Create: `src/app/listenerMiddleware.ts`
- Create: `src/app/store.ts`
- Create: `src/app/hooks.ts`
- Create: `src/app/App.tsx`
- Create: `src/test/renderWithProviders.tsx`
- Modify: `index.js` (apuntar a `src/app/App`)
- Test: `src/services/api/__tests__/baseApi.test.ts`

**Interfaces:**
- Consumes: `API_BASE_URL` de `@/services/api/config`; `handlers` de `@/mocks/handlers`.
- Produces:
  - `unauthorized` (action creator sin payload) desde `@/services/api/sessionEvents`
  - `baseApi` (con `injectEndpoints`, `tagTypes: ['Product', 'User']`, `reducerPath: 'api'`) desde `@/services/api/baseApi`
  - `listenerMiddleware`, `startAppListening` desde `@/app/listenerMiddleware`
  - `makeStore(preloadedState?: Partial<RootState>): AppStore`, `store`, `RootState`, `AppDispatch`, `AppStore` desde `@/app/store`
  - `useAppDispatch()`, `useAppSelector` desde `@/app/hooks`
  - `renderWithProviders(ui, {preloadedState?, store?})` → `{store, ...RenderResult}` desde `@/test/renderWithProviders`

- [ ] **Step 1: Instalar Redux**

```bash
npm install @reduxjs/toolkit react-redux
```

- [ ] **Step 2: Escribir el evento de sesión neutral**

`src/services/api/sessionEvents.ts`:

```ts
import {createAction} from '@reduxjs/toolkit';

/**
 * La capa de servicios no puede importar de features (regla de dependencias del
 * spec §3.1), pero necesita avisar que la sesión caducó al recibir un 401.
 * Este action creator neutral invierte la dependencia: services lo despacha,
 * sessionSlice lo escucha.
 */
export const unauthorized = createAction('session/unauthorized');
```

- [ ] **Step 3: Escribir el `baseApi`**

`src/services/api/baseApi.ts`:

```ts
import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {BaseQueryFn, FetchArgs, FetchBaseQueryError} from '@reduxjs/toolkit/query/react';

import {API_BASE_URL} from './config';
import {unauthorized} from './sessionEvents';

/**
 * Se tipa solo el trozo del estado que hace falta en vez de importar RootState:
 * store.ts importa baseApi, así que importar RootState acá sería un ciclo.
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

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(unauthorized());
  }
  return result;
};

/**
 * Una sola API para toda la app. Cada feature agrega sus endpoints con
 * `baseApi.injectEndpoints`, así el cache y los tags son compartidos sin que las
 * features se conozcan entre sí.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Product', 'User'],
  endpoints: () => ({}),
});
```

- [ ] **Step 4: Escribir el listener middleware tipado**

`src/app/listenerMiddleware.ts`:

```ts
import {createListenerMiddleware} from '@reduxjs/toolkit';

import type {AppDispatch, RootState} from './store';

export const listenerMiddleware = createListenerMiddleware();

/**
 * `withTypes` evita repetir los genéricos en cada listener. El import de
 * RootState/AppDispatch es solo de tipos, así que no crea un ciclo en runtime.
 */
export const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

export type AppStartListening = typeof startAppListening;
```

- [ ] **Step 5: Escribir el store**

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

> Los slices se van agregando a `rootReducer` en las tasks siguientes: `auth` (Task 7), `catalog` (Task 10), `favorites` (Task 13).

- [ ] **Step 6: Escribir los hooks tipados**

`src/app/hooks.ts`:

```ts
import {useDispatch, useSelector} from 'react-redux';

import type {AppDispatch, RootState} from './store';

/** Nunca se usa `useDispatch`/`useSelector` crudos en la app: siempre estos. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

- [ ] **Step 7: Escribir el `App.tsx` de composición**

`src/app/App.tsx`:

```tsx
import React from 'react';
import {Provider} from 'react-redux';

import {store} from './store';

export default function App() {
  return <Provider store={store}>{null}</Provider>;
}
```

> El árbol de navegación entra en la Task 9. Este archivo es el punto de composición de providers y crece ahí.

- [ ] **Step 8: Apuntar `index.js` a `src/app/App`**

Cambiar en `index.js` el import del componente raíz por `import App from './src/app/App';` y borrar el `App.tsx` del template en la raíz si existe.

- [ ] **Step 9: Escribir el helper de tests**

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
 * Store fresco por test: el cache de RTK Query es estado global, y compartirlo
 * entre tests los vuelve dependientes del orden de ejecución.
 */
export function renderWithProviders(
  ui: ReactElement,
  {preloadedState, store = makeStore(preloadedState)}: ExtendedRenderOptions = {},
) {
  function Wrapper({children}: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {store, ...render(ui, {wrapper: Wrapper})};
}
```

> El `NavigationContainer` se agrega a este wrapper en la Task 9, cuando exista.

- [ ] **Step 10: Escribir el test que falla del baseApi**

`src/services/api/__tests__/baseApi.test.ts`:

```ts
import {makeStore} from '@/app/store';
import {ACCESS_TOKEN} from '@/mocks/handlers';

import {baseApi} from '../baseApi';
import {unauthorized} from '../sessionEvents';

const probeApi = baseApi.injectEndpoints({
  endpoints: build => ({
    probeMe: build.query<{id: string}, void>({query: () => '/auth/me'}),
  }),
  overrideExisting: true,
});

describe('baseApi', () => {
  it('inyecta el Authorization header desde el store', async () => {
    const store = makeStore({session: {status: 'signedIn', accessToken: ACCESS_TOKEN, user: null}});
    const result = await store.dispatch(probeApi.endpoints.probeMe.initiate());
    expect(result.data).toBeDefined();
  });

  it('despacha `unauthorized` cuando la respuesta es 401', async () => {
    const store = makeStore();
    const dispatched: string[] = [];
    store.subscribe(() => {});
    const originalDispatch = store.dispatch;
    jest.spyOn(store, 'dispatch').mockImplementation((action: unknown) => {
      if (typeof action === 'object' && action !== null && 'type' in action) {
        dispatched.push(String((action as {type: unknown}).type));
      }
      return originalDispatch(action as never);
    });

    await store.dispatch(probeApi.endpoints.probeMe.initiate());
    expect(dispatched).toContain(unauthorized.type);
  });
});
```

> Este test depende del slice `auth` (Task 7) para el `preloadedState`. **Escribirlo en la Task 7, no acá.** En la Task 5 solo se verifica que el store se construye: reemplazar este archivo por el del Step 11 y traer estos dos casos en la Task 7, Step 9.

- [ ] **Step 11: Escribir el test real de esta task**

`src/services/api/__tests__/baseApi.test.ts`:

```ts
import {makeStore} from '@/app/store';

import {baseApi} from '../baseApi';

describe('store', () => {
  it('monta el reducer de la API bajo la clave `api`', () => {
    const store = makeStore();
    expect(store.getState()).toHaveProperty(baseApi.reducerPath);
  });

  it('crea stores independientes', () => {
    expect(makeStore()).not.toBe(makeStore());
  });
});
```

- [ ] **Step 12: Correr el test y verificar que pasa**

Run: `npx jest src/services/api --no-coverage`
Expected: PASS, 2 tests.

- [ ] **Step 13: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: store de Redux, baseApi con auth y 401, y hooks tipados"
```

---

## Task 6: Theme tokens y componentes de UI

**Files:**
- Create: `src/theme/tokens.ts`
- Create: `src/components/ui/Screen.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/TextField.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/ErrorView.tsx`
- Create: `src/components/ui/Skeleton.tsx`
- Create: `src/components/ui/index.ts`
- Modify: `src/test/setup.ts` (descomentar el mock de safe-area-context)
- Test: `src/components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Consumes: nada de tasks previas.
- Produces desde `@/components/ui`:
  - `<Screen>{children}</Screen>` — `{children: ReactNode; scroll?: boolean}`
  - `<Button title label onPress disabled loading testID />` — `{label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'ghost'; testID?: string}`
  - `<TextField />` — `{label: string; value: string; onChangeText: (t: string) => void; error?: string; ...TextInputProps}`
  - `<EmptyState />` — `{title: string; message?: string}`
  - `<ErrorView />` — `{message: string; onRetry?: () => void}`
  - `<Skeleton />` — `{height: number; width?: number | string; style?: ViewStyle}`
  - `tokens` desde `@/theme/tokens` con `colors`, `spacing`, `radius`, `typography`.

- [ ] **Step 1: Instalar las dependencias de layout**

```bash
npm install react-native-safe-area-context
cd ios && pod install && cd ..
```

- [ ] **Step 2: Descomentar el mock de safe-area-context**

En `src/test/setup.ts`, activar el `jest.mock('react-native-safe-area-context', ...)` que quedó comentado en la Task 4, Step 8.

- [ ] **Step 3: Escribir los tokens**

`src/theme/tokens.ts`:

```ts
/**
 * Constantes, no theming en runtime. El dark mode es un no-objetivo declarado
 * del spec: agregarlo significaría un ThemeProvider y un hook, no cambiar esto.
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

- [ ] **Step 4: Escribir `Screen`**

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
      <Container style={styles.content} contentContainerStyle={scroll ? styles.scroll : undefined}>
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

- [ ] **Step 5: Escribir el test que falla de `Button`**

`src/components/ui/__tests__/Button.test.tsx`:

```tsx
import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {Button} from '../Button';

describe('Button', () => {
  it('llama a onPress al tocarlo', () => {
    const onPress = jest.fn();
    render(<Button label="Ingresar" onPress={onPress} />);
    fireEvent.press(screen.getByText('Ingresar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama a onPress cuando está deshabilitado', () => {
    const onPress = jest.fn();
    render(<Button label="Ingresar" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Ingresar'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('muestra un indicador y oculta el label mientras carga', () => {
    render(<Button label="Ingresar" onPress={jest.fn()} loading testID="submit" />);
    expect(screen.queryByText('Ingresar')).toBeNull();
    expect(screen.getByTestId('submit')).toBeDisabled();
  });
});
```

- [ ] **Step 6: Correr el test y verificar que falla**

Run: `npx jest src/components --no-coverage`
Expected: FAIL — `Cannot find module '../Button'`.

- [ ] **Step 7: Escribir `Button`**

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
        <ActivityIndicator color={variant === 'primary' ? colors.primaryText : colors.primary} />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>{label}</Text>
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
  ghost: {backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border},
  dimmed: {opacity: 0.6},
  label: {...typography.body, fontWeight: '600', color: colors.primaryText},
  ghostLabel: {color: colors.primary},
});
```

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `npx jest src/components --no-coverage`
Expected: PASS, 3 tests.

- [ ] **Step 9: Escribir `TextField`**

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

export function TextField({label, value, onChangeText, error, ...rest}: TextFieldProps) {
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

- [ ] **Step 10: Escribir `EmptyState`, `ErrorView` y `Skeleton`**

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
      {onRetry != null && <Button label="Reintentar" onPress={onRetry} variant="ghost" testID="retry" />}
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
  return <View accessibilityRole="progressbar" style={[styles.base, {height, width}, style]} />;
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

- [ ] **Step 11: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: tokens de diseño y componentes de UI compartidos"
```

---

## Task 7: Sesión — slice, api y persistencia

**Files:**
- Create: `src/services/session/sessionApi.ts`
- Create: `src/services/session/sessionSlice.ts`
- Create: `src/services/session/sessionListeners.ts`
- Create: `src/services/session/useSession.ts`
- Create: `src/services/session/index.ts`
- Modify: `src/app/store.ts` (montar el reducer `session` y registrar los listeners)
- Test: `src/services/session/__tests__/sessionSlice.test.ts`
- Test: `src/services/api/__tests__/baseApi.test.ts` (agregar los dos casos diferidos de la Task 5)

**Interfaces:**
- Consumes: `baseApi` y `unauthorized` de `@/services/api/*`; `storage`, `STORAGE_KEYS`, `Storage` de `@/services/storage`; `LoginRequest`, `LoginResponse`, `User` de `@/services/api/types`; `AppStartListening` de `@/app/listenerMiddleware`.
- Produces:
  - `sessionApi` con `useLoginMutation()` y `useMeQuery()`; `sessionApi.endpoints.login.matchFulfilled`
  - `sessionReducer` (default export del slice), `signedOut`, `sessionRestored`, `sessionMissing` actions
  - `restoreSession(deps?: {storage?: Storage})` — thunk que hidrata la sesión desde storage
  - `signOut()` — thunk que limpia slice, storage y cache de RTK Query
  - `SessionState = {status: 'bootstrapping' | 'signedOut' | 'signedIn'; accessToken: string | null; user: User | null}`
  - `registerSessionListeners(startAppListening: AppStartListening): void`
  - `useSession()` → `{status, user, signIn, signOut, isSigningIn, error}`

> **Por qué la sesión vive en `services/` y no en `features/auth/`:** el estado de
> sesión lo consumen `navigation` (para decidir Auth vs. App), la feature `profile`
> (datos del usuario y logout) y la capa de API (el 401). Si viviera dentro de la
> feature `auth`, esos consumidores tendrían que importar de otra feature, que es
> justo lo que la regla de dependencias prohíbe. La feature `auth` conserva lo que
> es genuinamente suyo: la pantalla de login (Task 8). Es la regla del spec §3.1
> haciendo su trabajo — obliga a decidir explícitamente qué es de una feature y qué
> es transversal.

- [ ] **Step 1: Escribir el test que falla del slice**

`src/services/session/__tests__/sessionSlice.test.ts`:

```ts
import {unauthorized} from '@/services/api/sessionEvents';
import {createMemoryStorage, STORAGE_KEYS} from '@/services/storage';
import type {User} from '@/services/api/types';

import {sessionApi} from '../sessionApi';
import sessionReducer, {restoreSession, sessionMissing, sessionRestored, signedOut} from '../sessionSlice';
import type {SessionState} from '../sessionSlice';

const USER: User = {id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'};

const initial: SessionState = {status: 'bootstrapping', accessToken: null, user: null};

describe('sessionSlice', () => {
  it('arranca en bootstrapping', () => {
    expect(sessionReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('pasa a signedIn al restaurar una sesión', () => {
    const state = sessionReducer(initial, sessionRestored({accessToken: 'tok', user: USER}));
    expect(state).toEqual({status: 'signedIn', accessToken: 'tok', user: USER});
  });

  it('pasa a signedOut cuando no hay sesión guardada', () => {
    expect(sessionReducer(initial, sessionMissing()).status).toBe('signedOut');
  });

  it('pasa a signedIn cuando el login se resuelve', () => {
    const action = {
      type: sessionApi.endpoints.login.matchFulfilled.toString(),
      payload: {accessToken: 'tok', user: USER},
      meta: {arg: {endpointName: 'login'}, requestId: 'r1', requestStatus: 'fulfilled'},
    };
    const state = sessionReducer(initial, action);
    expect(state.status).toBe('signedIn');
    expect(state.accessToken).toBe('tok');
  });

  it('limpia token y usuario en signedOut', () => {
    const signedIn: SessionState = {status: 'signedIn', accessToken: 'tok', user: USER};
    expect(sessionReducer(signedIn, signedOut())).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });

  it('limpia la sesión cuando la API responde 401', () => {
    const signedIn: SessionState = {status: 'signedIn', accessToken: 'tok', user: USER};
    expect(sessionReducer(signedIn, unauthorized())).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });
});

describe('restoreSession', () => {
  it('restaura la sesión guardada', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.accessToken, 'tok');
    await storage.setItem(STORAGE_KEYS.user, JSON.stringify(USER));

    const dispatched: string[] = [];
    const thunk = restoreSession({storage});
    await thunk(
      action => {
        dispatched.push(typeof action === 'object' && action !== null && 'type' in action ? String(action.type) : '');
        return action;
      },
      () => ({}),
      undefined,
    );

    expect(dispatched).toContain(sessionRestored.type);
  });

  it('marca la sesión como ausente cuando no hay token', async () => {
    const storage = createMemoryStorage();
    const dispatched: string[] = [];
    const thunk = restoreSession({storage});
    await thunk(
      action => {
        dispatched.push(typeof action === 'object' && action !== null && 'type' in action ? String(action.type) : '');
        return action;
      },
      () => ({}),
      undefined,
    );

    expect(dispatched).toContain(sessionMissing.type);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx jest src/services/session --no-coverage`
Expected: FAIL — `Cannot find module '../sessionApi'`.

- [ ] **Step 3: Escribir `sessionApi`**

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

- [ ] **Step 4: Escribir `sessionSlice`**

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
    sessionRestored(state, action: PayloadAction<{accessToken: string; user: User}>) {
      state.status = 'signedIn';
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    sessionMissing: clear,
    signedOut: clear,
  },
  extraReducers: builder => {
    builder
      // El login exitoso no necesita una acción propia: el slice reacciona al
      // resultado de la mutación de RTK Query. Una sola fuente de verdad.
      .addMatcher(sessionApi.endpoints.login.matchFulfilled, (state, action) => {
        state.status = 'signedIn';
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(unauthorized, clear);
  },
});

export const {sessionMissing, sessionRestored, signedOut} = sessionSlice.actions;
export default sessionSlice.reducer;

/**
 * Bootstrap de sesión. `storage` se inyecta para poder testearlo sin AsyncStorage.
 * Se escribe como thunk a mano (no createAsyncThunk) porque no hay estados
 * pending/rejected que interesen: o hay sesión o no la hay.
 */
export function restoreSession({storage = defaultStorage}: {storage?: Storage} = {}) {
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
      dispatch(sessionRestored({accessToken: token, user: JSON.parse(rawUser) as User}));
    } catch {
      dispatch(sessionMissing());
    }
  };
}

/** Logout: limpia el slice, el storage y **todo** el cache de RTK Query. */
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

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx jest src/services/session --no-coverage`
Expected: PASS, 8 tests.

- [ ] **Step 6: Escribir los listeners de persistencia**

`src/services/session/sessionListeners.ts`:

```ts
import {unauthorized} from '@/services/api/sessionEvents';
import {storage, STORAGE_KEYS} from '@/services/storage';

import type {AppStartListening} from '@/app/listenerMiddleware';

import {sessionApi} from './sessionApi';
import {signedOut} from './sessionSlice';

/**
 * La persistencia vive en un listener y no dentro del reducer: los reducers
 * tienen que ser puros y síncronos, y escribir en AsyncStorage no es ninguna de
 * las dos cosas.
 */
export function registerSessionListeners(startAppListening: AppStartListening): void {
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

- [ ] **Step 7: Montar el reducer y los listeners en el store**

En `src/app/store.ts`, agregar `import {registerSessionListeners, sessionReducer} from '@/services/session';`, sumar `session: sessionReducer` a `rootReducer`, y al final del archivo:

```ts
registerSessionListeners(startAppListening);
```

importando `startAppListening` desde `./listenerMiddleware`. El registro se hace una sola vez a nivel de módulo, no por store: `startAppListening` está atado al middleware, que es compartido.

- [ ] **Step 8: Escribir el hook `useSession`**

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

- [ ] **Step 9: Escribir el barril del módulo**

`src/services/session/index.ts`:

```ts
export {default as sessionReducer} from './sessionSlice';
export {restoreSession, sessionMissing, sessionRestored, signedOut, signOut} from './sessionSlice';
export type {SessionState} from './sessionSlice';
export {sessionApi, useLoginMutation, useMeQuery} from './sessionApi';
export {registerSessionListeners} from './sessionListeners';
export {useSession} from './useSession';
```

- [ ] **Step 10: Traer los dos casos diferidos al test del baseApi**

Reemplazar `src/services/api/__tests__/baseApi.test.ts` por el contenido del Step 10 de la Task 5, que ahora sí compila porque el slice `auth` existe.

- [ ] **Step 11: Correr los tests y verificar que pasan**

Run: `npx jest src/services/session src/services/api --no-coverage`
Expected: PASS, 12 tests.

- [ ] **Step 12: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: sesión con slice, RTK Query y persistencia por listener"
```

---

## Task 8: LoginScreen

**Files:**
- Create: `src/features/auth/screens/LoginScreen.tsx`
- Test: `src/features/auth/__tests__/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `useSession` de `@/services/session`; `Button`, `Screen`, `TextField` de `@/components/ui`; `DEMO_PASSWORD`, `DEMO_USER` de `@/mocks/db` (solo bajo `__DEV__`).
- Produces: `<LoginScreen />` — sin props. testIDs: `login-email`, `login-password`, `login-submit`, `login-error`.

- [ ] **Step 1: Escribir el test que falla**

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
  it('muestra un error de formato cuando el email es inválido', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('no-es-un-email', 'password123');
    expect(await screen.findByText('Ingresá un email válido')).toBeVisible();
  });

  it('muestra un error cuando la contraseña es muy corta', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', '123');
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeVisible();
  });

  it('deja el estado en signedIn tras un login exitoso', async () => {
    const {store} = renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    await waitFor(() => expect(store.getState().session.status).toBe('signedIn'));
    expect(store.getState().session.accessToken).toBe('demo-access-token');
  });

  it('muestra un mensaje de credenciales inválidas ante un 401', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'incorrecta1');
    expect(await screen.findByTestId('login-error')).toHaveTextContent('Email o contraseña incorrectos');
  });

  it('diferencia el error de red del error de credenciales', async () => {
    server.use(http.post(`${API_BASE_URL}/auth/login`, () => HttpResponse.error()));
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo',
    );
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx jest src/features/auth/__tests__/LoginScreen --no-coverage`
Expected: FAIL — `Cannot find module '../screens/LoginScreen'`.

- [ ] **Step 3: Implementar `LoginScreen`**

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
    errors.email = 'Ingresá un email válido';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return errors;
}

/**
 * El error de red y el de credenciales se distinguen por la forma del error de
 * fetchBaseQuery: un 401 trae `status: 401`; una caída de red trae
 * `status: 'FETCH_ERROR'`. Mostrar "credenciales inválidas" ante un problema de
 * red es uno de los bugs de UX más comunes en apps móviles.
 */
function messageFor(error: unknown): string | null {
  if (error == null || typeof error !== 'object' || !('status' in error)) {
    return null;
  }
  const {status} = error as {status: unknown};
  if (status === 401) {
    return 'Email o contraseña incorrectos';
  }
  return 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo';
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
    // El estado de sesión lo actualiza sessionSlice al resolverse la mutación; acá
    // solo se ignora el rechazo, que ya se refleja en `error`.
    signIn(email.trim(), password).catch(() => {});
  }, [email, password, signIn]);

  const serverError = messageFor(error);

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text style={styles.title}>Catálogo</Text>

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
          label="Contraseña"
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

        <Button testID="login-submit" label="Ingresar" onPress={onSubmit} loading={isSigningIn} />

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

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx jest src/features/auth/__tests__/LoginScreen --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 5: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: pantalla de login con validación y errores diferenciados"
```

---

## Task 9: Navegación y bootstrap de sesión

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
- Modify: `src/test/renderWithProviders.tsx` (envolver en `NavigationContainer`)
- Test: `src/navigation/__tests__/RootNavigator.test.tsx`

**Interfaces:**
- Consumes: `useAppDispatch`, `useAppSelector`; `restoreSession` de `@/services/session`; `LoginScreen`.
- Produces desde `@/navigation/types`:
  - `AuthStackParamList = {Login: undefined}`
  - `CatalogStackParamList = {ProductList: undefined; ProductDetail: {productId: string}}`
  - `AppTabParamList = {CatalogTab: NavigatorScreenParams<CatalogStackParamList>; FavoritesTab: undefined; ProfileTab: undefined}`
  - `RootStackParamList = {Auth: NavigatorScreenParams<AuthStackParamList>; App: NavigatorScreenParams<AppTabParamList>}`
  - `ProductListScreenProps`, `ProductDetailScreenProps` (`NativeStackScreenProps<CatalogStackParamList, ...>`)
  - declaración global de `ReactNavigation.RootParamList`
- Produces: `<RootNavigator />` sin props.

- [ ] **Step 1: Instalar React Navigation**

```bash
npm install @react-navigation/native@7 @react-navigation/native-stack@7 @react-navigation/bottom-tabs@7 react-native-screens
cd ios && pod install && cd ..
```

- [ ] **Step 2: Escribir los tipos de navegación**

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

export type ProductListScreenProps = NativeStackScreenProps<CatalogStackParamList, 'ProductList'>;
export type ProductDetailScreenProps = NativeStackScreenProps<CatalogStackParamList, 'ProductDetail'>;
export type FavoritesScreenProps = BottomTabScreenProps<AppTabParamList, 'FavoritesTab'>;

/**
 * Registrar el ParamList raíz a nivel global hace que `navigation.navigate()`
 * y `useNavigation()` sean type-safe en toda la app sin importar tipos en cada
 * archivo. El costo es que solo puede haber un ParamList raíz por app.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

- [ ] **Step 3: Escribir las pantallas placeholder**

Las cuatro con la misma forma; se reemplazan en las tasks 12–15. Ejemplo para `src/features/catalog/screens/ProductListScreen.tsx`:

```tsx
import React from 'react';
import {Text} from 'react-native';

import {Screen} from '@/components/ui';

export function ProductListScreen() {
  return (
    <Screen>
      <Text>Catálogo</Text>
    </Screen>
  );
}
```

Repetir con `ProductDetailScreen` (texto `Detalle`), `FavoritesScreen` (texto `Favoritos`) y `ProfileScreen` (texto `Perfil`), cada una en la ruta indicada en **Files**.

- [ ] **Step 4: Escribir los navegadores**

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
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{title: 'Catálogo'}} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{title: 'Detalle'}} />
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
        options={{title: 'Catálogo', headerShown: false}}
      />
      <Tab.Screen name="FavoritesTab" component={FavoritesScreen} options={{title: 'Favoritos'}} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{title: 'Perfil'}} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Escribir el `RootNavigator` con bootstrap**

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

  // Splash mientras se lee el storage: montar el navegador antes de saber si hay
  // sesión provocaría un flash de la pantalla de login en cada arranque.
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
  splash: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background},
});
```

> Los dos grupos de pantallas son excluyentes por condicional en vez de por `navigate`: así no hay forma de volver al login con el gesto de atrás estando logueado, y el stack de auth se desmonta entero al entrar.

- [ ] **Step 6: Componer `App.tsx`**

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

- [ ] **Step 7: Envolver el helper de tests en `NavigationContainer`**

En `src/test/renderWithProviders.tsx`, cambiar el `Wrapper` por:

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

- [ ] **Step 8: Escribir el test del `RootNavigator`**

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

  it('muestra el splash antes de resolver el bootstrap', () => {
    renderWithProviders(<RootNavigator />);
    expect(screen.getByTestId('splash')).toBeVisible();
  });

  it('lleva al login cuando no hay sesión guardada', async () => {
    renderWithProviders(<RootNavigator />);
    expect(await screen.findByTestId('login-submit')).toBeVisible();
  });

  it('entra directo a la app cuando hay sesión guardada', async () => {
    await storage.setItem(STORAGE_KEYS.accessToken, 'demo-access-token');
    await storage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'}),
    );

    renderWithProviders(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('Catálogo')).toBeVisible());
  });
});
```

- [ ] **Step 9: Correr los tests**

Run: `npx jest src/navigation --no-coverage`
Expected: PASS, 3 tests.

**Si falla con errores de `react-native-screens`:** agregar a `src/test/setup.ts`:

```ts
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return {...actual, enableScreens: jest.fn()};
});
```

- [ ] **Step 10: Verificar en el simulador**

Run: `npm run ios`
Expected: arranca en splash, cae al login, y tras ingresar con las credenciales de demo aparecen los tabs.

- [ ] **Step 11: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: navegación tipada con bootstrap de sesión y tabs"
```

---

## Task 10: Feature catalog — api, slice y selectors

**Files:**
- Create: `src/features/catalog/catalogApi.ts`
- Create: `src/services/api/productsApi.ts`
- Create: `src/features/catalog/catalogSlice.ts`
- Create: `src/features/catalog/selectors.ts`
- Modify: `src/app/store.ts` (montar el reducer `catalog`)
- Test: `src/features/catalog/__tests__/catalogSlice.test.ts`
- Test: `src/features/catalog/__tests__/selectors.test.ts`
- Test: `src/features/catalog/__tests__/catalogApi.test.ts`
- Test: `src/services/api/__tests__/productsApi.test.ts`

**Interfaces:**
- Consumes: `baseApi`; `PAGE_SIZE`; `Product`, `ProductsPage`, `ProductsQueryArgs`, `Category`, `SortOption`; `RootState`.
- Produces:
  - `catalogApi` con `useGetProductsInfiniteQuery(args: ProductsQueryArgs)`
  - `productsApi` con `useGetProductQuery(id: string)` desde `@/services/api/productsApi`
  - `catalogReducer` (default), acciones `queryChanged(string)`, `categoryChanged(Category | 'all')`, `sortChanged(SortOption)`, `filtersReset()`
  - `CatalogState = {query: string; category: Category | 'all'; sort: SortOption}`
  - `selectProductsQueryArgs(state): ProductsQueryArgs` (memoizado con `createSelector`)
  - `selectHasActiveFilters(state): boolean`

- [ ] **Step 1: Escribir el test que falla del slice**

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
  it('tiene filtros vacíos por defecto', () => {
    expect(catalogReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('actualiza la query', () => {
    expect(catalogReducer(initial, queryChanged('nimbus')).query).toBe('nimbus');
  });

  it('actualiza la categoría', () => {
    expect(catalogReducer(initial, categoryChanged('audio')).category).toBe('audio');
  });

  it('actualiza el orden', () => {
    expect(catalogReducer(initial, sortChanged('price_desc')).sort).toBe('price_desc');
  });

  it('resetea todos los filtros', () => {
    const dirty: CatalogState = {query: 'x', category: 'gaming', sort: 'price_asc'};
    expect(catalogReducer(dirty, filtersReset())).toEqual(initial);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/features/catalog --no-coverage`
Expected: FAIL — `Cannot find module '../catalogSlice'`.

- [ ] **Step 3: Implementar el slice**

`src/features/catalog/catalogSlice.ts`:

```ts
import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import type {Category, SortOption} from '@/services/api/types';

/**
 * Solo estado de cliente. Los productos son estado de servidor y viven en el
 * cache de RTK Query: duplicarlos acá sería tener dos fuentes de verdad.
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

export const {categoryChanged, filtersReset, queryChanged, sortChanged} = catalogSlice.actions;
export default catalogSlice.reducer;
```

- [ ] **Step 4: Montar el reducer en el store**

En `src/app/store.ts`: `import catalogReducer from '@/features/catalog/catalogSlice';` y agregar `catalog: catalogReducer` a `rootReducer`.

- [ ] **Step 5: Correr el test del slice**

Run: `npx jest src/features/catalog/__tests__/catalogSlice --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 6: Escribir el test que falla de los selectors**

`src/features/catalog/__tests__/selectors.test.ts`:

```ts
import {makeStore} from '@/app/store';

import {categoryChanged, queryChanged} from '../catalogSlice';
import {selectHasActiveFilters, selectProductsQueryArgs} from '../selectors';

describe('selectProductsQueryArgs', () => {
  it('devuelve la misma referencia si el estado relevante no cambió', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    const second = selectProductsQueryArgs(store.getState());
    expect(second).toBe(first);
  });

  it('sigue devolviendo la misma referencia tras un dispatch que no toca el catálogo', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch({type: 'ruido/irrelevante'});
    expect(selectProductsQueryArgs(store.getState())).toBe(first);
  });

  it('devuelve una referencia nueva cuando cambia un filtro', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch(categoryChanged('audio'));
    const second = selectProductsQueryArgs(store.getState());
    expect(second).not.toBe(first);
    expect(second.category).toBe('audio');
  });
});

describe('selectHasActiveFilters', () => {
  it('es falso con los filtros por defecto', () => {
    expect(selectHasActiveFilters(makeStore().getState())).toBe(false);
  });

  it('es verdadero cuando hay una búsqueda', () => {
    const store = makeStore();
    store.dispatch(queryChanged('nimbus'));
    expect(selectHasActiveFilters(store.getState())).toBe(true);
  });
});
```

> El segundo caso es el que da valor: sin `createSelector`, un selector que arma `{q, category, sort}` inline devolvería un objeto nuevo en **cada** dispatch de la app y re-renderizaría la lista aunque nada del catálogo hubiera cambiado.

- [ ] **Step 7: Correr y verificar que falla**

Run: `npx jest src/features/catalog/__tests__/selectors --no-coverage`
Expected: FAIL — `Cannot find module '../selectors'`.

- [ ] **Step 8: Implementar los selectors**

`src/features/catalog/selectors.ts`:

```ts
import {createSelector} from '@reduxjs/toolkit';

import type {RootState} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

const selectCatalog = (state: RootState) => state.catalog;

/**
 * Nivel 2 de la demo de memoización (spec §5): memoización fuera de React.
 * Este selector arma un objeto nuevo; sin createSelector la identidad cambiaría
 * en cada llamada y `useGetProductsInfiniteQuery(args)` re-suscribiría el hook
 * en cada render.
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
  catalog => catalog.query.trim() !== '' || catalog.category !== 'all' || catalog.sort !== 'name',
);
```

- [ ] **Step 9: Correr el test de selectors**

Run: `npx jest src/features/catalog/__tests__/selectors --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 10: Escribir el test que falla de la infiniteQuery**

`src/features/catalog/__tests__/catalogApi.test.ts`:

```ts
import {makeStore} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

import {catalogApi} from '../catalogApi';

const ARGS: ProductsQueryArgs = {q: '', category: 'all', sort: 'name'};

describe('catalogApi', () => {
  it('trae la primera página', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(ARGS),
    );
    expect(result.data?.pages).toHaveLength(1);
    expect(result.data?.pages[0]?.items).toHaveLength(10);
  });

  it('acumula páginas al pedir la siguiente', async () => {
    const store = makeStore();
    await store.dispatch(catalogApi.endpoints.getProducts.initiate(ARGS));
    const result = await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(ARGS, {direction: 'forward'}),
    );
    expect(result.data?.pages).toHaveLength(2);
    const ids = result.data?.pages.flatMap(page => page.items.map(item => item.id)) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cachea las páginas por combinación de filtros', async () => {
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

- [ ] **Step 11: Correr y verificar que falla**

Run: `npx jest src/features/catalog/__tests__/catalogApi --no-coverage`
Expected: FAIL — `Cannot find module '../catalogApi'`.

- [ ] **Step 12: Implementar `catalogApi`**

`src/features/catalog/catalogApi.ts`:

```ts
import {PAGE_SIZE} from '@/services/api/config';
import {baseApi} from '@/services/api/baseApi';
import type {ProductsPage, ProductsQueryArgs} from '@/services/api/types';

/** El cursor es el id del último producto de la página anterior; `null` = primera. */
type PageParam = string | null;

export const catalogApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getProducts: build.infiniteQuery<ProductsPage, ProductsQueryArgs, PageParam>({
      infiniteQueryOptions: {
        initialPageParam: null,
        // Devolver `undefined` corta el paginado: es lo que apaga `hasNextPage`.
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

- [ ] **Step 13: Correr el test de la api**

Run: `npx jest src/features/catalog --no-coverage`
Expected: PASS, 13 tests.

- [ ] **Step 14: Escribir el test que falla de `productsApi`**

`src/services/api/__tests__/productsApi.test.ts`:

```ts
import {makeStore} from '@/app/store';

import {productsApi} from '../productsApi';

describe('productsApi', () => {
  it('trae un producto por id', async () => {
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));
    expect(result.data?.id).toBe('p-001');
    expect(result.data?.name).toBe('Auriculares Nimbus');
  });

  it('expone el error cuando el producto no existe', async () => {
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getProduct.initiate('no-existe'));
    expect(result.error).toBeDefined();
  });
});
```

Run: `npx jest src/services/api/__tests__/productsApi --no-coverage`
Expected: FAIL — `Cannot find module '../productsApi'`.

- [ ] **Step 15: Implementar `productsApi`**

`src/services/api/productsApi.ts`:

```ts
import {baseApi} from './baseApi';
import type {Product} from './types';

/**
 * `getProduct` es transversal: lo consumen el detalle (feature `catalog`) y la
 * pantalla de favoritos (feature `favorites`). Si viviera dentro de `catalogApi`,
 * favoritos tendría que importar de otra feature, que es justo lo que la regla
 * de dependencias prohíbe. Por eso el endpoint nace en la capa de API compartida.
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

- [ ] **Step 16: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: catalogApi con infiniteQuery, productsApi, slice de filtros y selectors"
```

---

## Task 11: Debounce, SearchBar y CategoryFilter

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
  - `<SearchBar />` — sin props; testID `search-input`
  - `<CategoryFilter />` — sin props; testID por categoría `category-<name>` y `category-all`
  - `<SortControl />` — sin props; testID `sort-<option>`

- [ ] **Step 1: Escribir el test que falla del hook**

`src/features/catalog/__tests__/useDebouncedValue.test.ts`:

```ts
import {act, renderHook} from '@testing-library/react-native';

import {useDebouncedValue} from '../hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('devuelve el valor inicial de inmediato', () => {
    const {result} = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('no actualiza antes de que pase el delay', () => {
    const {rerender, result} = renderHook(({value}) => useDebouncedValue(value, 300), {
      initialProps: {value: 'a'},
    });
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
  });

  it('actualiza una vez cumplido el delay', () => {
    const {rerender, result} = renderHook(({value}) => useDebouncedValue(value, 300), {
      initialProps: {value: 'a'},
    });
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('colapsa varios cambios rápidos en una sola actualización', () => {
    const {rerender, result} = renderHook(({value}) => useDebouncedValue(value, 300), {
      initialProps: {value: 'a'},
    });
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

  it('limpia el timer al desmontarse', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    const {unmount} = renderHook(() => useDebouncedValue('a', 300));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/features/catalog/__tests__/useDebouncedValue --no-coverage`
Expected: FAIL — `Cannot find module '../hooks/useDebouncedValue'`.

- [ ] **Step 3: Implementar el hook**

`src/features/catalog/hooks/useDebouncedValue.ts`:

```ts
import {useEffect, useState} from 'react';

/**
 * Retrasa la propagación de `value` hasta que se queda quieto `delayMs`.
 * El `return` del efecto es lo importante: sin él, cada tecla dejaría un timer
 * vivo y el valor se actualizaría varias veces (y después de desmontar).
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

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx jest src/features/catalog/__tests__/useDebouncedValue --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 5: Escribir el test que falla de `SearchBar`**

`src/features/catalog/__tests__/SearchBar.test.tsx`:

```tsx
import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {SearchBar} from '../components/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('no despacha la query antes del debounce', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(store.getState().catalog.query).toBe('');
  });

  it('despacha la query una vez cumplido el debounce', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(store.getState().catalog.query).toBe('nimbus');
  });

  it('refleja el texto tipeado de inmediato en el input', () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByTestId('search-input');
    fireEvent.changeText(input, 'nimbus');
    expect(input.props.value).toBe('nimbus');
  });
});
```

> El tercer caso documenta la decisión: el input es **controlado localmente** y solo el valor debounceado va al store. Si el input leyera del store, cada tecla dispararía un render de toda la lista.

- [ ] **Step 6: Correr y verificar que falla**

Run: `npx jest src/features/catalog/__tests__/SearchBar --no-coverage`
Expected: FAIL — `Cannot find module '../components/SearchBar'`.

- [ ] **Step 7: Implementar `SearchBar`**

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
        accessibilityLabel="Buscar productos"
        placeholder="Buscar productos"
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

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `npx jest src/features/catalog/__tests__/SearchBar --no-coverage`
Expected: PASS, 3 tests.

- [ ] **Step 9: Implementar `CategoryFilter`**

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
  all: 'Todas',
  audio: 'Audio',
  wearables: 'Wearables',
  computers: 'Computación',
  gaming: 'Gaming',
  home: 'Hogar',
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
            <Text style={[styles.label, active && styles.labelActive]}>{LABELS[option]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
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

- [ ] **Step 10: Implementar `SortControl`**

`src/features/catalog/components/SortControl.tsx`:

```tsx
import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import type {SortOption} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {sortChanged} from '../catalogSlice';

const OPTIONS: Array<{value: SortOption; label: string}> = [
  {value: 'name', label: 'Nombre'},
  {value: 'price_asc', label: 'Precio ↑'},
  {value: 'price_desc', label: 'Precio ↓'},
];

export function SortControl() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.catalog.sort);

  const onSelect = useCallback((value: SortOption) => dispatch(sortChanged(value)), [dispatch]);

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
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm},
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

- [ ] **Step 11: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: búsqueda con debounce, filtro por categoría y control de orden"
```

---

## Task 12: ProductCard y ProductListScreen

**Files:**
- Create: `src/features/catalog/components/ProductCard.tsx`
- Create: `src/features/catalog/components/ProductListSkeleton.tsx`
- Replace: `src/features/catalog/screens/ProductListScreen.tsx` (era placeholder)
- Test: `src/features/catalog/__tests__/ProductListScreen.test.tsx`

**Interfaces:**
- Consumes: `useGetProductsInfiniteQuery`; `selectProductsQueryArgs`, `selectHasActiveFilters`; `SearchBar`, `CategoryFilter`, `SortControl`; `EmptyState`, `ErrorView`, `Screen`, `Skeleton`; `formatPrice`; `ProductListScreenProps`.
- Produces:
  - `PRODUCT_CARD_HEIGHT = 96` (exportada, la usa `getItemLayout`)
  - `<ProductCard product onPress />` — `{product: Product; onPress: (id: string) => void}`; memoizado con `React.memo`; testID `product-card-<id>`
  - `<ProductListScreen navigation />`; testIDs `product-list`, `list-skeleton`

- [ ] **Step 1: Escribir el test que falla de la pantalla**

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
  return renderWithProviders(<ProductListScreen navigation={navigation} route={{key: 'k', name: 'ProductList'} as never} />);
}

describe('ProductListScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('muestra el skeleton mientras carga', () => {
    renderScreen();
    expect(screen.getByTestId('list-skeleton')).toBeVisible();
  });

  it('muestra la primera página de productos', async () => {
    renderScreen();
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
    expect(screen.queryByTestId('list-skeleton')).toBeNull();
  });

  it('filtra la lista al buscar', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('product-list')).toBeVisible());

    fireEvent.changeText(screen.getByTestId('search-input'), 'Gamepad');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();

    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(screen.queryByText('Auriculares Atlas')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay coincidencias', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('product-list')).toBeVisible());

    fireEvent.changeText(screen.getByTestId('search-input'), 'zzzznoexiste');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();

    expect(await screen.findByText('Sin resultados')).toBeVisible();
  });

  it('muestra el error con reintento cuando la API falla', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products`, () =>
        HttpResponse.json({message: 'Boom'}, {status: 500}),
      ),
    );
    renderScreen();
    expect(await screen.findByTestId('retry')).toBeVisible();
  });

  it('navega al detalle al tocar un producto', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('product-card-p-005'));
    expect(navigation.navigate).toHaveBeenCalledWith('ProductDetail', {productId: 'p-005'});
  });
});
```

> `Auriculares Atlas` y `Gamepad Atlas` existen por el dataset determinista de la Task 3; `p-005` es el quinto producto. Si el dataset cambia, estos tests fallan a propósito.

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/features/catalog/__tests__/ProductListScreen --no-coverage`
Expected: FAIL — la pantalla placeholder no exporta nada de esto.

- [ ] **Step 3: Implementar `ProductCard`**

`src/features/catalog/components/ProductCard.tsx`:

```tsx
import React, {memo, useCallback} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import type {Product} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

/** Altura fija: es lo que habilita `getItemLayout` en la FlatList. */
export const PRODUCT_CARD_HEIGHT = 96;

interface ProductCardProps {
  product: Product;
  onPress: (id: string) => void;
}

function ProductCardComponent({product, onPress}: ProductCardProps) {
  const handlePress = useCallback(() => onPress(product.id), [onPress, product.id]);

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
 * `React.memo` acá es inútil por sí solo: si `renderItem` se recrea en cada
 * render del padre, la prop `onPress` cambia de identidad y la comparación
 * superficial falla igual. Las tres piezas (memo + useCallback en renderItem +
 * keyExtractor estable) solo funcionan juntas. Ver spec §5, nivel 1.
 */
export const ProductCard = memo(ProductCardComponent);
```

- [ ] **Step 4: Implementar el skeleton de lista**

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

- [ ] **Step 5: Implementar `ProductListScreen`**

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
   * Nivel 1 de la demo de memoización (spec §5): aplanar las páginas es O(n) y
   * corre en cada render del padre —incluido cada tecla del buscador— si no se
   * memoiza. La dependencia es `data?.pages`, no `data`.
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

  // Altura fija conocida: evita que la FlatList mida cada fila y hace que el
  // scroll a un índice sea O(1).
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
        <ErrorView message="No pudimos cargar el catálogo." onRetry={() => void refetch()} />
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
          contentContainerStyle={products.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Sin resultados"
              message={
                hasFilters
                  ? 'Probá con otra búsqueda o quitá los filtros.'
                  : 'Todavía no hay productos.'
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

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npx jest src/features/catalog/__tests__/ProductListScreen --no-coverage`
Expected: PASS, 6 tests.

- [ ] **Step 7: Verificar en el simulador**

Run: `npm run ios`
Expected: la lista carga con skeleton, la búsqueda filtra, el scroll trae más páginas y el pull to refresh funciona.

- [ ] **Step 8: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: lista de productos con paginado infinito, filtros y memoización"
```

---

## Task 13: Favoritos

**Files:**
- Create: `src/services/favorites/favoritesSlice.ts`
- Create: `src/services/favorites/selectors.ts`
- Create: `src/services/favorites/favoritesListeners.ts`
- Create: `src/services/favorites/index.ts`
- Create: `src/components/ui/FavoriteButton.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/app/store.ts` (reducer `favorites` + listeners + hidratación)
- Replace: `src/features/favorites/screens/FavoritesScreen.tsx` (era placeholder)
- Test: `src/services/favorites/__tests__/favoritesSlice.test.ts`
- Test: `src/features/favorites/__tests__/FavoritesScreen.test.tsx`

**Interfaces:**
- Consumes: `storage`, `STORAGE_KEYS`; `AppStartListening`; `useGetProductQuery` de `@/services/api/productsApi`.
- Produces desde `@/services/favorites`:
  - `favoritesReducer` (default del slice), `favoriteToggled(id: string)`, `favoritesRestored(ids: string[])`
  - `FavoritesState = {ids: string[]}`
  - `selectFavoriteIds(state): string[]`, `makeSelectIsFavorite(id)` / `selectIsFavorite(state, id): boolean`
  - `registerFavoritesListeners(startAppListening): void`
  - `restoreFavorites({storage?}): thunk`
- Produces: `<FavoriteButton productId />` desde `@/components/ui`; testID `favorite-<id>`.

> **Por qué el slice vive en `services/` y no en `features/favorites/`:** el estado de favoritos lo consumen la pantalla de favoritos **y** el detalle de producto (feature `catalog`). Dejarlo dentro de la feature obligaría a un import feature→feature, que la regla de dependencias prohíbe. El estado transversal sube a la capa compartida; la feature `favorites` queda siendo solo su pantalla. Es exactamente el mecanismo que el spec §3.1 describe ("si dos features necesitan lo mismo, sube").

- [ ] **Step 1: Escribir el test que falla del slice**

`src/services/favorites/__tests__/favoritesSlice.test.ts`:

```ts
import {createMemoryStorage, STORAGE_KEYS} from '@/services/storage';

import favoritesReducer, {favoriteToggled, favoritesRestored, restoreFavorites} from '../favoritesSlice';
import type {FavoritesState} from '../favoritesSlice';

const empty: FavoritesState = {ids: []};

describe('favoritesSlice', () => {
  it('arranca vacío', () => {
    expect(favoritesReducer(undefined, {type: '@@INIT'})).toEqual(empty);
  });

  it('agrega un id que no estaba', () => {
    expect(favoritesReducer(empty, favoriteToggled('p-001')).ids).toEqual(['p-001']);
  });

  it('quita un id que ya estaba', () => {
    const state: FavoritesState = {ids: ['p-001', 'p-002']};
    expect(favoritesReducer(state, favoriteToggled('p-001')).ids).toEqual(['p-002']);
  });

  it('no duplica ids', () => {
    let state = favoritesReducer(empty, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-002'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    expect(state.ids).toEqual(['p-002', 'p-001']);
  });

  it('reemplaza la lista al restaurar', () => {
    const state: FavoritesState = {ids: ['p-009']};
    expect(favoritesReducer(state, favoritesRestored(['p-001', 'p-002'])).ids).toEqual([
      'p-001',
      'p-002',
    ]);
  });
});

describe('restoreFavorites', () => {
  it('hidrata desde el storage', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-003']));

    const dispatched: unknown[] = [];
    await restoreFavorites({storage})(action => {
      dispatched.push(action);
      return action;
    });

    expect(dispatched).toContainEqual(favoritesRestored(['p-003']));
  });

  it('no rompe si el storage tiene JSON inválido', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, 'no-es-json');

    const dispatched: unknown[] = [];
    await restoreFavorites({storage})(action => {
      dispatched.push(action);
      return action;
    });

    expect(dispatched).toContainEqual(favoritesRestored([]));
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/services/favorites --no-coverage`
Expected: FAIL — `Cannot find module '../favoritesSlice'`.

- [ ] **Step 3: Implementar el slice**

`src/services/favorites/favoritesSlice.ts`:

```ts
import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {storage as defaultStorage, STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';

/** Solo ids: los datos del producto se resuelven desde el cache de RTK Query. */
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

export function restoreFavorites({storage = defaultStorage}: {storage?: Storage} = {}) {
  return async (dispatch: (action: unknown) => unknown): Promise<void> => {
    const raw = await storage.getItem(STORAGE_KEYS.favorites);
    if (raw == null) {
      dispatch(favoritesRestored([]));
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
      dispatch(favoritesRestored(ids));
    } catch {
      // Storage corrupto no debe romper el arranque de la app.
      dispatch(favoritesRestored([]));
    }
  };
}
```

- [ ] **Step 4: Escribir selectors, listeners y barril**

`src/services/favorites/selectors.ts`:

```ts
import type {RootState} from '@/app/store';

export const selectFavoriteIds = (state: RootState): string[] => state.favorites.ids;

/**
 * Selector con parámetro: devuelve un boolean (primitivo), así que no hace falta
 * createSelector — `useSelector` compara con `===` y un boolean nunca cambia de
 * identidad sin cambiar de valor. Memoizarlo sería puro costo. (Spec §5,
 * contrapunto: saber cuándo *no* memoizar.)
 */
export const selectIsFavorite = (state: RootState, productId: string): boolean =>
  state.favorites.ids.includes(productId);
```

`src/services/favorites/favoritesListeners.ts`:

```ts
import type {AppStartListening} from '@/app/listenerMiddleware';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {favoriteToggled} from './favoritesSlice';

export function registerFavoritesListeners(startAppListening: AppStartListening): void {
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
export {favoriteToggled, favoritesRestored, restoreFavorites} from './favoritesSlice';
export type {FavoritesState} from './favoritesSlice';
export {registerFavoritesListeners} from './favoritesListeners';
export {selectFavoriteIds, selectIsFavorite} from './selectors';
```

- [ ] **Step 5: Montar en el store e hidratar**

En `src/app/store.ts`: agregar `favorites: favoritesReducer` a `rootReducer`, llamar `registerFavoritesListeners(startAppListening)` junto a los de auth. En `src/navigation/RootNavigator.tsx`, dentro del `useEffect` existente, agregar `void dispatch(restoreFavorites());`.

- [ ] **Step 6: Correr el test del slice**

Run: `npx jest src/services/favorites --no-coverage`
Expected: PASS, 7 tests.

- [ ] **Step 7: Implementar `FavoriteButton`**

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
  const isFavorite = useAppSelector(state => selectIsFavorite(state, productId));

  const onPress = useCallback(() => {
    dispatch(favoriteToggled(productId));
  }, [dispatch, productId]);

  return (
    <Pressable
      testID={`favorite-${productId}`}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      accessibilityState={{selected: isFavorite}}
      onPress={onPress}
      style={styles.button}>
      <Text style={[styles.icon, isFavorite && styles.iconActive]}>{isFavorite ? '♥' : '♡'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {padding: spacing.sm, borderRadius: radius.full},
  icon: {fontSize: 24, color: colors.textMuted},
  iconActive: {color: colors.favorite},
});
```

Agregar `export {FavoriteButton} from './FavoriteButton';` a `src/components/ui/index.ts`.

- [ ] **Step 8: Escribir el test que falla de `FavoritesScreen`**

`src/features/favorites/__tests__/FavoritesScreen.test.tsx`:

```tsx
import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {FavoritesScreen} from '../screens/FavoritesScreen';

describe('FavoritesScreen', () => {
  it('muestra el estado vacío sin favoritos', () => {
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getByText('Todavía no tenés favoritos')).toBeVisible();
  });

  it('muestra los productos favoritos resueltos desde la API', async () => {
    renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    expect(await screen.findByText('Auriculares Nimbus')).toBeVisible();
  });

  it('quita un producto de la lista al desmarcarlo', async () => {
    const {store} = renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });
});
```

- [ ] **Step 9: Implementar `FavoritesScreen`**

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
 * Cada fila resuelve su producto por id. Si ya está en el cache de RTK Query
 * (porque se vio en el catálogo) se pinta al instante y no hay request; si no,
 * se pide. Guardar solo ids evita que favoritos y catálogo se desincronicen.
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
          title="Todavía no tenés favoritos"
          message="Tocá el corazón en el detalle de un producto para guardarlo acá."
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

- [ ] **Step 10: Correr los tests**

Run: `npx jest src/services src/features/favorites --no-coverage`
Expected: PASS. El test de `FavoritesScreen` da 3 casos en verde.

- [ ] **Step 11: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: favoritos persistidos por id resueltos desde el cache de RTK Query"
```

---

## Task 14: ProductDetailScreen

**Files:**
- Replace: `src/features/catalog/screens/ProductDetailScreen.tsx` (era placeholder)
- Test: `src/features/catalog/__tests__/ProductDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `useGetProductQuery` de `@/services/api/productsApi`; `FavoriteButton`, `ErrorView`, `Screen`, `Skeleton`; `formatPrice`; `ProductDetailScreenProps`.
- Produces: `<ProductDetailScreen route navigation />`; testIDs `detail-skeleton`, `detail-name`, `detail-stock`.

- [ ] **Step 1: Escribir el test que falla**

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

function renderDetail(productId: string, store?: ReturnType<typeof renderWithProviders>['store']) {
  return renderWithProviders(
    <ProductDetailScreen
      route={{key: 'k', name: 'ProductDetail', params: {productId}} as never}
      navigation={{setOptions: jest.fn()} as never}
    />,
    store ? {store} : undefined,
  );
}

describe('ProductDetailScreen', () => {
  it('muestra el skeleton mientras carga', () => {
    renderDetail('p-001');
    expect(screen.getByTestId('detail-skeleton')).toBeVisible();
  });

  it('muestra los datos del producto', async () => {
    renderDetail('p-001');
    expect(await screen.findByTestId('detail-name')).toHaveTextContent('Auriculares Nimbus');
    expect(screen.getByText('$19.99')).toBeVisible();
  });

  it('pinta al instante si el producto ya está en el cache', async () => {
    const {store} = renderWithProviders(<></>);
    await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));

    renderDetail('p-001', store);
    // Sin pasar por el skeleton: el dato ya estaba.
    expect(screen.queryByTestId('detail-skeleton')).toBeNull();
    expect(screen.getByTestId('detail-name')).toHaveTextContent('Auriculares Nimbus');
  });

  it('alterna el favorito', async () => {
    const {store} = renderDetail('p-001');
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual(['p-001']);
    fireEvent.press(screen.getByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });

  it('muestra un error con reintento si el producto no existe', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/:id`, () =>
        HttpResponse.json({message: 'No encontrado'}, {status: 404}),
      ),
    );
    renderDetail('p-999');
    expect(await screen.findByTestId('retry')).toBeVisible();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/features/catalog/__tests__/ProductDetailScreen --no-coverage`
Expected: FAIL — el placeholder no exporta esto.

- [ ] **Step 3: Implementar la pantalla**

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
   * Si el producto ya está en el cache (se vio en la lista), `data` viene
   * poblado en el primer render y RTK Query revalida en background. Es el
   * comportamiento que hace que la navegación se sienta instantánea.
   */
  const {data: product, error, isLoading, refetch} = useGetProductQuery(productId);

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
        <ErrorView message="No pudimos cargar el producto." onRetry={() => void refetch()} />
      </Screen>
    );
  }

  // Cálculo deliberadamente NO memoizado (spec §5, contrapunto): es una
  // comparación y una concatenación sobre datos que ya están en memoria. Envolverlo
  // en useMemo costaría más que recalcularlo —el hook guarda el array de
  // dependencias y lo compara en cada render— y agregaría ruido al leerlo.
  // La memoización se justifica por costo medido, no por reflejo.
  const availability = product.stock > 0 ? `${product.stock} en stock` : 'Sin stock';

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
  image: {width: '100%', height: 240, borderRadius: radius.md, backgroundColor: colors.surface},
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
  description: {...typography.body, color: colors.text, marginTop: spacing.md, lineHeight: 22},
});
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx jest src/features/catalog/__tests__/ProductDetailScreen --no-coverage`
Expected: PASS, 5 tests.

- [ ] **Step 5: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: detalle de producto sobre el cache de RTK Query con toggle de favorito"
```

---

## Task 15: Perfil y Performance Lab

**Files:**
- Replace: `src/features/profile/screens/ProfileScreen.tsx` (era placeholder)
- Create: `src/features/profile/screens/PerformanceLabScreen.tsx`
- Create: `src/navigation/ProfileStack.tsx`
- Modify: `src/navigation/types.ts` (agregar `ProfileStackParamList`)
- Modify: `src/navigation/AppTabs.tsx` (usar `ProfileStack`)
- Test: `src/features/profile/__tests__/ProfileScreen.test.tsx`
- Test: `src/features/profile/__tests__/PerformanceLabScreen.test.tsx`

**Interfaces:**
- Consumes: `useSession` de `@/services/session`; `Button`, `Screen`.
- Produces:
  - `ProfileStackParamList = {Profile: undefined; PerformanceLab: undefined}`
  - `<ProfileScreen navigation />`; testIDs `profile-email`, `profile-logout`, `profile-open-lab`
  - `<PerformanceLabScreen />`; testIDs `lab-input`, `lab-render-count-plain-<i>`, `lab-render-count-memo-<i>`, `lab-parent-renders`

- [ ] **Step 1: Agregar el stack de perfil a los tipos**

En `src/navigation/types.ts`, agregar:

```ts
export type ProfileStackParamList = {
  Profile: undefined;
  PerformanceLab: undefined;
};

export type ProfileScreenProps = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;
```

y cambiar `AppTabParamList` para que `ProfileTab` sea `NavigatorScreenParams<ProfileStackParamList>`.

- [ ] **Step 2: Escribir el test que falla del perfil**

`src/features/profile/__tests__/ProfileScreen.test.tsx`:

```tsx
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

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
    <ProfileScreen navigation={navigation} route={{key: 'k', name: 'Profile'} as never} />,
    {preloadedState: signedIn},
  );
}

describe('ProfileScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('muestra los datos del usuario', () => {
    renderProfile();
    expect(screen.getByTestId('profile-email')).toHaveTextContent('demo@catalog.dev');
    expect(screen.getByText('Demo User')).toBeVisible();
  });

  it('cierra la sesión y limpia el cache de la API', async () => {
    const {store} = renderProfile();
    await store.dispatch({type: 'api/queries/probe'} as never);

    fireEvent.press(screen.getByTestId('profile-logout'));

    await waitFor(() => expect(store.getState().session.status).toBe('signedOut'));
    expect(store.getState().session.accessToken).toBeNull();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });

  it('navega al Performance Lab', () => {
    renderProfile();
    fireEvent.press(screen.getByTestId('profile-open-lab'));
    expect(navigation.navigate).toHaveBeenCalledWith('PerformanceLab');
  });
});
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `npx jest src/features/profile --no-coverage`
Expected: FAIL — el placeholder no expone esos testIDs.

- [ ] **Step 4: Implementar `ProfileScreen`**

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
        <Text style={styles.name}>{user?.name ?? 'Invitado'}</Text>
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
        <Button testID="profile-logout" label="Cerrar sesión" onPress={signOut} />
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

- [ ] **Step 5: Correr el test del perfil**

Run: `npx jest src/features/profile/__tests__/ProfileScreen --no-coverage`
Expected: PASS, 3 tests.

- [ ] **Step 6: Escribir el test que falla del Performance Lab**

`src/features/profile/__tests__/PerformanceLabScreen.test.tsx`:

```tsx
import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {PerformanceLabScreen} from '../screens/PerformanceLabScreen';

describe('PerformanceLabScreen', () => {
  it('arranca con todas las filas en 1 render', () => {
    render(<PerformanceLabScreen />);
    expect(screen.getByTestId('lab-render-count-plain-0')).toHaveTextContent('1');
    expect(screen.getByTestId('lab-render-count-memo-0')).toHaveTextContent('1');
  });

  it('re-renderiza las filas sin memoizar al tipear, y no las memoizadas', () => {
    render(<PerformanceLabScreen />);
    fireEvent.changeText(screen.getByTestId('lab-input'), 'a');
    fireEvent.changeText(screen.getByTestId('lab-input'), 'ab');

    expect(screen.getByTestId('lab-render-count-plain-0')).toHaveTextContent('3');
    expect(screen.getByTestId('lab-render-count-memo-0')).toHaveTextContent('1');
  });

  it('cuenta los renders del padre', () => {
    render(<PerformanceLabScreen />);
    fireEvent.changeText(screen.getByTestId('lab-input'), 'a');
    expect(screen.getByTestId('lab-parent-renders')).toHaveTextContent('2');
  });
});
```

> Este test es la prueba de que la demo **mide** algo, no de que se ve linda. Si alguien rompe la memoización, el test falla.

- [ ] **Step 7: Correr y verificar que falla**

Run: `npx jest src/features/profile/__tests__/PerformanceLabScreen --no-coverage`
Expected: FAIL — `Cannot find module '../screens/PerformanceLabScreen'`.

- [ ] **Step 8: Implementar `PerformanceLabScreen`**

`src/features/profile/screens/PerformanceLabScreen.tsx`:

```tsx
import React, {memo, useCallback, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {Screen} from '@/components/ui';
import {colors, radius, spacing, typography} from '@/theme/tokens';

const ROWS = Array.from({length: 8}, (_, index) => ({id: index, label: `Fila ${index + 1}`}));

interface RowProps {
  label: string;
  index: number;
  variant: 'plain' | 'memo';
  onPress: (index: number) => void;
}

/**
 * El contador vive en un ref que se incrementa durante el render. Es impuro a
 * propósito: es la única forma de contar renders sin provocar otro render.
 * En StrictMode con doble render los números se duplicarían — vale la pena
 * saberlo y decirlo antes de que lo pregunten.
 */
function Row({label, index, variant, onPress}: RowProps) {
  const renders = useRef(0);
  renders.current += 1;

  return (
    <View style={styles.row} onTouchEnd={() => onPress(index)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text testID={`lab-render-count-${variant}-${index}`} style={styles.badge}>
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

  // Columna izquierda: handler recreado en cada render. `Row` no está memoizada,
  // así que re-renderiza siempre.
  const onPressPlain = (index: number) => {
    void index;
  };

  // Columna derecha: handler estable + fila memoizada. La lista de filas también
  // se memoiza para que su identidad no cambie.
  const onPressMemo = useCallback((index: number) => {
    void index;
  }, []);

  const memoRows = useMemo(() => ROWS, []);

  return (
    <Screen>
      <View style={styles.header}>
        <TextInput
          testID="lab-input"
          placeholder="Escribí para forzar renders del padre"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <Text style={styles.caption}>
          Renders del padre:{' '}
          <Text testID="lab-parent-renders" style={styles.badgeInline}>
            {parentRenders.current}
          </Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.columns} horizontal={false}>
        <View style={styles.columnsRow}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Sin memoizar</Text>
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
            <Text style={styles.columnTitle}>Memoizada</Text>
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
          Cada tecla re-renderiza esta pantalla. La columna izquierda vuelve a renderizar sus 8
          filas porque `onPress` cambia de identidad; la derecha no renderiza ninguna porque
          `React.memo` + `useCallback` mantienen las props estables. Con 8 filas la diferencia es
          irrelevante: el punto es que con 800 deja de serlo, y que memoizar sin medir es
          adivinar.
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

- [ ] **Step 9: Correr el test y verificar que pasa**

Run: `npx jest src/features/profile --no-coverage`
Expected: PASS, 6 tests.

- [ ] **Step 10: Montar el stack de perfil**

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
      <Stack.Screen name="Profile" component={ProfileScreen} options={{title: 'Perfil'}} />
      <Stack.Screen
        name="PerformanceLab"
        component={PerformanceLabScreen}
        options={{title: 'Performance Lab'}}
      />
    </Stack.Navigator>
  );
}
```

En `src/navigation/AppTabs.tsx`, reemplazar el `component={ProfileScreen}` del tab por `component={ProfileStack}` con `options={{title: 'Perfil', headerShown: false}}`.

- [ ] **Step 11: Verificar en el simulador**

Run: `npm run ios`
Expected: en Perfil → Performance Lab, al tipear la columna izquierda sube sus contadores y la derecha queda en 1.

- [ ] **Step 12: Verificación completa y commit**

```bash
npm run lint && npm run typecheck && npx jest --no-coverage
git add -A
git commit -m "feat: perfil con logout y Performance Lab con contador de renders"
```

---

## Task 16: Documentación y verificación final

**Files:**
- Create: `CLAUDE.md`
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-08-30-rn-product-catalog-design.md` (estado → implementado)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: documentación. Sin código nuevo.

- [ ] **Step 1: Escribir `CLAUDE.md`**

Secciones obligatorias, en este orden:

1. **Comandos** — `npm run lint`, `typecheck`, `test`, `ios`, `android`, `start`; cómo correr un test suelto.
2. **Mapa de arquitectura** — el árbol real de `src/` (generado con `find src -type d | sort`, no de memoria) con una línea por carpeta.
3. **Regla de dependencias** — features no importan de features; qué subió a `services/` y por qué (`session`, `favorites`, `productsApi`); que la regla está enforceada en `eslint.config.js`.
4. **Estado servidor vs. estado cliente** — RTK Query es dueño de productos y usuario; los slices, de sesión, filtros y favoritos. No duplicar.
5. **Convenciones** — named exports salvo `App`; tests en `__tests__/` junto al código; `testID` en kebab-case; imports ordenados por `import/order`.
6. **Estrategia de testing** — qué se testea y qué no; `renderWithProviders`; sin snapshots grandes; MSW con `onUnhandledRequest: 'error'`.
7. **Gotchas** — el alias hace falta en tsconfig **y** babel **y** jest; MSW en RN necesita `msw/native` + polyfills (y el resultado real del Step 12 de la Task 4); `noUncheckedIndexedAccess` obliga a chequear accesos por índice; New Architecture activa por defecto.
8. **Decisiones** — enlace a la sección de ADRs del README.

- [ ] **Step 2: Escribir `README.md`**

Secciones obligatorias:

1. Badge de CI (`![CI](https://github.com/<usuario>/rn-product-catalog/actions/workflows/ci.yml/badge.svg)`).
2. **Qué es** — dos párrafos.
3. **Setup desde clon limpio** — `npm ci`, `cd ios && pod install`, `npm run ios` / `npm run android`, requisitos de versión (Node 20, JDK 17, Xcode).
4. **Credenciales de demo** — `demo@catalog.dev` / `password123`.
5. **Capturas** — login, catálogo, detalle, favoritos, Performance Lab. Tomarlas del simulador y guardarlas en `docs/screenshots/`.
6. **Notas de entrevista** — la tabla del Step 3.
7. **ADRs** — los cinco del spec §12, actualizados con lo que efectivamente pasó (versión final de RN, resultado de MSW en RN).
8. **Qué no está y por qué** — los no objetivos del spec §1: sin backend real, sin dark mode, sin i18n, sin Detox, sin build nativo en CI, cobertura parcial y deliberada.

- [ ] **Step 3: Escribir la tabla de notas de entrevista**

Cada fila apunta a un archivo concreto. Verificar que cada ruta existe antes de dar la task por cerrada.

| Tema | Dónde está | Respuesta corta |
|---|---|---|
| New Architecture | `android/gradle.properties`, `ios/Podfile` | Fabric + TurboModules activos por defecto desde RN 0.76; renderer en C++, sin el bridge asíncrono. |
| Memoización nivel 1 | `src/features/catalog/screens/ProductListScreen.tsx` | `useMemo` para aplanar páginas, `useCallback` en `renderItem`/`keyExtractor`, `React.memo` en la fila. Las tres solo sirven juntas. |
| Memoización nivel 2 | `src/features/catalog/selectors.ts` | `createSelector`: un selector que devuelve un objeto nuevo re-renderiza en cada dispatch. |
| Memoización nivel 3 | `src/features/profile/screens/PerformanceLabScreen.tsx` | Contador de renders por fila: la diferencia se ve, no se explica. |
| Cuándo NO memoizar | `src/features/catalog/screens/ProductDetailScreen.tsx` | Cálculo barato sin `useMemo`, con el porqué en un comentario. |
| Custom hook con cleanup | `src/features/catalog/hooks/useDebouncedValue.ts` | El `return` del `useEffect` es lo que evita timers colgados. |
| RTK Query vs. Context | `src/services/api/baseApi.ts`, `src/features/catalog/catalogApi.ts` | Cache, tags, dedupe y estados de carga gratis; Context no es un sistema de cache. |
| Estado servidor vs. cliente | `src/features/catalog/catalogSlice.ts` | El slice guarda filtros, no productos. |
| Paginado infinito | `src/features/catalog/catalogApi.ts` | `infiniteQuery` con cursor; `getNextPageParam` devuelve `undefined` para cortar. |
| Navegación tipada | `src/navigation/types.ts` | `ParamList` + `declare global` en `ReactNavigation.RootParamList`. |
| Manejo de 401 | `src/services/api/baseApi.ts`, `src/services/api/sessionEvents.ts` | Wrapper del baseQuery que despacha un evento neutral; evita que services dependa de features. |
| Seguridad del token | `src/services/storage/asyncStorage.ts` | AsyncStorage no está cifrado; en producción va Keychain. Está detrás de una interfaz para cambiarlo en un archivo (ADR-003). |
| Persistencia sin ensuciar reducers | `src/services/session/`, `src/services/favorites/favoritesListeners.ts` | `createListenerMiddleware`: los reducers quedan puros y síncronos. |
| MSW | `src/mocks/` | Intercepta a nivel red: cero código de mocking en la app, mismos handlers en dev y en tests. |
| Performance de listas | `src/features/catalog/components/ProductCard.tsx` | `getItemLayout` con altura fija, `keyExtractor` estable, filas memoizadas. |
| Estrategia de testing | `src/features/catalog/__tests__/ProductListScreen.test.tsx` | Integración real contra MSW, sin mockear el store ni la red a mano. |
| Escala a 40 pantallas | `eslint.config.js` | La regla de dependencias entre features está enforceada por el linter, no por disciplina. |

- [ ] **Step 4: Tomar las capturas**

```bash
npm run ios
```

Con la app corriendo, capturar cada pantalla (`Cmd+S` en el simulador) y guardarlas en `docs/screenshots/` con los nombres `login.png`, `catalog.png`, `detail.png`, `favorites.png`, `performance-lab.png`. Referenciarlas desde el README.

- [ ] **Step 5: Verificar la cobertura contra el umbral**

Run: `npm test -- --coverage`
Expected: PASS, sin que `coverageThreshold` rompa.

Si rompe, la acción es **agregar un test que falte**, no bajar el umbral. Si el umbral es genuinamente irreal para un archivo de presentación, excluirlo de `collectCoverageFrom` con un comentario que diga por qué.

- [ ] **Step 6: Verificación completa desde un clon limpio**

```bash
cd /tmp && rm -rf catalog-verify
git clone /Users/emilianomartino/Documents/rn-product-catalog catalog-verify
cd catalog-verify && npm ci && npm run lint && npm run typecheck && npm test -- --coverage
```

Expected: los cuatro comandos en verde sin ningún paso manual extra. Si falta algo, el README está incompleto: arreglarlo y repetir.

- [ ] **Step 7: Marcar el spec como implementado**

En `docs/superpowers/specs/2026-08-30-rn-product-catalog-design.md`, cambiar `**Estado:** aprobado (pendiente de plan de implementación)` por `**Estado:** implementado — ver docs/superpowers/plans/2026-08-30-rn-product-catalog.md`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs: CLAUDE.md, README con notas de entrevista y capturas"
```

- [ ] **Step 9: Publicar en GitHub**

```bash
gh repo create rn-product-catalog --public --source=. --remote=origin --push
```

Verificar que el workflow de CI corre y queda en verde: `gh run watch`. El badge del README debe mostrar `passing`.

---

## Autorrevisión del plan

**Cobertura del spec:** las 13 secciones tienen task. §1 criterios → Tasks 1 y 16; §2 stack → Task 1; §3 arquitectura → Tasks 5–15; §4.1 auth → 7–8; §4.2 catálogo → 10–12; §4.3 detalle → 14; §4.4 favoritos → 13; §4.5 perfil y lab → 15; §5 memoización (3 niveles + contrapunto) → 10, 12, 14, 15; §6 backend mockeado → 3–4; §7 testing → distribuido, con los 6 archivos de la tabla del spec cubiertos; §8 types → 1; §9 lint → 1; §10 CI → 1; §11 docs → 16; §12 ADRs → 16 Step 2.

**Deuda conocida que el plan corrige sobre la marcha:** la regla de dependencias fuerza dos movimientos que el árbol del spec no anticipaba —`getProduct` a `services/api/productsApi.ts` (Task 13) y el estado de sesión a `services/session/` (Task 15)—. Ambos están planificados, no improvisados, y son material de entrevista por sí mismos.
