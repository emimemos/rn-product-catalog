import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import type {Category, SortOption} from '@/services/api/types';

/**
 * Client-only state. Products are server state and live in RTK Query's
 * cache: duplicating them here would mean having two sources of truth.
 */
export interface CatalogState {
  query: string;
  category: Category | 'all';
  sort: SortOption;
}

const initialState: CatalogState = {
  query: '',
  category: 'all',
  sort: 'name',
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    queryChanged(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    categoryChanged(state, action: PayloadAction<Category | 'all'>) {
      state.category = action.payload;
    },
    sortChanged(state, action: PayloadAction<SortOption>) {
      state.sort = action.payload;
    },
  },
});

export const {categoryChanged, queryChanged, sortChanged} =
  catalogSlice.actions;
export default catalogSlice.reducer;
