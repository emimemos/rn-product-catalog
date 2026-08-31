import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {Button} from '../Button';

describe('Button', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Sign in" onPress={onPress} />);
    fireEvent.press(screen.getByText('Sign in'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Sign in" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Sign in'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows an indicator and hides the label while loading', () => {
    render(
      <Button label="Sign in" onPress={jest.fn()} loading testID="submit" />,
    );
    expect(screen.queryByText('Sign in')).toBeNull();
    expect(screen.getByTestId('submit')).toBeDisabled();
  });
});
