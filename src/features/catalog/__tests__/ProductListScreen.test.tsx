import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import React from 'react';

import {server} from '@/mocks/server.node';
import {API_BASE_URL} from '@/services/api/config';
import {renderWithProviders} from '@/test/renderWithProviders';

import {catalogApi} from '../catalogApi';
import {SEARCH_DEBOUNCE_MS} from '../components/SearchBar';
import {ProductListScreen} from '../screens/ProductListScreen';

/**
 * Destraba el debounce del buscador sin abandonar los temporizadores fake a
 * mitad de vuelo.
 *
 * `jest.advanceTimersByTime` (sincrónico) más un `jest.useRealTimers()`
 * inmediatamente después dispara un bug real de `@reduxjs/toolkit`: su
 * `autoBatchEnhancer` encola la notificación a los suscriptores con
 * `requestAnimationFrame` (con un `setTimeout` de respaldo), y si esa cola
 * queda armada bajo timers fake y el test pasa a reales antes de que se
 * dispare, la notificación pendiente queda huérfana. Redux sigue procesando
 * las acciones (el estado final del store es correcto), pero React nunca se
 * entera: el componente deja de re-renderizar para siempre, incluso ante
 * cambios posteriores, aunque el store ya tenga el resultado. Se reprodujo de
 * forma aislada con un componente mínimo suscripto a esta misma infinite
 * query — no es específico de esta pantalla, y no hay forma de evitarlo
 * cambiando cómo se consume el hook.
 * `jest.advanceTimersByTimeAsync` evita el problema: intercala el avance del
 * reloj fake con el drenado de promesas (el fetch contra msw), así que el
 * pedido a la nueva query se resuelve sin nunca soltar los timers fake a
 * mitad de camino.
 */
async function waitOutDebounce() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 50);
  });
}

const navigation = {navigate: jest.fn()};

/** Los argumentos con los que el catálogo arranca, sin filtros ni búsqueda. */
const selectDefaultPage = catalogApi.endpoints.getProducts.select({
  q: '',
  category: 'all',
  sort: 'name',
});

function renderScreen() {
  return renderWithProviders(
    <ProductListScreen
      navigation={navigation as never}
      route={{key: 'k', name: 'ProductList'} as never}
    />,
  );
}

describe('ProductListScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('muestra el skeleton mientras carga', async () => {
    renderScreen();
    expect(screen.getByTestId('list-skeleton')).toBeVisible();
    // Se espera a que la carga inicial asiente para que el dispatch async del
    // fetch caiga dentro del test, no después: si el test termina apenas se
    // afirma el skeleton, esa resolución llega fuera del `act` de este test.
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
  });

  it('muestra la primera página de productos', async () => {
    renderScreen();
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
    expect(screen.queryByTestId('list-skeleton')).toBeNull();
  });

  it('filtra la lista al buscar', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-list')).toBeVisible(),
    );

    fireEvent.changeText(screen.getByTestId('search-input'), 'Gamepad');
    await waitOutDebounce();

    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(screen.queryByText('Auriculares Atlas')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay coincidencias', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-list')).toBeVisible(),
    );

    fireEvent.changeText(screen.getByTestId('search-input'), 'zzzznoexiste');
    await waitOutDebounce();

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
    expect(navigation.navigate).toHaveBeenCalledWith('ProductDetail', {
      productId: 'p-005',
    });
  });
});

/**
 * Las tres interacciones de la lista —pull-to-refresh, reintento tras error y
 * scroll infinito— no se distinguen mirando la pantalla: con datos de mock
 * estáticos, un refetch exitoso pinta exactamente lo mismo que un no-op. Lo
 * que sí las distingue es cuántas requests salieron y con qué parámetros, y
 * eso es lo que se afirma acá.
 *
 * El conteo se toma del stream de eventos de msw en vez de reemplazar el
 * handler por un espía: así se cuentan las requests que realmente salieron por
 * la red interceptada, contra los mismos handlers que sirven al resto de la
 * suite y a la app en dev.
 */
describe('ProductListScreen — requests que dispara cada interacción', () => {
  const requests: string[] = [];

  beforeEach(() => {
    requests.length = 0;
    server.events.on('request:start', ({request}) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/products')) {
        requests.push(request.url);
      }
    });
  });

  afterEach(() => {
    server.events.removeAllListeners();
    jest.clearAllMocks();
  });

  /**
   * `FlatList` reprograma su ventana de celdas con un batcher de ~50 ms cuando
   * cambia la cantidad de items. Se lo espera dentro de `act` en vez de dejar
   * que dispare después del test: si no, la actualización cae fuera del `act`
   * de este test y React avisa desde el archivo siguiente.
   */
  async function settleList(): Promise<void> {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  }

  it('pull-to-refresh dispara exactamente una request más, con los mismos parámetros', async () => {
    renderScreen();
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
    expect(requests).toHaveLength(1);

    fireEvent(screen.getByTestId('product-list'), 'refresh');

    await waitFor(() => expect(requests).toHaveLength(2));
    // Un refetch, no una página nueva: misma URL, sin cursor.
    expect(requests[1]).toBe(requests[0]);
    expect(screen.getByText('Auriculares Atlas')).toBeVisible();
    await settleList();
  });

  it('el reintento tras un error vuelve a pedir y pinta la lista', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products`, () =>
        HttpResponse.json({message: 'Boom'}, {status: 500}),
      ),
    );
    renderScreen();
    expect(await screen.findByTestId('retry')).toBeVisible();
    expect(requests).toHaveLength(1);

    // Se restauran los handlers por defecto para que el reintento encuentre
    // una API sana: lo que se prueba es que el botón vuelve a pedir, no que la
    // API siga rota.
    server.resetHandlers();
    fireEvent.press(screen.getByTestId('retry'));

    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
    expect(requests).toHaveLength(2);
    await settleList();
  });

  it('llegar al final de la lista pide la página siguiente con el cursor de la última fila', async () => {
    const {store} = renderScreen();
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).not.toContain('cursor=');

    fireEvent(screen.getByTestId('product-list'), 'endReached');

    await waitFor(() =>
      expect(selectDefaultPage(store.getState()).data?.pages).toHaveLength(2),
    );
    expect(requests).toHaveLength(2);
    // `p-010` es el último producto de la primera página con el orden por
    // nombre: el cursor sale de los datos, no de un contador de páginas.
    expect(requests[1]).toContain('cursor=p-010');

    const list = screen.getByTestId('product-list');
    expect((list.props as {data: unknown[]}).data).toHaveLength(20);
    await settleList();
  });

  it('no pide nada más cuando ya no quedan páginas', async () => {
    // La categoría `audio` tiene exactamente 10 productos, que es el tamaño de
    // página: la primera respuesta ya viene sin `nextCursor`, así que
    // `hasNextPage` es false y el handler de scroll tiene que cortar solo.
    renderWithProviders(
      <ProductListScreen
        navigation={navigation as never}
        route={{key: 'k', name: 'ProductList'} as never}
      />,
      {preloadedState: {catalog: {query: '', category: 'audio', sort: 'name'}}},
    );
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
    expect(requests).toHaveLength(1);

    fireEvent(screen.getByTestId('product-list'), 'endReached');
    await settleList();

    expect(requests).toHaveLength(1);
  });
});
