# Diseño: rn-product-catalog

**Fecha:** 2026-08-30
**Estado:** implementado — ver docs/superpowers/plans/2026-08-30-rn-product-catalog.md. Algunas
afirmaciones de este documento fueron revisadas durante la implementación (ver notas fechadas en
las secciones 2, 5 y 12, y el README del repo para el detalle completo).
**Autor:** Emiliano Martino (con Claude Code)

---

## 1. Propósito

Aplicación React Native construida como **pieza de portfolio para una entrevista técnica**. El
objetivo no es el producto en sí, sino que cada decisión del código sea **defendible en voz alta**:
por qué esta arquitectura, por qué esta librería, por qué esta memoización, qué tradeoff se asumió.

### Criterios de éxito

1. `npm run lint`, `npm run typecheck` y `npm test` pasan en verde, y CI lo demuestra públicamente.
2. La app corre en el simulador de iOS y en Android desde un clon limpio siguiendo el README.
3. Para cada tema esperable en una entrevista de React Native existe **un archivo concreto** que lo
   demuestra, listado en el README.
4. La memoización se puede **mostrar funcionando en vivo**, no solo explicar.
5. Los tradeoffs asumidos están documentados por escrito antes de que el entrevistador los encuentre.

### No objetivos (YAGNI)

- Backend real, base de datos o autenticación real.
- Dark mode / theming dinámico, i18n, Detox E2E, animaciones complejas, push notifications.
- Cobertura de tests del 100%. Se testea lo que tiene lógica, no los componentes de presentación.

---

## 2. Stack

Versiones verificadas en npm el 2026-08-30.

| Pieza                                     | Versión                              | Justificación                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Native (CLI bare)                   | 0.87.1                               | Última estable. New Architecture (Fabric + TurboModules) activa por defecto. Bare, no Expo, para poder hablar del layer nativo (Podfile, Gradle, autolinking). |
| React                                     | 19.2.3                               | Peer dependency de RN 0.87.                                                                                                                                    |
| React Navigation                          | 7.x — `native-stack` + `bottom-tabs` | Estándar de facto. `native-stack` usa navegadores nativos (mejor performance y gestos que `stack`).                                                            |
| Redux Toolkit                             | 2.12                                 | Estado global de la app y capa de datos.                                                                                                                       |
| RTK Query                                 | (incluido en RTK 2.12)               | Cache de red, tags, `infiniteQuery` para paginado.                                                                                                             |
| react-redux                               | 9.3                                  |                                                                                                                                                                |
| MSW                                       | 2.15 (`msw/native` + `msw/node`)     | Mock a nivel red: la app hace HTTP real y no sabe que está mockeada.                                                                                           |
| TypeScript                                | 5.x (el del template de RN)          | **No 7.0.2.** Ver ADR-002.                                                                                                                                     |
| Jest                                      | 30                                   | Con el preset de React Native.                                                                                                                                 |
| @testing-library/react-native             | 14                                   | Tests centrados en comportamiento del usuario.                                                                                                                 |
| ESLint 10 + Prettier                      |                                      | Con `@react-native/eslint-config`.                                                                                                                             |
| husky + lint-staged                       |                                      | Pre-commit.                                                                                                                                                    |
| @react-native-async-storage/async-storage |                                      | Persistencia de sesión y favoritos. Ver ADR-003.                                                                                                               |

> **Corregido el 2026-08-31 tras la implementación.** El template de RN 0.87.1 pinea TypeScript
> 6.0.3, ESLint 8.57.1 y Jest 29.7.0 en vez de TS 5.x / ESLint 10 / Jest 30. Se aceptaron esas
> versiones en vez de forzar las de esta tabla: lo sustantivo de ADR-002 (no TypeScript 7.x) se
> sostiene igual. Ver ADR-002 y la tabla de stack del README para el detalle.

### Riesgo de versión

RN 0.87.1 es muy reciente. Si el build nativo falla (CocoaPods contra Xcode 26.6, o Gradle contra
JDK 17), **el fallback es RN 0.86.3**, que no requiere ningún cambio en el código de la aplicación —
solo se regenera el template. Esta decisión se toma en el primer paso del plan, no después.

---

## 3. Arquitectura

### 3.1 Organización: feature-based

```
rn-product-catalog/
├── .github/workflows/ci.yml
├── android/                      # generado por el template
├── ios/                          # generado por el template
├── docs/superpowers/specs/       # este documento
├── src/
│   ├── app/
│   │   ├── App.tsx               # composición de providers
│   │   ├── store.ts              # configureStore + tipos RootState/AppDispatch
│   │   └── hooks.ts              # useAppDispatch / useAppSelector tipados
│   ├── navigation/
│   │   ├── RootNavigator.tsx     # decide Auth vs App según estado de sesión
│   │   ├── AuthNavigator.tsx
│   │   ├── AppTabs.tsx
│   │   ├── CatalogStack.tsx
│   │   └── types.ts              # ParamLists + declaración global de RootParamList
│   ├── features/
│   │   ├── auth/
│   │   │   ├── authSlice.ts
│   │   │   ├── authApi.ts
│   │   │   ├── screens/LoginScreen.tsx
│   │   │   ├── hooks/useAuth.ts
│   │   │   └── __tests__/
│   │   ├── catalog/
│   │   │   ├── catalogApi.ts
│   │   │   ├── catalogSlice.ts   # solo UI state: query, categoría, orden
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
│   │   ├── api/baseApi.ts        # createApi + baseQuery con auth y manejo de 401
│   │   └── storage/              # interfaz Storage + implementación AsyncStorage
│   ├── theme/tokens.ts           # colores, spacing, tipografía (constantes, no runtime theming)
│   ├── mocks/
│   │   ├── db.ts                 # fixtures + lógica de búsqueda/filtro/paginado
│   │   ├── handlers/auth.ts
│   │   ├── handlers/products.ts
│   │   ├── handlers/index.ts     # compartido entre app y tests
│   │   ├── server.native.ts      # setupServer de msw/native (solo __DEV__)
│   │   └── server.node.ts        # setupServer de msw/node (solo tests)
│   └── test/
│       ├── setup.ts
│       └── renderWithProviders.tsx
├── CLAUDE.md
└── README.md
```

**Regla de dependencias.** Una feature puede importar de `components/ui`, `services`, `theme` y
`navigation/types`. Una feature **no** importa de otra feature: si dos necesitan lo mismo, sube a
`components/ui` o `services`. `favorites` referencia productos solo por `id`, resolviendo los datos
desde el cache de RTK Query, para no acoplarse a `catalog`.

Esto responde de forma concreta a "¿cómo escala esto a 40 pantallas?".

### 3.2 Flujo de datos

```
Pantalla
  → hook de RTK Query (useGetProductsInfiniteQuery)
      → baseApi (fetchBaseQuery, inyecta Authorization desde el store)
          → fetch nativo
              → MSW intercepta (en dev y en tests)
                  → mocks/db.ts aplica filtro, orden y paginado
  ← cache normalizado por tags
Pantalla ← useAppSelector(selector memoizado con createSelector)
```

Separación deliberada: **RTK Query es dueño del estado del servidor** (productos, usuario);
**los slices son dueños del estado del cliente** (sesión, query de búsqueda, categoría, favoritos).
No se duplica la data del servidor dentro de slices. Esa distinción es en sí una respuesta de
entrevista.

---

## 4. Funcionalidad

### 4.1 Autenticación

- `LoginScreen` con email y password, validación en el submit (formato de email, password mínimo),
  estados de loading, error de credenciales y error de red diferenciados.
- Las credenciales de prueba se muestran en pantalla en `__DEV__` para que la demo sea inmediata.
- `POST /api/auth/login` responde `{ accessToken, user }` o `401`.
- El token se persiste; al arrancar, `RootNavigator` hace bootstrap (splash → Auth o App) leyendo
  storage antes del primer render de navegación.
- Logout limpia el token, resetea el store y **invalida el cache de RTK Query** (`api.util.resetApiState`).

### 4.2 Catálogo

- `FlatList` de productos con:
  - búsqueda con debounce de 300 ms (`useDebouncedValue`),
  - filtro por categoría,
  - orden por precio o nombre,
  - **paginado infinito** con `infiniteQuery` de RTK Query 2.12,
  - pull to refresh.
- Estados explícitos: skeleton de carga, lista vacía (`EmptyState`), error con reintento (`ErrorView`).
- `ProductCard` es `React.memo`, con `getItemLayout` y `keyExtractor` estables.

### 4.3 Detalle

- Params tipados (`ProductDetail: { productId: string }`), sin `any`.
- Reusa el cache de RTK Query: si el producto ya está, se pinta al instante y revalida en background.
- Toggle de favorito.

### 4.4 Favoritos

- Slice persistido en AsyncStorage.
- Resuelve los productos desde el cache; si falta alguno, lo pide por `id`.

### 4.5 Perfil y Performance Lab

- Perfil: datos del usuario, logout, y entrada al Performance Lab.
- **`PerformanceLabScreen`**: dos listas equivalentes lado a lado —una sin memoizar y otra
  memoizada— con un **contador de renders visible por fila**. Un input arriba fuerza re-renders del
  padre. Al tipear, la lista izquierda re-renderiza todas las filas y la derecha ninguna.

  Es la pieza central de la demo: permite **mostrar** la memoización en lugar de solo describirla, y
  abre naturalmente la conversación sobre cuándo la memoización **no** vale la pena.

---

## 5. Demostración de useMemo / useCallback

Tres niveles, pensados para ser recorridos en ese orden durante la entrevista.

**Nivel 1 — en el código real (`ProductListScreen`).**
`useCallback` en `renderItem` y `keyExtractor`; `useMemo` en la lista derivada
(filtrada + ordenada); `React.memo` en `ProductCard`.

> **Corregido el 2026-08-30 tras medirlo.** La versión original de este documento afirmaba que
> `React.memo` en la fila es inútil si `renderItem` se recrea en cada render. Se instrumentó el
> cuerpo de `ProductCard` y se contaron los renders: al tipear en el buscador, 10 con `useCallback`
> en `renderItem` y 10 sin él; forzando re-renders del padre sin cambiar la data, 0 y 0. La razón es
> que `FlatList` envuelve cada fila en un `CellRenderer` que ya es `PureComponent`: aunque cambie la
> identidad de `renderItem`, la celda produce un elemento nuevo con las mismas props y `React.memo`
> corta igual. Lo que sostiene la memoización es que **`onPressProduct` esté memoizado**, porque eso
> mantiene estables las props de la fila. El `useCallback` en `renderItem` se conserva por una razón
> más acotada: evita re-renderizar los wrappers internos de la lista, no las filas.

El punto a explicar deja de ser la regla repetida y pasa a ser la medición: la memoización se
justifica por costo medido, no por reflejo.

**Nivel 2 — fuera de React (`catalog/selectors.ts`).**
`createSelector` de Reselect. Explica memoización a nivel store y por qué un selector inline dentro
de `useSelector` que devuelve un objeto o array nuevo dispara re-renders en cada dispatch.

**Nivel 3 — medible (`PerformanceLabScreen`).**
El contador de renders convierte el argumento en evidencia.

**Contrapunto obligatorio.** En `ProductDetailScreen` queda deliberadamente un cálculo barato **sin**
memoizar, con un comentario que explica por qué memoizarlo sería peor (el costo de `useMemo` supera
al del cálculo, y agrega ruido). Saber cuándo _no_ memoizar es lo que distingue una respuesta senior.

Además `useDebouncedValue` demuestra un custom hook con cleanup correcto de `useEffect`.

---

## 6. Backend mockeado

- `src/mocks/db.ts`: ~50 productos en memoria, en 5 categorías, más la lógica de búsqueda, filtro,
  orden y paginado por cursor. Es la "base de datos".
- `src/mocks/handlers/`: handlers de MSW. **Los mismos handlers alimentan la app en dev y los tests**
  — una sola fuente de verdad para el contrato de la API.
- Arranque: `msw/native` bajo `if (__DEV__)` en el entrypoint; `msw/node` en `test/setup.ts` con
  `onUnhandledRequest: 'error'`.
- Latencia artificial de 300–600 ms para que loading y skeletons sean visibles en la demo.
- Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/products` (query params `q`,
  `category`, `sort`, `cursor`, `limit`), `GET /api/products/:id`.
- **Inyección de fallos:** el query param `?fail=1` (o un toggle en el Performance Lab) fuerza un
  500, para demostrar el manejo de errores y el reintento en vivo.

El argumento de venta: como MSW intercepta a nivel red, **cero código de mocking vive en la app**.
El día que exista un backend real, se borra la carpeta `mocks/` y no cambia nada más.

---

## 7. Testing

Estrategia: **pocos tests, bien elegidos**, priorizando comportamiento sobre implementación.

| Archivo                      | Qué cubre                                    | Por qué                                            |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `authSlice.test.ts`          | Reducers y transiciones de estado            | Lógica pura, test rápido y estable                 |
| `catalog/selectors.test.ts`  | Memoización de `createSelector`              | Verifica que **no** recalcula con la misma entrada |
| `useDebouncedValue.test.ts`  | Debounce y cleanup                           | `jest.useFakeTimers()` + `renderHook`              |
| `LoginScreen.test.tsx`       | Validación, login exitoso, 401, error de red | Camino crítico del usuario                         |
| `ProductListScreen.test.tsx` | loading → data → búsqueda → vacío → error    | Test de integración real contra MSW                |
| `favoritesSlice.test.ts`     | Toggle y persistencia                        |                                                    |

- `renderWithProviders.tsx`: helper que envuelve en `Provider` de Redux con store fresco y en
  `NavigationContainer`. Evita repetir setup y es un buen ejemplo de higiene de tests.
- Sin snapshots de UI grandes: son frágiles y no prueban nada. Decisión defendible y documentada.
- `coverageThreshold` en `jest.config.js` sobre `src/features/**` y `src/services/**`.

---

## 8. Type checking

- `strict: true`, más `noUncheckedIndexedAccess` y `noImplicitOverride`.
- Path alias `@/*` → `src/*`, configurado en `tsconfig.json` **y** en `babel.config.js`
  (`babel-plugin-module-resolver`) — ambos son necesarios y explicar por qué es una buena pregunta.
- Navegación tipada: `RootStackParamList` y compañía, con `declare global { namespace ReactNavigation { interface RootParamList extends RootStackParamList {} } }`
  para que `navigate()` sea type-safe en toda la app sin importar tipos.
- Hooks de Redux tipados en `app/hooks.ts` — nunca `useSelector` crudo.
- `npm run typecheck` = `tsc --noEmit`, y corre en CI.
- Cero `any` en `src/`. Si hace falta, es `unknown` con narrowing.

---

## 9. Linting y formato

- `@react-native/eslint-config` como base. Se usa flat config (`eslint.config.js`) si la versión del
  paquete lo soporta; si no, `.eslintrc.js`. Se decide al scaffoldear, verificando el paquete real.
- Prettier integrado vía `eslint-config-prettier` (Prettier formatea, ESLint no pelea).
- `import/order` con grupos y línea en blanco entre ellos.
- Regla `no-console` como warning, con `console.error` permitido.
- husky + lint-staged: en pre-commit, `eslint --fix` y `prettier --write` sobre lo staged.

---

## 10. CI — GitHub Actions

`.github/workflows/ci.yml`, en push a `main` y en todo PR:

1. checkout, Node 20 con cache de npm
2. `npm ci`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test -- --coverage`

Sin build nativo en CI: es lento, frágil y no aporta a lo que este proyecto quiere demostrar —
decisión documentada en el README, no una omisión. Badge de estado en el README.

---

## 11. Documentación

**`CLAUDE.md`** — para el agente y para el lector humano: mapa de arquitectura, comandos, reglas de
dependencias entre features, convenciones de naming, estrategia de testing, gotchas conocidos
(MSW en RN, alias de babel, New Architecture) y las decisiones con su porqué.

**`README.md`** — setup desde clon limpio, credenciales de prueba, capturas, y una sección
**"Notas de entrevista"**: por cada tema (New Architecture, memoización, RTK Query vs Context,
navegación tipada, MSW, estrategia de testing, seguridad del token, performance de listas), el
archivo exacto donde está demostrado y la respuesta corta. Es la chuleta de repaso.

---

## 12. Decisiones y tradeoffs (ADRs cortos)

**ADR-001 — RN CLI bare en vez de Expo.**
Expo habría sido más rápido y estable. Se eligió bare para poder hablar de autolinking, Podfile,
Gradle y New Architecture, que es lo que suele preguntarse en entrevistas de RN. Costo aceptado:
setup más frágil.

**ADR-002 — TypeScript 5.x en vez de 7.0.2.**
TS 7 (el port a Go) es la última versión, pero su compatibilidad con `typescript-eslint` y con los
tipos de RN todavía no está asentada. Se prioriza un repo que compila hoy sobre uno que usa lo más
nuevo. Se revisa cuando el ecosistema se estabilice.

**ADR-003 — AsyncStorage en vez de Keychain para el token.**
`react-native-keychain` es lo correcto en producción (Keychain en iOS, EncryptedSharedPreferences en
Android). Se eligió AsyncStorage para minimizar dependencias nativas y reducir el riesgo de que el
build se rompa el día de la entrevista. **El tradeoff se declara explícitamente en el README y en el
código**, detrás de una interfaz `Storage` para que el reemplazo sea de un solo archivo.

**ADR-004 — RTK Query en vez de TanStack Query.**
Ambas son válidas. RTK Query gana acá porque el proyecto ya usa Redux Toolkit para estado de
cliente, y una sola librería para ambas cosas es menos superficie conceptual. TanStack Query sería
la mejor opción si el estado global fuera mínimo.

**ADR-005 — MSW en vez de una capa de servicios mockeada.**
MSW intercepta a nivel red, así que el código de la app no contiene ninguna rama de mocking, y los
mismos handlers sirven a los tests. Costo: una dependencia más y algo de configuración en RN.

> **Corregido el 2026-08-31 tras la implementación.** `msw/native` fue probado, no asumido, y no
> funciona en RN 0.87.1: su `FetchInterceptor` devuelve el body vacío contra el `fetch` nativo. En
> los tests, `msw/node` intercepta de verdad; en dev, el entrypoint instala un shim de ~20 líneas
> sobre `globalThis.fetch` que enruta a los mismos handlers. La propiedad que se sostiene es la que
> importa: cero código de mocking en `src/features/` y `src/services/`, verificable con grep, y
> borrar `src/mocks/` no toca nada más. Ver ADR-005 en el README para el detalle completo,
> incluida la medición de bundle de producción.

---

## 13. Orden de implementación sugerido

1. Scaffolding RN 0.87.1 (con verificación de build nativo y fallback a 0.86.3), TS, alias, ESLint,
   Prettier, husky, Jest, CI. **Verificar que lint + typecheck + test pasan en verde antes de seguir.**
2. `services/api`, `services/storage`, `mocks/` (db + handlers + arranque en dev y tests).
3. `components/ui` y `theme/tokens`.
4. Auth: slice, api, `LoginScreen`, bootstrap de sesión, tests.
5. Navegación: `RootNavigator`, tabs, stack, tipos.
6. Catálogo: api con `infiniteQuery`, slice de UI, selectors, lista, búsqueda, filtros, tests.
7. Detalle y favoritos.
8. Perfil y `PerformanceLabScreen`.
9. `CLAUDE.md` y `README.md` con las notas de entrevista.
10. Pasada final de verificación y publicación en GitHub.

Cada paso se cierra con lint, typecheck y tests en verde. Nada se da por hecho sin correr el comando.
