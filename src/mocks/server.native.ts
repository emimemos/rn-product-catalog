import {API_BASE_URL} from '@/services/api/config';

import {handlers} from './handlers';

/**
 * Fallback de ADR-005: `msw/native` intercepta a nivel de módulo nativo
 * (`fetch`/`XMLHttpRequest`), y ese camino no compiló con el bundler de Metro
 * de este proyecto (`@mswjs/interceptors` usa sintaxis que el preset de Babel
 * de RN no transforma). Este shim reemplaza `fetch` a nivel de entrypoint y
 * enruta cada request contra los mismos `handlers` que usan los tests, así que
 * el contrato de API sigue teniendo una sola fuente de verdad.
 */
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
