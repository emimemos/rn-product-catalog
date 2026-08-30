export const CATEGORIES = [
  'audio',
  'wearables',
  'computers',
  'gaming',
  'home',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SortOption = 'name' | 'price_asc' | 'price_desc';

export interface Product {
  id: string;
  name: string;
  description: string;
  /** En centavos, entero. Ver src/utils/formatPrice.ts. */
  priceCents: number;
  category: Category;
  rating: number;
  stock: number;
  imageUrl: string;
}

export interface ProductsPage {
  items: Product[];
  /** `null` cuando no hay más páginas. */
  nextCursor: string | null;
  total: number;
}

/** Argumentos de cache de la infiniteQuery de productos. */
export interface ProductsQueryArgs {
  q: string;
  category: Category | 'all';
  sort: SortOption;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ApiErrorBody {
  message: string;
}
