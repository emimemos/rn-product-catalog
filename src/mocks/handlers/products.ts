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
  // The third generic of `http.*` fixes the response body type: without it,
  // TS infers it from the first branch and rejects the rest.
  http.get<never, never, ApiErrorBody | ProductsPage>(
    `${API_BASE_URL}/products`,
    async ({request}) => {
      const url = new URL(request.url);
      await maybeDelay();

      // Fault injection. Not reachable from the app: `catalogApi` builds the
      // query string and doesn't expose this parameter. It exists for the
      // tests, and so it can be hit by hand from an HTTP client against the
      // dev shim without touching code.
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
          Number.isFinite(limitParam) && limitParam > 0
            ? limitParam
            : PAGE_SIZE,
      });

      return HttpResponse.json<ProductsPage>(page);
    },
  ),

  http.get<{id: string}, never, ApiErrorBody | Product>(
    `${API_BASE_URL}/products/:id`,
    async ({params}) => {
      await maybeDelay();
      const product = findProduct(params.id);

      if (!product) {
        return HttpResponse.json<ApiErrorBody>(
          {message: 'Product not found'},
          {status: 404},
        );
      }

      return HttpResponse.json<Product>(product);
    },
  ),
];
