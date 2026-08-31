/**
 * Fake host: there's no server behind it. In tests, msw/node intercepts at
 * the network level; in dev, the app's entrypoint installs a fetch shim that
 * routes against the same handlers. In both cases the app makes the same
 * `fetch` call and doesn't know it's mocked. The day a backend exists, only
 * this line changes.
 */
export const API_BASE_URL = 'http://localhost:3000/api';

export const PAGE_SIZE = 10;
