import {formatPrice} from '../formatPrice';

describe('formatPrice', () => {
  it('formatea centavos como dólares con dos decimales', () => {
    expect(formatPrice(1999)).toBe('$19.99');
  });

  it('rellena los centavos con cero a la izquierda', () => {
    expect(formatPrice(1905)).toBe('$19.05');
  });

  it('formatea un precio exacto sin centavos', () => {
    expect(formatPrice(2000)).toBe('$20.00');
  });

  it('formatea cero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('agrega separador de miles', () => {
    expect(formatPrice(123456)).toBe('$1,234.56');
  });

  // `Math.trunc(-50 / 100)` es `-0`, que se imprime como `0`: sin separar el
  // signo, un importe negativo menor a un dólar salía idéntico al positivo.
  it('conserva el signo de un importe negativo menor a un dólar', () => {
    expect(formatPrice(-50)).toBe('-$0.50');
  });

  it('conserva el signo de un importe negativo mayor a un dólar', () => {
    expect(formatPrice(-123456)).toBe('-$1,234.56');
  });
});
