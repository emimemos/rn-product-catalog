import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {SearchBar} from '../components/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not dispatch the query before the debounce', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(store.getState().catalog.query).toBe('');
  });

  it('dispatches the query once the debounce has elapsed', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(store.getState().catalog.query).toBe('nimbus');
  });

  it('reflects the typed text immediately in the input', () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByTestId('search-input');
    fireEvent.changeText(input, 'nimbus');
    expect(input.props.value).toBe('nimbus');
  });
});
