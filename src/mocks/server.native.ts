import {API_BASE_URL} from '@/services/api/config';

import {handlers} from './handlers';

/**
 * `msw/native` intercepts at the native module level, but its fetch
 * interceptor assumes the standard fetch's stream pipeline, not React
 * Native's, so the response body arrives empty on the other side. This shim
 * replaces `fetch` at the entrypoint level and routes each request against
 * the same `handlers` the tests use (via `handler.run`, without going through
 * any network interceptor), so the API contract still has a single source of
 * truth.
 */

const INSTALLED_MARKER = Symbol.for('rn-product-catalog.mswFetchShim');

interface MarkedFetch {
  [INSTALLED_MARKER]?: true;
}

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

function toRequest(input: FetchInput, init?: FetchInit): Request {
  if (input instanceof Request) {
    return init ? new Request(input, init) : input;
  }
  return new Request(input, init);
}

export async function startMockServer(): Promise<void> {
  const current = globalThis.fetch as typeof globalThis.fetch & MarkedFetch;
  if (current[INSTALLED_MARKER]) {
    return;
  }

  const original = globalThis.fetch;
  const shim: typeof globalThis.fetch & MarkedFetch = async (input, init) => {
    const request = toRequest(input, init);
    if (!request.url.startsWith(API_BASE_URL)) {
      return original(input, init);
    }

    for (const handler of handlers) {
      const result = await handler.run({
        request,
        requestId: String(Date.now()),
      });
      if (result?.response) {
        return result.response;
      }
    }

    // Don't hand the failure to the real network: a missing handler must be
    // visible as such, not as a confusing "Network request failed".
    throw new Error(`No MSW handler for ${request.method} ${request.url}`);
  };
  shim[INSTALLED_MARKER] = true;

  globalThis.fetch = shim;
}
