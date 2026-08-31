import catalogReducer, {
  categoryChanged,
  queryChanged,
  sortChanged,
} from '../catalogSlice';
import type {CatalogState} from '../catalogSlice';

const initial: CatalogState = {query: '', category: 'all', sort: 'name'};

describe('catalogSlice', () => {
  it('tiene filtros vacíos por defecto', () => {
    expect(catalogReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('actualiza la query', () => {
    expect(catalogReducer(initial, queryChanged('nimbus')).query).toBe(
      'nimbus',
    );
  });

  it('actualiza la categoría', () => {
    expect(catalogReducer(initial, categoryChanged('audio')).category).toBe(
      'audio',
    );
  });

  it('actualiza el orden', () => {
    expect(catalogReducer(initial, sortChanged('price_desc')).sort).toBe(
      'price_desc',
    );
  });
});
