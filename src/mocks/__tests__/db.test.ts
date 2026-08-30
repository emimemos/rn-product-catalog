import {CATEGORIES} from '@/services/api/types';

import {findProduct, PRODUCTS, queryProducts} from '../db';

describe('PRODUCTS', () => {
  it('tiene 50 productos', () => {
    expect(PRODUCTS).toHaveLength(50);
  });

  it('tiene ids únicos', () => {
    const ids = new Set(PRODUCTS.map(p => p.id));
    expect(ids.size).toBe(PRODUCTS.length);
  });

  it('cubre las 5 categorías con 10 productos cada una', () => {
    for (const category of CATEGORIES) {
      expect(PRODUCTS.filter(p => p.category === category)).toHaveLength(10);
    }
  });
});

describe('queryProducts', () => {
  it('devuelve la primera página con el tamaño pedido', () => {
    const page = queryProducts({limit: 10});
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
    expect(page.nextCursor).not.toBeNull();
  });

  it('pagina por cursor sin repetir elementos', () => {
    const first = queryProducts({limit: 10});
    const second = queryProducts({limit: 10, cursor: first.nextCursor});
    const firstIds = first.items.map(p => p.id);
    const secondIds = second.items.map(p => p.id);
    expect(secondIds).toHaveLength(10);
    expect(firstIds.some(id => secondIds.includes(id))).toBe(false);
  });

  it('devuelve nextCursor null en la última página', () => {
    const page = queryProducts({limit: 50});
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toBeNull();
  });

  it('filtra por categoría', () => {
    const page = queryProducts({category: 'audio', limit: 50});
    expect(page.total).toBe(10);
    expect(page.items.every(p => p.category === 'audio')).toBe(true);
  });

  it('busca por nombre sin distinguir mayúsculas', () => {
    const page = queryProducts({q: 'nimbus', limit: 50});
    expect(page.total).toBeGreaterThan(0);
    expect(
      page.items.every(
        p => /nimbus/i.test(p.name) || /nimbus/i.test(p.description),
      ),
    ).toBe(true);
  });

  it('devuelve una página vacía cuando no hay coincidencias', () => {
    const page = queryProducts({q: 'zzzznoexiste', limit: 50});
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.nextCursor).toBeNull();
  });

  it('ordena por precio ascendente', () => {
    const {items} = queryProducts({sort: 'price_asc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('ordena por precio descendente', () => {
    const {items} = queryProducts({sort: 'price_desc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it('ordena por nombre alfabéticamente por defecto', () => {
    const {items} = queryProducts({limit: 50});
    const names = items.map(p => p.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(names);
  });

  it('combina búsqueda, filtro y orden', () => {
    const page = queryProducts({
      q: 'a',
      category: 'gaming',
      sort: 'price_desc',
      limit: 50,
    });
    expect(page.items.every(p => p.category === 'gaming')).toBe(true);
    const prices = page.items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });
});

describe('findProduct', () => {
  it('encuentra un producto por id', () => {
    const first = PRODUCTS[0];
    if (!first) {
      throw new Error('PRODUCTS[0] debería existir');
    }
    expect(findProduct(first.id)).toEqual(first);
  });

  it('devuelve undefined para un id inexistente', () => {
    expect(findProduct('no-existe')).toBeUndefined();
  });
});
