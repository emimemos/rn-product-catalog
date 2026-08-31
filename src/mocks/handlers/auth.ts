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
 * Artificial latency only outside of tests: in the demo it makes skeletons
 * and loading states visible; in Jest it would only make tests slower.
 */
const withLatency = process.env.NODE_ENV !== 'test';

async function maybeDelay(): Promise<void> {
  if (withLatency) {
    await delay(300 + Math.floor(Math.random() * 300));
  }
}

export const authHandlers = [
  // The third generic of `http.*` fixes the response body type: without it,
  // TS infers it from the first branch and rejects the rest.
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
          {message: 'Invalid credentials'},
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
