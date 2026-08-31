import {createAction} from '@reduxjs/toolkit';

/**
 * services/ no puede importar de features/ (`import/no-restricted-paths` en
 * eslint.config.js declara esa zona, igual que la que separa una feature de
 * otra), pero necesita avisar que la sesión caducó al recibir un 401. Este
 * action creator neutral invierte la dependencia: services lo despacha,
 * sessionSlice lo escucha.
 */
export const unauthorized = createAction('session/unauthorized');
