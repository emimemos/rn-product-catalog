import {API_BASE_URL} from '@/services/api/config';

import {handlers} from './handlers';

/**
 * `msw/native` intercepta a nivel de módulo nativo, pero su interceptor de
 * fetch asume el pipeline de streams del fetch estándar y no el de React
 * Native, así que el body de la respuesta llega vacío del otro lado. Este
 * shim reemplaza `fetch` a nivel de entrypoint y enruta cada request contra
 * los mismos `handlers` que usan los tests (vía `handler.run`, sin pasar por
 * ningún interceptor de red), así que el contrato de API sigue teniendo una
 * sola fuente de verdad.
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

    // No devolver el fallo a la red real: un handler faltante debe ser
    // visible como tal, no como un "Network request failed" confuso.
    throw new Error(
      `No hay ningún handler de MSW para ${request.method} ${request.url}`,
    );
  };
  shim[INSTALLED_MARKER] = true;

  globalThis.fetch = shim;
}
