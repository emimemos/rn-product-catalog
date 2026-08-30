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
});
