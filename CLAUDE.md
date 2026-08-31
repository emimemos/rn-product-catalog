# CLAUDE.md

Guía de orientación para trabajar en este repo: comandos, estructura, reglas y trampas ya
pisadas. Las decisiones de fondo (por qué esta librería y no otra) están en el README, sección
ADRs; acá va lo operativo.

## Comandos

```bash
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm test            # jest
npm run ios         # react-native run-ios
npm run android     # react-native run-android
npm start           # react-native start (solo el bundler, sin instalar nada)
```

Un test suelto, por archivo o por nombre:

```bash
npx jest src/features/catalog/__tests__/ProductListScreen.test.tsx
npx jest -t "muestra el estado de error"
```

Cobertura (usa el `coverageThreshold` de `jest.config.js`):

```bash
npm test -- --coverage
```

## Mapa de arquitectura

Árbol real (`find src -type d | sort`), una línea por carpeta:

```
src/app                     configureStore, listenerMiddleware, hooks tipados y composición de App
src/components/ui           primitivos de UI puros (Button, TextField, Screen, Skeleton, EmptyState,
                             ErrorView) más FavoriteButton, que despacha a Redux — no es un primitivo puro
src/features/auth           LoginScreen y las constantes de credenciales de demo
src/features/catalog        catalogApi (infiniteQuery), catalogSlice (solo UI: query/categoría/orden),
                             selectors, componentes de lista/filtro/orden, useDebouncedValue, las dos
                             pantallas (lista y detalle)
src/features/favorites      FavoritesScreen; el estado de favoritos vive en services/favorites
src/features/profile        ProfileScreen (logout) y PerformanceLabScreen (demo de memoización)
src/mocks                   "backend" en memoria: db.ts, handlers de MSW, arranque para RN y para Jest
src/navigation              RootNavigator (auth vs. app), AuthNavigator, AppTabs, CatalogStack,
                             ProfileStack, y los ParamList tipados
src/services/api            baseApi (fetchBaseQuery con manejo de 401), config, productsApi,
                             sessionEvents (action neutral para invertir la dependencia hacia sesión)
src/services/favorites      slice + listener de persistencia + selectors de favoritos por id
src/services/session        slice + api (login) + listener de persistencia + hook useSession
src/services/storage        interfaz Storage, implementación AsyncStorage y una en memoria para tests
src/test                    polyfills de Jest, setup global de MSW/RN, renderWithProviders
src/theme                   tokens de diseño (color, espaciado, tipografía, radios)
src/utils                   formatPrice y utilidades sin estado
```

Cada carpeta de `features/` y `services/` tiene su `__tests__/` al lado del código que prueba.

## Regla de dependencias

Una feature no importa de otra feature. Lo que dos o más features necesitan compartir sube un
nivel:

- A `components/ui` si es presentación reusable.
- A `services/` si es estado, lógica de red o persistencia. `session`, `favorites` y `productsApi`
  viven ahí en vez de en `features/auth`, `features/favorites` y `features/catalog` porque más de
  una pantalla los necesita (`ProductDetailScreen` y `FavoritesScreen` comparten `productsApi`;
  `ProfileScreen` y `RootNavigator` comparten `session`).
- A `utils/` si es una función pura sin estado.

`services/` tampoco importa de `features/`. Cuando `baseApi` necesita avisar que una sesión venció
(401), no importa `sessionSlice`: despacha un action creator neutral
(`src/services/api/sessionEvents.ts`) que `sessionSlice` escucha. La dependencia queda invertida.

Esto no es disciplina, es una regla de ESLint (`eslint.config.js`, bloque
`import/no-restricted-paths`): cruzar de una feature a otra, o de `services/` a `features/`, es
un error de lint, no una convención de code review. La regla resuelve cada import a un archivo
en disco antes de compararlo con la zona, así que `@/features/otra/x`, `../otra/x` y
`../../features/otra/x` fallan las tres por igual — importante, porque la convención de más
abajo pide usar imports relativos dentro de la propia feature. Las features se leen del disco
al cargar la config, así que una carpeta nueva bajo `src/features/` queda protegida sola.

Tres formas de romperla, las tres un error de lint: agregar
`import {DEMO_EMAIL} from '@/features/auth/demoCredentials';` a
`src/services/api/config.ts`; el mismo import en `src/features/catalog/selectors.ts`; y ese
mismo import escrito como `'../auth/demoCredentials'`. `npx eslint <archivo>` las rechaza a las
tres con el mensaje de la zona.

Es lo que hace que la arquitectura escale a más pantallas sin que dependa de que alguien se
acuerde de la regla.

## Estado servidor vs. estado cliente

RTK Query (`baseApi`, `catalogApi`/`productsApi`, `sessionApi`) es dueño de todo lo que viene de
la red: catálogo, detalle de producto, usuario autenticado. Tiene su propio cache, tags,
deduplicación y estados de carga; no se duplica nada de esto en un slice.

Los slices de Redux (`catalogSlice`, `favoritesSlice`, `sessionSlice`) guardan únicamente estado
de cliente: `catalogSlice` guarda la búsqueda/categoría/orden elegidos, no los productos;
`favoritesSlice` guarda una lista de ids, no los productos favoritos (esos se resuelven leyendo el
cache de RTK Query — ver la nota de "Favoritos por id" en el README); `sessionSlice` guarda el
token y el estado de autenticación, no el perfil completo (eso lo trae `sessionApi`).

## Convenciones

- Named exports en todos lados, salvo `App` (necesita default export para `AppRegistry`).
- Tests en `__tests__/` junto al código que prueban, no en un directorio `__tests__` global.
- `testID` en kebab-case (`product-card-${id}`, `login-submit`, `lab-render-count-memo-0`).
- Imports ordenados por `import/order`: builtins/externos, luego internos (`@/...`), luego
  relativos, con línea en blanco entre grupos y alfabetizados dentro de cada uno. Lo aplica el
  linter, no hace falta ordenarlos a mano si `eslint --fix` corre en pre-commit.

## Estrategia de testing

Pocos tests, elegidos por comportamiento: lo que tiene lógica se testea (reducers, selectors,
hooks, integración de pantalla contra MSW); lo que es presentación pura no. No hay snapshots de
UI grandes — son frágiles y no defienden nada que un test de comportamiento no defienda mejor.

`src/test/renderWithProviders.tsx` envuelve en un store de Redux fresco y en `NavigationContainer`
para no repetir ese setup en cada archivo. MSW corre con `onUnhandledRequest: 'error'` en los
tests (`src/test/setup.ts`): una request no mockeada hace fallar el test en vez de colgarlo o
devolver datos silenciosamente equivocados.

## Gotchas

- **El alias `@/` hace falta en tres archivos, no en uno.** `tsconfig.json` (`paths`),
  `babel.config.js` (`babel-plugin-module-resolver`) y `jest.config.js` (`moduleNameMapper`)
  resuelven el alias en tres herramientas distintas (TypeScript, Metro/Babel, Jest) que no se leen
  la configuración entre sí. Agregar un alias nuevo sin tocar los tres rompe una de las tres
  cadenas de forma silenciosa según qué comando se corra.

- **MSW en React Native necesitó cuatro arreglos de toolchain, y al final no intercepta a nivel
  nativo.** `msw/native` fue probado, no descartado por sospecha: en RN 0.87.1 su
  `FetchInterceptor` devuelve el body vacío contra `fetch` nativo (`SyntaxError: JSON Parse error:
Unexpected end of input`), un problema de transporte que ningún polyfill adicional resuelve. En
  el camino hicieron falta cuatro piezas de toolchain que sí eran necesarias de todas formas:
  `@babel/plugin-transform-class-static-block` (Metro no bundlea sin él), `web-streams-polyfill`,
  un stub de `BroadcastChannel`, y registrar `AppRegistry.registerComponent` de forma síncrona en
  `index.js` en vez de esperar una promesa (si no, la app no arranca en frío, con o sin MSW). El
  resultado: en tests, `msw/node` intercepta de verdad; en dev, el entrypoint instala un shim de
  ~20 líneas sobre `globalThis.fetch` que enruta a los mismos handlers. Ver ADR-005 en el README
  para la propiedad que sí se sostiene con esto.

- **`jest.config.js` mapea `msw/node`, `immer` y `react-redux` a sus builds CJS a mano, en vez de
  usar `customExportConditions: ['react-native']`.** Esa condición global sí resuelve estos tres
  paquetes, pero también cambia qué build resuelven React Navigation, `react-native-screens`,
  `react-native-safe-area-context` y `use-sync-external-store` — paquetes que a propósito quieren
  la condición `react-native` de sus `exports`. Un mapper puntual falla ruidosamente
  ("module not found") si la ruta que apunta deja de existir; un cambio de condición global puede
  resolver silenciosamente el paquete equivocado. Los tres mappers documentan además, cada uno,
  qué paquete se está sorteando y por qué (ver los comentarios en el archivo).

- **RTK Query agenda un `requestAnimationFrame` para su auto-batching, y el preset de Jest de RN
  lo implementa como un `setTimeout(0)` real.** Eso puede dispararse después de que un test ya
  terminó y su store fue descartado, produciendo actualizaciones fuera de `act()` de forma
  intermitente. `src/test/setup.ts` reemplaza ese timer por un `queueMicrotask`, solo en el
  entorno de test — la configuración de producción no se toca para acomodar esto.

- **`noUncheckedIndexedAccess` obliga a chequear cualquier acceso por índice** (`array[i]`,
  `record[key]`) antes de usarlo, porque TypeScript lo tipa como `T | undefined` en vez de `T`. No
  hay `!` de aserción no nula en `src/` para esquivarlo: donde el acceso puede fallar, se maneja
  con un `if`, un valor por defecto o un narrowing explícito.

- **New Architecture (Fabric + TurboModules) está activa por defecto**, no es una bandera que se
  prendió a mano: `android/gradle.properties` trae `newArchEnabled=true` y el `Podfile` de iOS
  también la asume, porque así viene el template de RN 0.87.1. El renderer es C++ y no hay bridge
  asíncrono de por medio.

- **El bundle de producción no debe poder importar `src/mocks/`.** `metro.config.js` resuelve
  `./msw.polyfills` y `./src/mocks/server.native` a un módulo vacío cuando `context.dev` es falso,
  así que aunque algo llegara a importar esas rutas en un build de release, no arrastra MSW ni los
  ~50 productos de fixture al bundle. Medido: 1.565.061 bytes con esos módulos incluidos a mano
  contra ~897.000 bytes con el stub activo. Las credenciales de demo (`src/features/auth/demoCredentials.ts`)
  son una copia propia de la feature, no un import de `src/mocks/db.ts`, con un test que las
  compara para que no diverjan: así el día que se borre `src/mocks/` la app sigue compilando.

## Decisiones

Los tradeoffs de fondo — por qué bare RN y no Expo, por qué AsyncStorage y no Keychain, qué pasó
realmente con MSW en RN, qué versiones quedaron pineadas y por qué — están en el README, sección
**ADRs**.
