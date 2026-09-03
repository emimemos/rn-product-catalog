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
 * Unblocks the search box's debounce without abandoning the fake timers
 * mid-flight.
 *
 * `jest.advanceTimersByTime` (synchronous) plus a `jest.useRealTimers()`
 * immediately after triggers a real bug in `@reduxjs/toolkit`: its
 * `autoBatchEnhancer` queues the notification to subscribers with
 * `requestAnimationFrame` (with a `setTimeout` fallback), and if that queue is
 * armed under fake timers and the test switches to real ones before it fires,
 * the pending notification is orphaned. Redux keeps processing actions (the
 * store's final state is correct), but React never finds out: the component
 * stops re-rendering forever, even on later changes, even though the store
 * already has the result. This was reproduced in isolation with a minimal
 * component subscribed to this same infinite query — it isn't specific to
 * this screen, and there's no way to avoid it by changing how the hook is
 * consumed.
 * `jest.advanceTimersByTimeAsync` avoids the problem: it interleaves
 * advancing the fake clock with draining promises (the fetch against msw), so
 * the request for the new query resolves without ever releasing the fake
 * timers halfway through.
 */
async function waitOutDebounce() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 50);
  });
}

const navigation = {navigate: jest.fn()};

/** The arguments the catalog starts with, with no filters or search. */
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

  it('shows the skeleton while loading', async () => {
    renderScreen();
    expect(screen.getByTestId('list-skeleton')).toBeVisible();
    // We wait for the initial load to settle so the fetch's async dispatch
    // falls inside this test, not after: if the test ended right after
    // asserting the skeleton, that resolution would land outside this test's
    // `act`.
    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
  });

  it('shows the first page of products', async () => {
    renderScreen();
    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(screen.queryByTestId('list-skeleton')).toBeNull();
  });

  /**
   * A category switch queries a cache key RTK Query has never fetched
   * before, so it starts with no data for that key. That state comes back
   * as `isFetching: true, isLoading: false` — `isLoading` alone doesn't
   * cover it, so the screen used to fall through to the `FlatList` branch
   * with an empty `data` array and show "No results" while the new page
   * was still in flight.
   */
  it('shows the skeleton again when switching category, not the empty state', async () => {
    renderScreen();
    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();

    fireEvent.press(screen.getByTestId('category-audio'));

    expect(screen.getByTestId('list-skeleton')).toBeVisible();
    expect(screen.queryByText('No results')).toBeNull();

    expect(await screen.findByText('Headphones Atlas')).toBeVisible();
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
    await waitOutDebounce();

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
    await waitOutDebounce();

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

/**
 * The list's three interactions — pull-to-refresh, retry after an error, and
 * infinite scroll — can't be told apart by looking at the screen: with static
 * mock data, a successful refetch paints exactly the same thing as a no-op.
 * What does tell them apart is how many requests went out and with what
 * parameters, and that's what's asserted here.
 *
 * The count is taken from msw's event stream instead of replacing the handler
 * with a spy: that way we count the requests that actually went out over the
 * intercepted network, against the same handlers that serve the rest of the
 * suite and the app in dev.
 */
describe('ProductListScreen — requests each interaction triggers', () => {
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
   * `FlatList` reschedules its cell window with a ~50ms batcher when the item
   * count changes. We wait for it inside `act` instead of letting it fire
   * afterwards: otherwise the update lands outside this test's `act` and
   * React warns from the next file.
   */
  async function settleList(): Promise<void> {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  }

  it('pull-to-refresh triggers exactly one more request, with the same parameters', async () => {
    renderScreen();
    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(requests).toHaveLength(1);

    fireEvent(screen.getByTestId('product-list'), 'refresh');

    await waitFor(() => expect(requests).toHaveLength(2));
    // A refetch, not a new page: same URL, no cursor.
    expect(requests[1]).toBe(requests[0]);
    expect(screen.getByText('Gamepad Atlas')).toBeVisible();
    await settleList();
  });

  it('retrying after an error re-fetches and renders the list', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products`, () =>
        HttpResponse.json({message: 'Boom'}, {status: 500}),
      ),
    );
    renderScreen();
    expect(await screen.findByTestId('retry')).toBeVisible();
    expect(requests).toHaveLength(1);

    // The default handlers are restored so the retry finds a healthy API:
    // what's being tested is that the button re-fetches, not that the API
    // stays broken.
    server.resetHandlers();
    fireEvent.press(screen.getByTestId('retry'));

    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(requests).toHaveLength(2);
    await settleList();
  });

  it('reaching the end of the list requests the next page with the cursor of the last row', async () => {
    const {store} = renderScreen();
    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).not.toContain('cursor=');

    fireEvent(screen.getByTestId('product-list'), 'endReached');

    await waitFor(() =>
      expect(selectDefaultPage(store.getState()).data?.pages).toHaveLength(2),
    );
    expect(requests).toHaveLength(2);
    // `p-040` is the last product of the first page under name order: the
    // cursor comes from the data, not from a page counter.
    expect(requests[1]).toContain('cursor=p-040');

    const list = screen.getByTestId('product-list');
    expect((list.props as {data: unknown[]}).data).toHaveLength(20);
    await settleList();
  });

  it("doesn't request anything more once there are no pages left", async () => {
    // The `audio` category has exactly 10 products, which is the page size:
    // the first response already comes back with no `nextCursor`, so
    // `hasNextPage` is false and the scroll handler has to stop on its own.
    renderWithProviders(
      <ProductListScreen
        navigation={navigation as never}
        route={{key: 'k', name: 'ProductList'} as never}
      />,
      {preloadedState: {catalog: {query: '', category: 'audio', sort: 'name'}}},
    );
    expect(await screen.findByText('Headphones Atlas')).toBeVisible();
    expect(requests).toHaveLength(1);

    fireEvent(screen.getByTestId('product-list'), 'endReached');
    await settleList();

    expect(requests).toHaveLength(1);
  });
});
