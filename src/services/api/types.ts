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
  /** In cents, integer. See src/utils/formatPrice.ts. */
  priceCents: number;
  category: Category;
  rating: number;
  stock: number;
  imageUrl: string;
}

export interface ProductsPage {
  items: Product[];
  /** `null` when there are no more pages. */
  nextCursor: string | null;
  total: number;
}

/** Cache arguments for the products infiniteQuery. */
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
