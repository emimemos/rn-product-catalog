import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {PerformanceLabScreen} from '../screens/PerformanceLabScreen';

describe('PerformanceLabScreen', () => {
  it('starts with all rows at 1 render', () => {
    render(<PerformanceLabScreen />);
    expect(screen.getByTestId('lab-render-count-plain-0')).toHaveTextContent(
      '1',
    );
    expect(screen.getByTestId('lab-render-count-memo-0')).toHaveTextContent(
      '1',
    );
  });

  it('re-renders the unmemoized rows when typing, and not the memoized ones', () => {
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

  it('counts the parent renders', () => {
    render(<PerformanceLabScreen />);
    fireEvent.changeText(screen.getByTestId('lab-input'), 'a');
    expect(screen.getByTestId('lab-parent-renders')).toHaveTextContent('2');
  });
});
