import {API_BASE_URL} from '@/services/api/config';
import type {LoginResponse, Product, ProductsPage} from '@/services/api/types';

import {DEMO_PASSWORD, DEMO_USER} from '../db';

describe('handlers de auth', () => {
  it('devuelve token y usuario con credenciales válidas', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: DEMO_USER.email, password: DEMO_PASSWORD}),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as LoginResponse;
    expect(body.accessToken).toBe('demo-access-token');
    expect(body.user).toEqual(DEMO_USER);
  });

  it('devuelve 401 con credenciales inválidas', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: DEMO_USER.email, password: 'incorrecta'}),
    });
    expect(response.status).toBe(401);
  });

  it('GET /auth/me devuelve 401 sin Authorization', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`);
    expect(response.status).toBe(401);
  });

  it('GET /auth/me devuelve el usuario con un token válido', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {Authorization: 'Bearer demo-access-token'},
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEMO_USER);
  });
});

describe('handlers de productos', () => {
  it('devuelve una página de productos', async () => {
    const response = await fetch(`${API_BASE_URL}/products?limit=10`);
    expect(response.status).toBe(200);
    const page = (await response.json()) as ProductsPage;
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
  });

  it('respeta el filtro de categoría', async () => {
    const response = await fetch(
      `${API_BASE_URL}/products?category=audio&limit=50`,
    );
    const page = (await response.json()) as ProductsPage;
    expect(page.total).toBe(10);
  });

  it('devuelve un producto por id', async () => {
    const response = await fetch(`${API_BASE_URL}/products/p-001`);
    expect(response.status).toBe(200);
    const product = (await response.json()) as Product;
    expect(product.id).toBe('p-001');
  });

  it('devuelve 404 para un producto inexistente', async () => {
    const response = await fetch(`${API_BASE_URL}/products/no-existe`);
    expect(response.status).toBe(404);
  });

  it('inyecta un 500 con ?fail=1', async () => {
    const response = await fetch(`${API_BASE_URL}/products?fail=1`);
    expect(response.status).toBe(500);
  });
});
