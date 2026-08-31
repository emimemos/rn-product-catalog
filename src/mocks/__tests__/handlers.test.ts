import {API_BASE_URL} from '@/services/api/config';
import type {LoginResponse, Product, ProductsPage} from '@/services/api/types';

import {DEMO_PASSWORD, DEMO_USER} from '../db';

describe('auth handlers', () => {
  it('returns token and user with valid credentials', async () => {
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

  it('returns 401 with invalid credentials', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: DEMO_USER.email, password: 'incorrecta'}),
    });
    expect(response.status).toBe(401);
  });
});

describe('product handlers', () => {
  it('returns a page of products', async () => {
    const response = await fetch(`${API_BASE_URL}/products?limit=10`);
    expect(response.status).toBe(200);
    const page = (await response.json()) as ProductsPage;
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
  });

  it('respects the category filter', async () => {
    const response = await fetch(
      `${API_BASE_URL}/products?category=audio&limit=50`,
    );
    const page = (await response.json()) as ProductsPage;
    expect(page.total).toBe(10);
  });

  it('returns a product by id', async () => {
    const response = await fetch(`${API_BASE_URL}/products/p-001`);
    expect(response.status).toBe(200);
    const product = (await response.json()) as Product;
    expect(product.id).toBe('p-001');
  });

  it('returns 404 for a nonexistent product', async () => {
    const response = await fetch(`${API_BASE_URL}/products/no-existe`);
    expect(response.status).toBe(404);
  });

  it('injects a 500 with ?fail=1', async () => {
    const response = await fetch(`${API_BASE_URL}/products?fail=1`);
    expect(response.status).toBe(500);
  });
});
