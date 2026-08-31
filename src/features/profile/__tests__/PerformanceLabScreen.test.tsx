import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {PerformanceLabScreen} from '../screens/PerformanceLabScreen';

describe('PerformanceLabScreen', () => {
  it('arranca con todas las filas en 1 render', () => {
    render(<PerformanceLabScreen />);
    expect(screen.getByTestId('lab-render-count-plain-0')).toHaveTextContent(
      '1',
    );
    expect(screen.getByTestId('lab-render-count-memo-0')).toHaveTextContent(
      '1',
    );
  });

  it('re-renderiza las filas sin memoizar al tipear, y no las memoizadas', () => {
    render(<PerformanceLabScreen />);
    fireEvent.changeText(screen.getByTestId('lab-input'), 'a');
    fireEvent.changeText(screen.getByTestId('lab-input'), 'ab');

    expect(screen.getByTestId('lab-render-count-plain-0')).toHaveTextContent(
      '3',
    );
    expect(screen.getByTestId('lab-render-count-memo-0')).toHaveTextContent(
      '1',
    );
  });

  it('cuenta los renders del padre', () => {
    render(<PerformanceLabScreen />);
    fireEvent.changeText(screen.getByTestId('lab-input'), 'a');
    expect(screen.getByTestId('lab-parent-renders')).toHaveTextContent('2');
  });
});
