import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import type {Category, SortOption} from '@/services/api/types';

/**
 * Solo estado de cliente. Los productos son estado de servidor y viven en el
 * cache de RTK Query: duplicarlos acá sería tener dos fuentes de verdad.
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
