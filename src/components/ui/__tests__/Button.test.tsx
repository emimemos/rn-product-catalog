import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {Button} from '../Button';

describe('Button', () => {
  it('llama a onPress al tocarlo', () => {
    const onPress = jest.fn();
    render(<Button label="Ingresar" onPress={onPress} />);
    fireEvent.press(screen.getByText('Ingresar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama a onPress cuando está deshabilitado', () => {
    const onPress = jest.fn();
    render(<Button label="Ingresar" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Ingresar'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('muestra un indicador y oculta el label mientras carga', () => {
    render(
      <Button label="Ingresar" onPress={jest.fn()} loading testID="submit" />,
    );
    expect(screen.queryByText('Ingresar')).toBeNull();
    expect(screen.getByTestId('submit')).toBeDisabled();
  });
});
