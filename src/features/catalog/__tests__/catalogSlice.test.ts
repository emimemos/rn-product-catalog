import catalogReducer, {
  categoryChanged,
  queryChanged,
  sortChanged,
} from '../catalogSlice';
import type {CatalogState} from '../catalogSlice';

const initial: CatalogState = {query: '', category: 'all', sort: 'name'};

describe('catalogSlice', () => {
  it('has empty filters by default', () => {
    expect(catalogReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('updates the query', () => {
    expect(catalogReducer(initial, queryChanged('nimbus')).query).toBe(
      'nimbus',
    );
  });

  it('updates the category', () => {
    expect(catalogReducer(initial, categoryChanged('audio')).category).toBe(
      'audio',
    );
  });

  it('updates the sort', () => {
    expect(catalogReducer(initial, sortChanged('price_desc')).sort).toBe(
      'price_desc',
    );
  });
});
