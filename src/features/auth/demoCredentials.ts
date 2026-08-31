/**
 * Demo credentials shown on the login screen under `__DEV__`.
 *
 * They live here, in the feature itself, and are not imported from
 * `@/mocks/db`: that directory is dev/test infrastructure that gets deleted
 * whole the day a real backend exists, and a production screen can't depend
 * on something that disappears without warning. The duplication is guarded
 * by a test that compares these values against the credentials the mock
 * server actually accepts.
 */
export const DEMO_EMAIL = 'demo@catalog.dev';
export const DEMO_PASSWORD = 'password123';
