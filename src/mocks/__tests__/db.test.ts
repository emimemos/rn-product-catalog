import {CATEGORIES} from '@/services/api/types';

import {findProduct, PRODUCTS, queryProducts} from '../db';

describe('PRODUCTS', () => {
  it('has 50 products', () => {
    expect(PRODUCTS).toHaveLength(50);
  });

  it('has unique ids', () => {
    const ids = new Set(PRODUCTS.map(p => p.id));
    expect(ids.size).toBe(PRODUCTS.length);
  });

  it('covers the 5 categories with 10 products each', () => {
    for (const category of CATEGORIES) {
      expect(PRODUCTS.filter(p => p.category === category)).toHaveLength(10);
    }
  });
});

describe('queryProducts', () => {
  it('returns the first page with the requested size', () => {
    const page = queryProducts({limit: 10});
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(50);
    expect(page.nextCursor).not.toBeNull();
  });

  it('paginates by cursor without repeating items', () => {
    const first = queryProducts({limit: 10});
    const second = queryProducts({limit: 10, cursor: first.nextCursor});
    const firstIds = first.items.map(p => p.id);
    const secondIds = second.items.map(p => p.id);
    expect(secondIds).toHaveLength(10);
    expect(firstIds.some(id => secondIds.includes(id))).toBe(false);
  });

  it('returns a null nextCursor on the last page', () => {
    const page = queryProducts({limit: 50});
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toBeNull();
  });

  it('filters by category', () => {
    const page = queryProducts({category: 'audio', limit: 50});
    expect(page.total).toBe(10);
    expect(page.items.every(p => p.category === 'audio')).toBe(true);
  });

  it('searches by name case-insensitively', () => {
    const page = queryProducts({q: 'nimbus', limit: 50});
    expect(page.total).toBeGreaterThan(0);
    expect(
      page.items.every(
        p => /nimbus/i.test(p.name) || /nimbus/i.test(p.description),
      ),
    ).toBe(true);
  });

  it('returns an empty page when there are no matches', () => {
    const page = queryProducts({q: 'zzzznoexiste', limit: 50});
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.nextCursor).toBeNull();
  });

  it('sorts by ascending price', () => {
    const {items} = queryProducts({sort: 'price_asc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('sorts by descending price', () => {
    const {items} = queryProducts({sort: 'price_desc', limit: 50});
    const prices = items.map(p => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it('sorts alphabetically by name by default', () => {
    const {items} = queryProducts({limit: 50});
    const names = items.map(p => p.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
  });

  it('combines search, filter, and sort', () => {
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
  it('finds a product by id', () => {
    const first = PRODUCTS[0];
    if (!first) {
      throw new Error('PRODUCTS[0] should exist');
    }
    expect(findProduct(first.id)).toEqual(first);
  });

  it('returns undefined for a nonexistent id', () => {
    expect(findProduct('no-existe')).toBeUndefined();
  });
});
