import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {SearchBar} from '../components/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('no despacha la query antes del debounce', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(store.getState().catalog.query).toBe('');
  });

  it('despacha la query una vez cumplido el debounce', () => {
    const {store} = renderWithProviders(<SearchBar />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'nimbus');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(store.getState().catalog.query).toBe('nimbus');
  });

  it('refleja el texto tipeado de inmediato en el input', () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByTestId('search-input');
    fireEvent.changeText(input, 'nimbus');
    expect(input.props.value).toBe('nimbus');
  });
});
