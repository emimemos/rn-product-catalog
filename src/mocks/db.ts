import {PAGE_SIZE} from '@/services/api/config';
import {CATEGORIES} from '@/services/api/types';
import type {
  Category,
  Product,
  ProductsPage,
  SortOption,
  User,
} from '@/services/api/types';

const BASE_NAMES: Record<Category, string> = {
  audio: 'Headphones',
  wearables: 'Smartwatch',
  computers: 'Laptop',
  gaming: 'Gamepad',
  home: 'Lamp',
};

const VARIANTS = [
  'Nimbus',
  'Orbit',
  'Vertex',
  'Lumen',
  'Atlas',
  'Nova',
  'Quartz',
  'Ember',
  'Solstice',
  'Zephyr',
] as const;

/**
 * Deterministic dataset: same data on every run and on every machine, so that
 * tests don't depend on a random seed and the demo is reproducible.
 */
export const PRODUCTS: Product[] = CATEGORIES.flatMap(
  (category, categoryIndex) =>
    VARIANTS.map((variant, variantIndex) => {
      const index = categoryIndex * VARIANTS.length + variantIndex;
      return {
        id: `p-${String(index + 1).padStart(3, '0')}`,
        name: `${BASE_NAMES[category]} ${variant}`,
        description: `${
          BASE_NAMES[category]
        } ${variant} from the ${category} line, ${
          2020 + (variantIndex % 6)
        } edition.`,
        priceCents: 1999 + index * 1500,
        category,
        rating: Number((3 + ((index * 7) % 21) / 10).toFixed(1)),
        stock: (index * 13) % 40,
        imageUrl: `https://picsum.photos/seed/${index + 1}/400/400`,
      };
    }),
);

export const DEMO_USER: User = {
  id: 'u-1',
  email: 'demo@catalog.dev',
  name: 'Demo User',
};

export const DEMO_PASSWORD = 'password123';

export interface QueryProductsParams {
  q?: string;
  category?: Category | 'all';
  sort?: SortOption;
  cursor?: string | null;
  limit?: number;
}

function compare(sort: SortOption): (a: Product, b: Product) => number {
  switch (sort) {
    case 'price_asc':
      return (a, b) => a.priceCents - b.priceCents;
    case 'price_desc':
      return (a, b) => b.priceCents - a.priceCents;
    case 'name':
      return (a, b) => a.name.localeCompare(b.name, 'en');
  }
}

/**
 * Cursor-based pagination (the id of the last item returned) instead of
 * offset-based: that's what a real backend does, and it avoids skips when the
 * dataset changes between pages. If the cursor isn't found, we start from the
 * beginning.
 */
export function queryProducts(params: QueryProductsParams = {}): ProductsPage {
  const {
    q = '',
    category = 'all',
    sort = 'name',
    cursor = null,
    limit = PAGE_SIZE,
  } = params;

  const needle = q.trim().toLowerCase();
  const matching = PRODUCTS.filter(product => {
    const matchesCategory = category === 'all' || product.category === category;
    const matchesQuery =
      needle === '' ||
      product.name.toLowerCase().includes(needle) ||
      product.description.toLowerCase().includes(needle);
    return matchesCategory && matchesQuery;
  }).sort(compare(sort));

  const start =
    cursor === null
      ? 0
      : Math.max(matching.findIndex(p => p.id === cursor) + 1, 0);
  const items = matching.slice(start, start + limit);
  const last = items[items.length - 1];
  const hasMore = start + items.length < matching.length;

  return {
    items,
    nextCursor: hasMore && last ? last.id : null,
    total: matching.length,
  };
}

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find(product => product.id === id);
}
