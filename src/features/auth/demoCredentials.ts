/**
 * Credenciales de demo mostradas en la pantalla de login bajo `__DEV__`.
 *
 * Viven acá, en la propia feature, y no se importan de `@/mocks/db`: ese
 * directorio es infraestructura de dev/test que se borra entera el día que
 * exista un backend real, y una pantalla de producción no puede depender de
 * algo que desaparece sin avisar. La duplicación se vigila con un test que
 * compara estos valores contra las credenciales que el mock server acepta
 * de verdad.
 */
export const DEMO_EMAIL = 'demo@catalog.dev';
export const DEMO_PASSWORD = 'password123';
