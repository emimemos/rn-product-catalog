import {createAction} from '@reduxjs/toolkit';

/**
 * La capa de servicios no puede importar de features (regla de dependencias del
 * spec §3.1), pero necesita avisar que la sesión caducó al recibir un 401.
 * Este action creator neutral invierte la dependencia: services lo despacha,
 * sessionSlice lo escucha.
 */
export const unauthorized = createAction('session/unauthorized');
