import {createAction} from '@reduxjs/toolkit';

/**
 * services/ no puede importar de features/ (misma regla de dependencias que
 * aplica entre features, enforceada en eslint.config.js), pero necesita avisar
 * que la sesión caducó al recibir un 401. Este action creator neutral invierte
 * la dependencia: services lo despacha, sessionSlice lo escucha.
 */
export const unauthorized = createAction('session/unauthorized');
