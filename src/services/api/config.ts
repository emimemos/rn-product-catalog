/**
 * Host ficticio: no existe ningún servidor detrás. En los tests, msw/node
 * intercepta a nivel de red; en dev, el entrypoint de la app instala un shim
 * de fetch que enruta contra los mismos handlers. En ambos casos la app hace
 * la misma llamada a `fetch` y no sabe que está mockeada. El día que exista
 * un backend, cambia solo esta línea.
 */
export const API_BASE_URL = 'http://localhost:3000/api';

export const PAGE_SIZE = 10;
