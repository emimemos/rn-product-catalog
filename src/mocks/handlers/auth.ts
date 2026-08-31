import {delay, http, HttpResponse} from 'msw';

import {API_BASE_URL} from '@/services/api/config';
import type {
  ApiErrorBody,
  LoginRequest,
  LoginResponse,
} from '@/services/api/types';

import {DEMO_PASSWORD, DEMO_USER} from '../db';

export const ACCESS_TOKEN = 'demo-access-token';

/**
 * Latencia artificial solo fuera de los tests: en la demo hace visibles los
 * skeletons y los estados de carga; en Jest solo haría los tests más lentos.
 */
const withLatency = process.env.NODE_ENV !== 'test';

async function maybeDelay(): Promise<void> {
  if (withLatency) {
    await delay(300 + Math.floor(Math.random() * 300));
  }
}

export const authHandlers = [
  // El tercer genérico de `http.*` fija el tipo de cuerpo de respuesta: sin él,
  // TS infiere el de la primera rama y rechaza las demás.
  http.post<never, LoginRequest, ApiErrorBody | LoginResponse>(
    `${API_BASE_URL}/auth/login`,
    async ({request}) => {
      const {email, password} = await request.json();
      await maybeDelay();

      if (
        email.trim().toLowerCase() !== DEMO_USER.email ||
        password !== DEMO_PASSWORD
      ) {
        return HttpResponse.json<ApiErrorBody>(
          {message: 'Credenciales inválidas'},
          {status: 401},
        );
      }

      return HttpResponse.json<LoginResponse>({
        accessToken: ACCESS_TOKEN,
        user: DEMO_USER,
      });
    },
  ),
];
