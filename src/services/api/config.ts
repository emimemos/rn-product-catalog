/**
 * Host ficticio: no existe ningún servidor detrás. MSW intercepta a nivel de red
 * tanto en dev como en tests, así que la app hace HTTP real contra esta URL y no
 * sabe que está mockeada. El día que exista un backend, cambia solo esta línea.
 */
export const API_BASE_URL = 'http://localhost:3000/api';

export const PAGE_SIZE = 10;
