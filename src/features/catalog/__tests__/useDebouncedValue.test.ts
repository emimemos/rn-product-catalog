import {act, renderHook} from '@testing-library/react-native';

import {useDebouncedValue} from '../hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('devuelve el valor inicial de inmediato', () => {
    const {result} = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('no actualiza antes de que pase el delay', () => {
    const {rerender, result} = renderHook(
      ({value}: {value: string}) => useDebouncedValue(value, 300),
      {initialProps: {value: 'a'}},
    );
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
  });

  it('actualiza una vez cumplido el delay', () => {
    const {rerender, result} = renderHook(
      ({value}: {value: string}) => useDebouncedValue(value, 300),
      {initialProps: {value: 'a'}},
    );
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('colapsa varios cambios rápidos en una sola actualización', () => {
    const {rerender, result} = renderHook(
      ({value}: {value: string}) => useDebouncedValue(value, 300),
      {initialProps: {value: 'a'}},
    );
    rerender({value: 'b'});
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({value: 'c'});
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({value: 'd'});
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('d');
  });

  it('limpia el timer al desmontarse', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    const {unmount} = renderHook(() => useDebouncedValue('a', 300));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
