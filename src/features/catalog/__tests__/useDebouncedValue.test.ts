import {act, renderHook} from '@testing-library/react-native';

import {useDebouncedValue} from '../hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value immediately', () => {
    const {result} = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('does not update before the delay has passed', () => {
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

  it('updates once the delay has elapsed', () => {
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

  it('collapses several rapid changes into a single update', () => {
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

  it('clears the timer on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    const {unmount} = renderHook(() => useDebouncedValue('a', 300));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
